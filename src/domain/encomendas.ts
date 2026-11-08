import { ordenarPorPrazo } from './prazo.ts';

export type Etapa = 'fazendo' | 'pronta' | 'entregue';

interface ProjetoEncomenda {
  status: 'fazendo' | 'concluido';
  cliente?: string;
  entregaEm?: string | null;
  entregueEm?: number | null;
  concluidoEm: number | null;
}

export function ehEncomenda(p: Pick<ProjetoEncomenda, 'cliente' | 'entregaEm'>): boolean {
  return !!p.cliente?.trim() || !!p.entregaEm;
}

export function etapa(p: Pick<ProjetoEncomenda, 'status' | 'entregueEm'>): Etapa {
  if (p.status === 'fazendo') return 'fazendo';
  return p.entregueEm ? 'entregue' : 'pronta';
}

export const NOME_ETAPA: Record<Etapa, string> = { fazendo: 'fazendo', pronta: 'pronta', entregue: 'entregue' };

export function separarEncomendas<T extends ProjetoEncomenda>(projetos: T[]): Record<Etapa, T[]> {
  const enc = projetos.filter(ehEncomenda);
  return {
    fazendo: ordenarPorPrazo(enc.filter((p) => etapa(p) === 'fazendo')),
    pronta: ordenarPorPrazo(enc.filter((p) => etapa(p) === 'pronta')),
    entregue: enc.filter((p) => etapa(p) === 'entregue').sort((a, b) => (b.entregueEm ?? 0) - (a.entregueEm ?? 0))
  };
}
