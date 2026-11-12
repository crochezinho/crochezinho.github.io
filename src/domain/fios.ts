export interface FioDoRascunho {
  chave: string;
  noveloId: string | null;
  gramas: number;
  precoPorGramaCentavos: number;
  nome?: string;
  valorCentavos?: number;
  unidadeId?: string | null;
  aPesar?: boolean;
  antesG?: number;
}

type FioDoProjeto = { noveloId: string; gramas: number; unidadeId?: string | null; aPesar?: boolean; antesG?: number };

export function usadoNoFim(antesG: number, sobraG: number, pecas: number): number {
  return Math.round(Math.max(0, antesG - Math.max(0, sobraG)) / Math.max(1, Math.floor(pecas) || 1));
}

function extras(n: FioDoProjeto): Partial<FioDoRascunho> {
  const e: Partial<FioDoRascunho> = {};
  if (n.unidadeId) e.unidadeId = n.unidadeId;
  if (n.aPesar) {
    e.aPesar = true;
    if (n.antesG !== undefined) e.antesG = n.antesG;
  }
  return e;
}

export function trocarFiosDoEstoque(
  atuais: FioDoRascunho[],
  novos: FioDoProjeto[],
  precoAtual: (noveloId: string) => number,
  novaChave: () => string
): FioDoRascunho[] {
  const sobrando = atuais.filter((f) => f.noveloId !== null);
  const doEstoque = novos.map((n) => {
    let i = n.unidadeId ? sobrando.findIndex((f) => f.unidadeId === n.unidadeId) : -1;
    if (i < 0) i = sobrando.findIndex((f) => f.noveloId === n.noveloId && f.gramas === n.gramas);
    if (i < 0) i = sobrando.findIndex((f) => f.noveloId === n.noveloId);
    if (i >= 0) {
      const [antigo] = sobrando.splice(i, 1);
      const { unidadeId: _u, aPesar: _a, antesG: _b, ...base } = antigo;
      return { ...base, gramas: n.gramas, ...extras(n) };
    }
    return { chave: novaChave(), noveloId: n.noveloId, gramas: n.gramas, precoPorGramaCentavos: precoAtual(n.noveloId), ...extras(n) };
  });
  return [...doEstoque, ...atuais.filter((f) => f.noveloId === null)];
}

export function fiosParaFazerDeNovo(
  doCalculo: Omit<FioDoRascunho, 'chave'>[],
  doProjeto: FioDoProjeto[],
  precoAtual: (noveloId: string) => number,
  novaChave: () => string
): FioDoRascunho[] {
  const atuais = doCalculo.map((f) => ({ ...f, chave: novaChave() }));
  const novos = doProjeto.filter((f) => !f.aPesar && f.gramas > 0).map((f) => ({ noveloId: f.noveloId, gramas: f.gramas }));
  return trocarFiosDoEstoque(atuais, novos, precoAtual, novaChave).map((f) =>
    f.noveloId ? { ...f, precoPorGramaCentavos: precoAtual(f.noveloId) || f.precoPorGramaCentavos } : f
  );
}

export interface UsoDaUnidade {
  projetoId: string;
  projeto: string;
  aPesar: boolean;
  gramas: number;
}

export function unidadesEmUso(
  projetos: { id: string; nome: string; status: string; fios: { unidadeId?: string | null; aPesar?: boolean; gramas: number }[] }[],
  exceto?: string | null
): Map<string, UsoDaUnidade> {
  const uso = new Map<string, UsoDaUnidade>();
  for (const p of projetos) {
    if (p.status === 'concluido' || p.id === exceto) continue;
    for (const f of p.fios) if (f.unidadeId) uso.set(f.unidadeId, { projetoId: p.id, projeto: p.nome, aPesar: !!f.aPesar, gramas: f.gramas });
  }
  return uso;
}

export function fiosAoReabrir<F>(p: { fios: F[]; fiosAntesDeConcluir?: F[] | null }): F[] {
  return p.fiosAntesDeConcluir?.length ? p.fiosAntesDeConcluir : p.fios;
}
