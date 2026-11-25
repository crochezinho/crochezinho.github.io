import { useLive } from '../db/hooks.ts';
import { baseFinanceira, type BaseFinanceira } from '../db/repo.ts';
import type { Projeto, Sessao } from '../db/types.ts';
import { dividir, fechar, mesDe, vendaDe, type Divisao } from '../domain/financeiro.ts';
import { totalDoProjeto } from '../domain/tempo.ts';

export const useBaseFinanceira = () => useLive(baseFinanceira);

/** Encomendas entregues antes do financeiro existir não têm fechamento: calcula com os valores de hoje. */
export function divisaoDe(p: Projeto, sessoes: Sessao[], base: BaseFinanceira, agora: number): Divisao {
  const f = p.fechamento ?? fechar(p, totalDoProjeto(sessoes, p.id, agora) / 60_000, base.valorHoraCentavos, base.novelos, base.regras);
  return dividir(vendaDe(p), f);
}

export const entreguesNoMes = (projetos: Projeto[], mes: string) =>
  projetos.filter((p) => p.entregueEm && mesDe(p.entregueEm) === mes).sort((a, b) => b.entregueEm! - a.entregueEm!);

export const valorCombinado = (p: Projeto) => vendaDe(p).valorCentavos;
