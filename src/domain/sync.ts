export const VERSAO_PACOTE = 1;

export const CONFIG_SINCRONIZADA = ['nome', 'valorHoraCentavos', 'margemPct'];

interface ComData {
  id: string;
  atualizadoEm: number;
}

export interface ConfigItem {
  chave: string;
  valor: unknown;
  atualizadoEm?: number;
}

export interface Pacote<P extends ComData = ComData, S extends ComData = ComData, N extends ComData = ComData> {
  app: 'crochezinho';
  versao: number;
  geradoEm: number;
  projetos: P[];
  sessoes: S[];
  novelos: N[];
  config: ConfigItem[];
}

export interface ResultadoTabela<T> {
  resultado: T[];
  paraLocal: T[];
  remotoMudou: boolean;
}

export function mesclarTabela<T>(local: T[], remoto: T[], chave: (x: T) => string, data: (x: T) => number): ResultadoTabela<T> {
  const mapa = new Map<string, T>();
  for (const r of remoto) mapa.set(chave(r), r);
  const paraLocal: T[] = [];
  let remotoMudou = false;
  const vistos = new Set<string>();

  for (const l of local) {
    const k = chave(l);
    vistos.add(k);
    const r = mapa.get(k);
    if (!r || data(l) > data(r)) {
      mapa.set(k, l);
      remotoMudou = true;
    } else if (data(r) > data(l)) {
      paraLocal.push(r);
    }
  }
  for (const r of remoto) if (!vistos.has(chave(r))) paraLocal.push(r);

  return { resultado: [...mapa.values()], paraLocal, remotoMudou };
}

export interface ResultadoMescla<P extends ComData, S extends ComData, N extends ComData> {
  pacote: Pacote<P, S, N>;
  paraLocal: { projetos: P[]; sessoes: S[]; novelos: N[]; config: ConfigItem[] };
  remotoMudou: boolean;
}

export function mesclarPacotes<P extends ComData, S extends ComData, N extends ComData>(
  local: Pacote<P, S, N>,
  remoto: Pacote<P, S, N> | null,
  agora: number
): ResultadoMescla<P, S, N> {
  const r = remoto ?? { ...local, projetos: [], sessoes: [], novelos: [], config: [] };
  const porId = (x: ComData) => x.id;
  const porData = (x: ComData) => x.atualizadoEm ?? 0;
  const projetos = mesclarTabela(local.projetos, r.projetos, porId, porData);
  const sessoes = mesclarTabela(local.sessoes, r.sessoes, porId, porData);
  const novelos = mesclarTabela(local.novelos, r.novelos, porId, porData);
  const config = mesclarTabela(
    local.config.filter((c) => CONFIG_SINCRONIZADA.includes(c.chave)),
    r.config.filter((c) => CONFIG_SINCRONIZADA.includes(c.chave)),
    (c) => c.chave,
    (c) => c.atualizadoEm ?? 0
  );
  return {
    pacote: {
      app: 'crochezinho',
      versao: VERSAO_PACOTE,
      geradoEm: agora,
      projetos: projetos.resultado,
      sessoes: sessoes.resultado,
      novelos: novelos.resultado,
      config: config.resultado
    },
    paraLocal: { projetos: projetos.paraLocal, sessoes: sessoes.paraLocal, novelos: novelos.paraLocal, config: config.paraLocal },
    remotoMudou: !remoto || projetos.remotoMudou || sessoes.remotoMudou || novelos.remotoMudou || config.remotoMudou
  };
}

export function validarPacote(obj: unknown): Pacote {
  const p = obj as Partial<Pacote> | null;
  if (!p || typeof p !== 'object' || p.app !== 'crochezinho') throw new Error('Este arquivo não é um backup do Crochezinho.');
  if (typeof p.versao !== 'number' || p.versao > VERSAO_PACOTE) throw new Error('Backup de uma versão mais nova do app. Atualize o app e tente de novo.');
  for (const t of ['projetos', 'sessoes', 'novelos', 'config'] as const) {
    if (!Array.isArray(p[t])) throw new Error('Backup incompleto ou corrompido.');
  }
  for (const t of ['projetos', 'sessoes', 'novelos'] as const) {
    for (const r of p[t]!) {
      if (!r || typeof r.id !== 'string' || typeof r.atualizadoEm !== 'number') throw new Error('Backup incompleto ou corrompido.');
    }
  }
  return p as Pacote;
}

export function textoParaBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function base64ParaTexto(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
