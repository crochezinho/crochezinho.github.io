export interface ItemDesconto {
  noveloId: string;
  gramas: number;
  antes: number;
  depois: number;
  faltou: number;
}

export function calcularDesconto(
  fios: { noveloId: string; gramas: number }[],
  estoque: { id: string; estoqueG: number }[]
): ItemDesconto[] {
  const porNovelo = new Map<string, number>();
  for (const f of fios) {
    if (f.gramas > 0) porNovelo.set(f.noveloId, (porNovelo.get(f.noveloId) ?? 0) + f.gramas);
  }
  const itens: ItemDesconto[] = [];
  for (const [noveloId, gramas] of porNovelo) {
    const n = estoque.find((e) => e.id === noveloId);
    if (!n) continue;
    const antes = Math.max(0, n.estoqueG);
    const depois = Math.max(0, antes - gramas);
    itens.push({ noveloId, gramas, antes, depois, faltou: Math.max(0, gramas - antes) });
  }
  return itens;
}

export function formatarEstoque(estoqueG: number, gramatura: number): string {
  const g = Math.max(0, Math.round(estoqueG));
  if (g === 0) return 'sem estoque';
  if (gramatura <= 0) return `${g} g`;
  const inteiros = Math.floor(g / gramatura);
  const resto = g - inteiros * gramatura;
  const n = inteiros === 1 ? '1 novelo' : `${inteiros} novelos`;
  if (inteiros === 0) return `${resto} g`;
  return resto ? `${n} + ${resto} g` : n;
}
