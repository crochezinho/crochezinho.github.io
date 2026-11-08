export type NivelPrazo = 'atrasada' | 'perto' | 'ok';

export function diasAte(entrega: string | null | undefined, hoje: Date): number | null {
  const m = entrega?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const alvo = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const base = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - base) / 86_400_000);
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function diaDaEntrega(entrega: string): string {
  const [, m, d] = entrega.split('-').map(Number);
  return `${d} ${MESES[m - 1]}`;
}

export function descreverPrazo(entrega: string | null | undefined, hoje: Date): { texto: string; nivel: NivelPrazo } | null {
  const d = diasAte(entrega, hoje);
  if (d === null) return null;
  if (d < 0) return { texto: d === -1 ? 'atrasada 1 dia' : `atrasada ${-d} dias`, nivel: 'atrasada' };
  if (d === 0) return { texto: 'entrega hoje', nivel: 'perto' };
  if (d === 1) return { texto: 'entrega amanhã', nivel: 'perto' };
  if (d <= 7) return { texto: `entrega em ${d} dias`, nivel: d <= 3 ? 'perto' : 'ok' };
  return { texto: `entrega ${diaDaEntrega(entrega!)}`, nivel: 'ok' };
}

export function ordenarPorPrazo<T extends { entregaEm?: string | null }>(projetos: T[]): T[] {
  const com = projetos.filter((p) => diasAte(p.entregaEm, new Date(0)) !== null);
  const sem = projetos.filter((p) => diasAte(p.entregaEm, new Date(0)) === null);
  return [...com.sort((a, b) => a.entregaEm!.localeCompare(b.entregaEm!)), ...sem];
}
