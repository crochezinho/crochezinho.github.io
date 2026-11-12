import { somaUnidades, unidadesDoEstoque, type Unidade } from './unidades.ts';

const TEXTURAS = ['liso', 'brilho', 'felpudo'];

const idsDaMigracao = (noveloId: string) => {
  let n = 0;
  return () => `${noveloId}-u${++n}`;
};

const unidadeValida = (u: unknown): u is Unidade => {
  const x = u as Unidade;
  return !!x && typeof x.id === 'string' && typeof x.numero === 'number' && typeof x.pesoG === 'number';
};

type Solto = Record<string, unknown>;

export function normalizarNovelo<T>(n: T): T {
  const o = { ...(n as Solto) };
  if (typeof o.tipo !== 'string') o.tipo = typeof o.linha === 'string' ? o.linha : '';
  if (!TEXTURAS.includes(o.textura as string)) o.textura = 'liso';
  delete o.linha;
  delete o.familia;
  delete o.fibra;
  delete o.metros;
  if (typeof o.fotoId !== 'string') o.fotoId = null;
  if (Array.isArray(o.unidades)) {
    o.unidades = (o.unidades as unknown[]).filter(unidadeValida).map((u) => ({ ...u, fechado: !!u.fechado }));
  } else {
    o.unidades = unidadesDoEstoque(Number(o.estoqueG) || 0, Number(o.gramatura) || 0, idsDaMigracao(String(o.id)));
  }
  o.estoqueG = somaUnidades(o.unidades as Unidade[]);
  return o as T;
}

export function normalizarProjeto<T>(p: T): T {
  const o = { ...(p as Solto) };
  if (typeof o.cliente !== 'string') o.cliente = '';
  if (typeof o.anotacoes !== 'string') o.anotacoes = '';
  if (typeof o.receitaUrl !== 'string') o.receitaUrl = '';
  if (typeof o.entregaEm !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.entregaEm)) o.entregaEm = null;
  if (typeof o.entregueEm !== 'number') o.entregueEm = null;
  if (typeof o.fotoId !== 'string') o.fotoId = null;
  const q = Number(o.quantidade);
  o.quantidade = Number.isFinite(q) && q >= 1 ? Math.floor(q) : 1;
  return o as T;
}
