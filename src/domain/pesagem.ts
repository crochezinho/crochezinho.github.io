import { PREFIXO_EMBALAGEM } from './sync.ts';
import { novaUnidade, type Unidade } from './unidades.ts';

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

export interface Pesagens {
  fechados: number;
  abertos: (number | null)[];
}

export const PESAGENS_VAZIAS: Pesagens = { fechados: 0, abertos: [] };

const pesados = (p: Pesagens) => p.abertos.filter((g): g is number => typeof g === 'number' && g > 0);
const qtdFechados = (p: Pesagens) => Math.max(0, Math.floor(p.fechados));

export function estoqueDasPesagens(p: Pesagens, gramatura: number, embalagemG: number): number {
  const abertos = pesados(p).reduce((s, g) => s + descontarEmbalagem(g, 1, embalagemG), 0);
  return abertos + qtdFechados(p) * Math.max(0, gramatura);
}

export function unidadesDasPesagens(p: Pesagens, gramatura: number, embalagemG: number, novoId: () => string): Unidade[] {
  let us: Unidade[] = [];
  for (let i = 0; i < qtdFechados(p); i++) us = novaUnidade(us, gramatura, true, novoId());
  for (const g of pesados(p)) {
    const liquido = descontarEmbalagem(g, 1, embalagemG);
    if (liquido > 0) us = novaUnidade(us, liquido, false, novoId());
  }
  return us;
}

export const novelosDasPesagens = (p: Pesagens) => qtdFechados(p) + pesados(p).length;

export function contaDasPesagens(p: Pesagens, gramatura: number, embalagemG: number): string {
  const partes: string[] = [];
  const f = qtdFechados(p);
  if (f) partes.push(`${f} ${f === 1 ? 'fechado' : 'fechados'} × ${numeroG(gramatura)} g`);
  const ps = pesados(p);
  if (ps.length) {
    const soma = ps.reduce((s, g) => s + g, 0);
    partes.push(embalagemG > 0 ? contaDaEmbalagem(soma, ps.length, embalagemG) : `${numeroG(soma)} g`);
  }
  return partes.join(' + ');
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
