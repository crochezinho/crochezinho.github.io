export interface Unidade {
  id: string;
  numero: number;
  pesoG: number;
  fechado: boolean;
}

export interface Retirada {
  unidade: Unidade;
  gramas: number;
}

const arred = (g: number) => Math.max(0, Math.round(g));

export const somaUnidades = (us: Unidade[]) => us.reduce((s, u) => s + Math.max(0, u.pesoG), 0);

export const maiorNumero = (us: Unidade[], piso = 0) => us.reduce((m, u) => Math.max(m, u.numero), Math.max(0, piso));

export const proximoNumero = (us: Unidade[], piso = 0) => maiorNumero(us, piso) + 1;

export const rotuloUnidade = (u: Pick<Unidade, 'numero'>) => `#${u.numero}`;

export const ordenarUnidades = (us: Unidade[]) => [...us].sort((a, b) => a.numero - b.numero);

export function novaUnidade(us: Unidade[], pesoG: number, fechado: boolean, id: string, piso = 0): Unidade[] {
  return [...us, { id, numero: proximoNumero(us, piso), pesoG: arred(pesoG), fechado }];
}

export function unidadesFechadas(us: Unidade[], quantos: number, gramatura: number, novoId: () => string, piso = 0): Unidade[] {
  let res = us;
  for (let i = 0; i < Math.max(0, Math.floor(quantos)); i++) res = novaUnidade(res, gramatura, true, novoId(), piso);
  return res;
}

export function unidadesDoEstoque(estoqueG: number, gramatura: number, novoId: () => string): Unidade[] {
  const total = arred(estoqueG);
  let us: Unidade[] = [];
  if (gramatura > 0) for (let i = 0; i < Math.floor(total / gramatura); i++) us = novaUnidade(us, gramatura, true, novoId());
  const resto = gramatura > 0 ? total % gramatura : total;
  if (resto > 0) us = novaUnidade(us, resto, false, novoId());
  return us;
}

export function pesarUnidade(us: Unidade[], id: string, pesoG: number): Unidade[] {
  const g = arred(pesoG);
  if (g === 0) return us.filter((u) => u.id !== id);
  return us.map((u) => (u.id === id ? { ...u, pesoG: g, fechado: u.fechado && g === u.pesoG } : u));
}

export function ajustarFechados(us: Unidade[], gramatura: number): Unidade[] {
  return gramatura > 0 ? us.map((u) => (u.fechado ? { ...u, pesoG: arred(gramatura) } : u)) : us;
}

export function tirarDasUnidades(us: Unidade[], gramas: number, preferida?: string | null): { unidades: Unidade[]; retiradas: Retirada[]; faltou: number } {
  let falta = arred(gramas);
  const ordem = [...us].sort((a, b) => {
    if (a.id === preferida) return -1;
    if (b.id === preferida) return 1;
    if (a.fechado !== b.fechado) return a.fechado ? 1 : -1;
    return a.pesoG - b.pesoG || a.numero - b.numero;
  });
  const novos = new Map(us.map((u) => [u.id, u]));
  const retiradas: Retirada[] = [];
  for (const u of ordem) {
    if (falta <= 0) break;
    const g = Math.min(falta, u.pesoG);
    if (g <= 0) continue;
    falta -= g;
    retiradas.push({ unidade: u, gramas: g });
    const resto = u.pesoG - g;
    if (resto > 0) novos.set(u.id, { ...u, pesoG: resto, fechado: false });
    else novos.delete(u.id);
  }
  return { unidades: us.filter((u) => novos.has(u.id)).map((u) => novos.get(u.id)!), retiradas, faltou: falta };
}

export function devolverAsUnidades(us: Unidade[], retiradas: Retirada[]): Unidade[] {
  let res = [...us];
  for (const r of retiradas) {
    const g = arred(r.gramas);
    if (g <= 0) continue;
    const atual = res.find((u) => u.id === r.unidade.id);
    if (atual) {
      const pesoG = atual.pesoG + g;
      res = res.map((u) => (u.id === atual.id ? { ...u, pesoG, fechado: r.unidade.fechado && pesoG >= r.unidade.pesoG } : u));
    } else {
      res = [...res, { ...r.unidade, pesoG: g, fechado: r.unidade.fechado && g >= r.unidade.pesoG }];
    }
  }
  return ordenarUnidades(res);
}
