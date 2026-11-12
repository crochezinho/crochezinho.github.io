import { PREFIXO_EMBALAGEM } from './sync.ts';

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function chaveEmbalagem(tipo: string): string {
  return PREFIXO_EMBALAGEM + semAcento(tipo.trim()).replace(/\s+/g, ' ');
}

export type PesosEmbalagem = Map<string, number>;

export function lerPesos(config: { chave: string; valor: unknown }[]): PesosEmbalagem {
  const pesos: PesosEmbalagem = new Map();
  for (const c of config) {
    if (c.chave.startsWith(PREFIXO_EMBALAGEM) && typeof c.valor === 'number' && c.valor > 0) pesos.set(c.chave, c.valor);
  }
  return pesos;
}

export function pesoDaEmbalagem(pesos: PesosEmbalagem, tipo: string): number {
  return tipo.trim() ? (pesos.get(chaveEmbalagem(tipo)) ?? 0) : 0;
}

export function descontarEmbalagem(pesado: number, novelos: number, embalagemG: number): number {
  return Math.max(0, Math.round(pesado - Math.max(0, novelos) * Math.max(0, embalagemG)));
}

export const numeroG = (g: number) => g.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export function contaDaEmbalagem(pesado: number, novelos: number, embalagemG: number): string {
  const emb = novelos === 1 ? `${numeroG(embalagemG)} g` : `${novelos} × ${numeroG(embalagemG)} g`;
  return `${numeroG(pesado)} g − ${emb}`;
}

export function tiposDosNovelos(novelos: { tipo: string }[]): { tipo: string; chave: string }[] {
  const contagem = new Map<string, Map<string, number>>();
  for (const n of novelos) {
    const tipo = n.tipo.trim();
    if (!tipo) continue;
    const chave = chaveEmbalagem(tipo);
    const grafias = contagem.get(chave) ?? new Map<string, number>();
    grafias.set(tipo, (grafias.get(tipo) ?? 0) + 1);
    contagem.set(chave, grafias);
  }
  return [...contagem.entries()]
    .map(([chave, grafias]) => ({ chave, tipo: [...grafias.entries()].sort((a, b) => b[1] - a[1])[0][0] }))
    .sort((a, b) => a.tipo.localeCompare(b.tipo, 'pt-BR', { sensitivity: 'base' }));
}
