const TEXTURAS = ['liso', 'brilho', 'felpudo'];

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
