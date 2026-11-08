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
  return o as T;
}

export function normalizarProjeto<T>(p: T): T {
  const o = { ...(p as Solto) };
  const q = Number(o.quantidade);
  o.quantidade = Number.isFinite(q) && q >= 1 ? Math.floor(q) : 1;
  return o as T;
}
