import { useLive } from '../db/hooks.ts';
import { listarProjetos, listarSessoes } from '../db/repo.ts';
import type { Projeto, Sessao } from '../db/types.ts';
import { projetosComTempo } from '../domain/encomendas.ts';

export interface DadosCrono {
  projetos: Projeto[];
  sessoes: Sessao[];
  aberta: Sessao | undefined;
  /** Projetos com alguma sessão ou ajuste de tempo; os outros em aberto estão "na fila". */
  comTempo: Set<string>;
}

export function useDadosCrono(): DadosCrono | undefined {
  return useLive(async () => {
    const [projetos, todas] = await Promise.all([listarProjetos(), listarSessoes()]);
    const ids = new Set(projetos.map((p) => p.id));
    const sessoes = todas.filter((s) => ids.has(s.projetoId));
    return { projetos, sessoes, aberta: sessoes.find((s) => s.fim === null), comTempo: projetosComTempo(sessoes) };
  });
}

export function projetoDaVez(d: DadosCrono): Projeto | undefined {
  const porId = (id: string) => d.projetos.find((p) => p.id === id);
  if (d.aberta) return porId(d.aberta.projetoId);
  const ultima = [...d.sessoes].filter((s) => !s.ajuste).sort((a, b) => b.inicio - a.inicio)[0];
  const ultimo = ultima && porId(ultima.projetoId);
  if (ultimo && ultimo.status === 'fazendo') return ultimo;
  const abertos = d.projetos.filter((p) => p.status === 'fazendo');
  return abertos.find((p) => d.comTempo.has(p.id)) ?? abertos[0];
}
