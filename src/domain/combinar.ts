export const MAX_COMBINAR = 3;

export function alternarSelecao(ids: string[], id: string, max = MAX_COMBINAR): string[] {
  if (ids.includes(id)) return ids.filter((x) => x !== id);
  return ids.length >= max ? ids : [...ids, id];
}

export function mover(ids: string[], i: number, delta: -1 | 1): string[] {
  const j = i + delta;
  if (i < 0 || i >= ids.length || j < 0 || j >= ids.length) return ids;
  const novos = [...ids];
  [novos[i], novos[j]] = [novos[j], novos[i]];
  return novos;
}

export function lerIds(texto: string | undefined): string[] {
  const ids: string[] = [];
  for (const id of (texto ?? '').split(',')) {
    const limpo = decodeURIComponent(id.trim());
    if (limpo && !ids.includes(limpo) && ids.length < MAX_COMBINAR) ids.push(limpo);
  }
  return ids;
}
