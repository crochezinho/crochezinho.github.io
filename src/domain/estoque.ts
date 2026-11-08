export interface ItemDesconto {
  noveloId: string;
  gramas: number;
  antes: number;
  depois: number;
  faltou: number;
}

export function calcularDesconto(
  fios: { noveloId: string | null; gramas: number }[],
  estoque: { id: string; estoqueG: number }[],
  quantidade = 1
): ItemDesconto[] {
  const q = Math.max(1, Math.floor(quantidade) || 1);
  const porNovelo = new Map<string, number>();
  for (const f of fios) {
    if (f.noveloId && f.gramas > 0) porNovelo.set(f.noveloId, (porNovelo.get(f.noveloId) ?? 0) + f.gramas * q);
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

export interface ItemNecessario {
  noveloId: string;
  precisa: number;
  tem: number;
  falta: number;
  novelosAComprar: number;
}

export function conferirEstoque(
  fios: { noveloId: string | null; gramas: number }[],
  estoque: { id: string; estoqueG: number; gramatura: number }[],
  quantidade = 1
): ItemNecessario[] {
  return calcularDesconto(fios, estoque, quantidade).map((d) => {
    const g = estoque.find((n) => n.id === d.noveloId)!.gramatura;
    return { noveloId: d.noveloId, precisa: d.gramas, tem: d.antes, falta: d.faltou, novelosAComprar: d.faltou > 0 && g > 0 ? Math.ceil(d.faltou / g) : 0 };
  });
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
