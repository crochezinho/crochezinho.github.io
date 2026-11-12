import { VERSAO_PACOTE, ehConfigSincronizada, mesclarPacotes, validarPacote, type Pacote } from '../domain/sync.ts';
import { normalizarNovelo, normalizarProjeto } from '../domain/migracao.ts';
import { db, novoId } from './db.ts';
import { ErroGitHub, baixarFoto, enviarFoto, gravarRemoto, lerRemoto, type ConexaoGitHub } from './github.ts';
import { lerConfig, salvarConfig, apagarConfig } from './repo.ts';
import type { Novelo, Projeto, Sessao } from './types.ts';

type PacoteApp = Pacote<Projeto, Sessao, Novelo>;

export const CHAVES_SYNC = {
  conexao: 'sync.conexao',
  ultimoEm: 'sync.ultimoEm',
  erro: 'sync.erro',
  backupEm: 'backup.ultimoEm'
};

export async function montarPacote(): Promise<PacoteApp> {
  const [projetos, sessoes, novelos, config] = await Promise.all([db.projetos.toArray(), db.sessoes.toArray(), db.novelos.toArray(), db.config.toArray()]);
  return {
    app: 'crochezinho',
    versao: VERSAO_PACOTE,
    geradoEm: Date.now(),
    projetos,
    sessoes,
    novelos,
    config: config.filter((c) => ehConfigSincronizada(c.chave))
  };
}

async function mesclarComLocal(remoto: PacoteApp | null) {
  const local = await montarPacote();
  const m = mesclarPacotes(local, remoto, Date.now());
  const { sessoes, config } = m.paraLocal;
  const projetos = m.paraLocal.projetos.map(normalizarProjeto);
  const novelos = m.paraLocal.novelos.map(normalizarNovelo);
  if (projetos.length || sessoes.length || novelos.length || config.length) {
    await db.transaction('rw', db.projetos, db.sessoes, db.novelos, db.config, async () => {
      await db.projetos.bulkPut(projetos);
      await db.sessoes.bulkPut(sessoes);
      await db.novelos.bulkPut(novelos);
      await db.config.bulkPut(config);
    });
  }
  return m;
}

export async function lerConexao(): Promise<ConexaoGitHub | null> {
  return lerConfig<ConexaoGitHub | null>(CHAVES_SYNC.conexao, null);
}

export async function salvarConexao(c: ConexaoGitHub | null): Promise<void> {
  if (c) await salvarConfig(CHAVES_SYNC.conexao, c);
  else {
    await apagarConfig(CHAVES_SYNC.conexao);
    await apagarConfig(CHAVES_SYNC.ultimoEm);
    await apagarConfig(CHAVES_SYNC.erro);
  }
}

const nomeDoAparelho = () => {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  return 'computador';
};

let emAndamento: Promise<ResultadoSync> | null = null;

export type ResultadoSync = { ok: true; recebidos: number; enviou: boolean } | { ok: false; erro: string } | { ok: 'sem-conexao' };

export function sincronizar(): Promise<ResultadoSync> {
  emAndamento ??= executar().finally(() => (emAndamento = null));
  return emAndamento;
}

async function executar(tentativa = 1): Promise<ResultadoSync> {
  const conexao = await lerConexao();
  if (!conexao) return { ok: 'sem-conexao' };
  try {
    await enviarFotosPendentes(conexao);
    const { pacote: remoto, sha } = await lerRemoto(conexao);
    const m = await mesclarComLocal(remoto as PacoteApp | null);
    if (m.remotoMudou) await gravarRemoto(conexao, m.pacote, sha, nomeDoAparelho());
    await salvarConfig(CHAVES_SYNC.ultimoEm, Date.now());
    await apagarConfig(CHAVES_SYNC.erro);
    await limparFotosOrfas().catch(() => 0);
    const p = m.paraLocal;
    return { ok: true, recebidos: p.projetos.length + p.sessoes.length + p.novelos.length + p.config.length, enviou: m.remotoMudou };
  } catch (e) {
    if (e instanceof ErroGitHub && e.status === 409 && tentativa < 3) return executar(tentativa + 1);
    const erro = e instanceof Error ? e.message : 'Erro desconhecido ao sincronizar.';
    await salvarConfig(CHAVES_SYNC.erro, erro);
    return { ok: false, erro };
  }
}

async function fotosEmUso(): Promise<Set<string>> {
  const [projetos, novelos] = await Promise.all([db.projetos.toArray(), db.novelos.toArray()]);
  const ids = new Set<string>();
  for (const r of [...projetos, ...novelos]) if (!r.excluidoEm && r.fotoId) ids.add(r.fotoId);
  return ids;
}

async function enviarFotosPendentes(conexao: ConexaoGitHub): Promise<void> {
  const emUso = await fotosEmUso();
  const pendentes = (await db.fotos.toArray()).filter((f) => !f.enviada && emUso.has(f.id));
  for (const f of pendentes) {
    await enviarFoto(conexao, f.id, f.blob, nomeDoAparelho());
    await db.fotos.update(f.id, { enviada: true });
  }
}

const DIA = 86_400_000;

export async function limparFotosOrfas(agora = Date.now()): Promise<number> {
  const emUso = await fotosEmUso();
  const [projetos, novelos] = await Promise.all([db.projetos.toArray(), db.novelos.toArray()]);
  const citadas = new Set([...projetos, ...novelos].map((r) => r.fotoId).filter((id): id is string => !!id));
  const orfas = (await db.fotos.toArray()).filter((f) => !emUso.has(f.id) && (f.enviada || (!citadas.has(f.id) && agora - f.criadoEm > DIA)));
  await db.fotos.bulkDelete(orfas.map((f) => f.id));
  return orfas.length;
}

export async function guardarFoto(blob: Blob): Promise<string> {
  const id = novoId();
  await db.fotos.add({ id, blob, criadoEm: Date.now(), enviada: false });
  return id;
}

export async function obterFoto(id: string): Promise<Blob | null> {
  const local = await db.fotos.get(id);
  if (local) return local.blob;
  const conexao = await lerConexao();
  if (!conexao) return null;
  const blob = await baixarFoto(conexao, id);
  if (blob) await db.fotos.put({ id, blob, criadoEm: Date.now(), enviada: true });
  return blob;
}

export async function exportarBackup(): Promise<void> {
  const pacote = await montarPacote();
  const blob = new Blob([JSON.stringify(pacote, null, 1)], { type: 'application/json' });
  const data = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crochezinho-backup-${data}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  await salvarConfig(CHAVES_SYNC.backupEm, Date.now());
}

export async function importarBackup(arquivo: File): Promise<{ projetos: number; novelos: number }> {
  let pacote: Pacote;
  try {
    pacote = validarPacote(JSON.parse(await arquivo.text()));
  } catch (e) {
    throw new Error(e instanceof SyntaxError ? 'Este arquivo não é um backup do Crochêzinho.' : (e as Error).message);
  }
  const m = await mesclarComLocal(pacote as PacoteApp);
  return { projetos: m.paraLocal.projetos.length, novelos: m.paraLocal.novelos.length };
}
