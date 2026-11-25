import { diasAte, ordenarPorPrazo } from './prazo.ts';

export type Etapa = 'fila' | 'fazendo' | 'pronta' | 'entregue';

interface ProjetoEncomenda {
  id: string;
  status: 'fazendo' | 'concluido';
  cliente?: string;
  entregaEm?: string | null;
  entregueEm?: number | null;
  concluidoEm: number | null;
}

export function ehEncomenda(p: Pick<ProjetoEncomenda, 'cliente' | 'entregaEm'>): boolean {
  return !!p.cliente?.trim() || !!p.entregaEm;
}

/** Projetos que já têm alguma sessão no cronômetro ou tempo ajustado à mão. */
export function projetosComTempo(sessoes: { projetoId: string }[]): Set<string> {
  return new Set(sessoes.map((s) => s.projetoId));
}

/** Um projeto só passa a "fazendo" quando o cronômetro roda ou entra algum tempo; antes disso fica na fila. */
export function naFila(p: Pick<ProjetoEncomenda, 'id' | 'status'>, comTempo: ReadonlySet<string>): boolean {
  return p.status === 'fazendo' && !comTempo.has(p.id);
}

export function etapa(p: Pick<ProjetoEncomenda, 'id' | 'status' | 'entregueEm'>, comTempo: ReadonlySet<string>): Etapa {
  if (p.status === 'fazendo') return comTempo.has(p.id) ? 'fazendo' : 'fila';
  return p.entregueEm ? 'entregue' : 'pronta';
}

export const NOME_ETAPA: Record<Etapa, string> = { fila: 'na fila', fazendo: 'fazendo', pronta: 'pronta', entregue: 'entregue' };

export function separarEncomendas<T extends ProjetoEncomenda>(projetos: T[], comTempo: ReadonlySet<string>): Record<Etapa, T[]> {
  const enc = projetos.filter(ehEncomenda);
  const da = (e: Etapa) => enc.filter((p) => etapa(p, comTempo) === e);
  return {
    fila: ordenarPorPrazo(da('fila')),
    fazendo: ordenarPorPrazo(da('fazendo')),
    pronta: ordenarPorPrazo(da('pronta')),
    entregue: da('entregue').sort((a, b) => (b.entregueEm ?? 0) - (a.entregueEm ?? 0))
  };
}

/** Encomendas ainda não entregues com entrega até o domingo desta semana, atrasadas incluídas. */
export function paraEstaSemana<T extends ProjetoEncomenda>(projetos: T[], hoje: Date): T[] {
  const ateDomingo = (7 - hoje.getDay()) % 7;
  return ordenarPorPrazo(
    projetos.filter((p) => {
      if (p.entregueEm) return false;
      const d = diasAte(p.entregaEm, hoje);
      return d !== null && d <= ateDomingo;
    })
  );
}
