import { CONFIG_SINCRONIZADA, VERSAO_PACOTE, mesclarPacotes, validarPacote, type Pacote } from '../domain/sync.ts';
import { db } from './db.ts';
import { ErroGitHub, gravarRemoto, lerRemoto, type ConexaoGitHub } from './github.ts';
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
    config: config.filter((c) => CONFIG_SINCRONIZADA.includes(c.chave))
  };
}

async function mesclarComLocal(remoto: PacoteApp | null) {
  const local = await montarPacote();
  const m = mesclarPacotes(local, remoto, Date.now());
  const { projetos, sessoes, novelos, config } = m.paraLocal;
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
    const { pacote: remoto, sha } = await lerRemoto(conexao);
    const m = await mesclarComLocal(remoto as PacoteApp | null);
    if (m.remotoMudou) await gravarRemoto(conexao, m.pacote, sha, nomeDoAparelho());
    await salvarConfig(CHAVES_SYNC.ultimoEm, Date.now());
    await apagarConfig(CHAVES_SYNC.erro);
    const p = m.paraLocal;
    return { ok: true, recebidos: p.projetos.length + p.sessoes.length + p.novelos.length + p.config.length, enviou: m.remotoMudou };
  } catch (e) {
    if (e instanceof ErroGitHub && e.status === 409 && tentativa < 3) return executar(tentativa + 1);
    const erro = e instanceof Error ? e.message : 'Erro desconhecido ao sincronizar.';
    await salvarConfig(CHAVES_SYNC.erro, erro);
    return { ok: false, erro };
  }
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
    throw new Error(e instanceof SyntaxError ? 'Este arquivo não é um backup do Crochezinho.' : (e as Error).message);
  }
  const m = await mesclarComLocal(pacote as PacoteApp);
  return { projetos: m.paraLocal.projetos.length, novelos: m.paraLocal.novelos.length };
}
