import { custoDoFio, precoPorGrama, type FioDoCalculo } from './preco.ts';
import { calcShopee, type ParamsShopee } from './vendas/shopee.ts';

export type Canal = 'direto' | 'shopee';

/** O que foi combinado com a cliente. Valor é o da encomenda inteira (todas as peças), sem o frete. */
export interface Venda {
  valorCentavos: number;
  freteCentavos: number;
  sinalCentavos: number;
  canal: Canal;
}

/** Retrato tirado na entrega, para o mês não mudar quando o valor da hora ou o preço do fio mudarem depois. */
export interface Fechamento {
  minutos: number;
  valorHoraCentavos: number;
  materialCentavos: number;
  taxasCentavos: number;
}

export interface Divisao {
  cobrado: number;
  taxas: number;
  recebido: number;
  material: number;
  salario: number;
  lucro: number;
  minutos: number;
  valorHora: number;
  /** Quanto cada hora rendeu de verdade: o que sobrou depois do material e das taxas, dividido pelas horas. */
  horaReal: number | null;
}

export const VENDA_VAZIA: Venda = { valorCentavos: 0, freteCentavos: 0, sinalCentavos: 0, canal: 'direto' };

export function dividir(venda: Venda, f: Fechamento): Divisao {
  const cobrado = Math.max(0, venda.valorCentavos);
  const taxas = venda.canal === 'shopee' ? Math.max(0, f.taxasCentavos) : 0;
  const recebido = cobrado - taxas;
  const material = Math.max(0, f.materialCentavos);
  const salario = Math.round((Math.max(0, f.minutos) / 60) * Math.max(0, f.valorHoraCentavos));
  return {
    cobrado,
    taxas,
    recebido,
    material,
    salario,
    lucro: recebido - material - salario,
    minutos: f.minutos,
    valorHora: f.valorHoraCentavos,
    horaReal: f.minutos > 0 ? Math.round((recebido - material) / (f.minutos / 60)) : null
  };
}

/** Na Shopee o frete fica com a Shopee e não existe sinal. */
export function faltaReceber(v: Venda): number {
  if (v.canal === 'shopee') return 0;
  return Math.max(0, v.valorCentavos + v.freteCentavos - v.sinalCentavos);
}

export function taxasDaShopee(valorCentavos: number, quantidade: number, regras: Pick<ParamsShopee, 'mais450' | 'campanhaPct'>): number {
  const q = Math.max(1, Math.floor(quantidade) || 1);
  if (valorCentavos <= 0) return 0;
  return Math.round(calcShopee({ ...regras, preco: valorCentavos / q / 100, qtd: q }).total.totalTaxas * 100);
}

interface FioDoProjeto {
  noveloId: string;
  gramas: number;
  aPesar?: boolean;
}
interface NoveloPreco {
  id: string;
  precoCentavos: number;
  gramatura: number;
}
interface ProjetoMaterial {
  quantidade?: number;
  fios: FioDoProjeto[];
  calculo: { fios: (FioDoCalculo & { noveloId: string | null })[]; extras: { valorCentavos: number }[] } | null;
}

/**
 * Custo do material da encomenda inteira. Usa os fios do projeto (o peso real, depois de pesar a sobra)
 * com o preço atual de cada novelo; o que não está no estoque (fio com valor manual e outros custos) vem do cálculo.
 */
export function materialDoProjeto(p: ProjetoMaterial, novelos: NoveloPreco[]): number {
  const q = Math.max(1, Math.floor(p.quantidade ?? 1) || 1);
  const preco = (id: string) => {
    const n = novelos.find((x) => x.id === id);
    return n ? precoPorGrama(n.precoCentavos, n.gramatura) : 0;
  };
  const doCalculo = p.calculo?.fios ?? [];
  const fios = p.fios.length
    ? p.fios.filter((f) => !f.aPesar).reduce((s, f) => s + Math.max(0, f.gramas) * preco(f.noveloId), 0)
    : doCalculo.filter((f) => f.noveloId).reduce((s, f) => s + custoDoFio(f), 0);
  const manuais = doCalculo.filter((f) => !f.noveloId).reduce((s, f) => s + custoDoFio(f), 0);
  const extras = (p.calculo?.extras ?? []).reduce((s, e) => s + Math.max(0, e.valorCentavos), 0);
  return Math.round((fios + manuais + extras) * q);
}

/** "2026-11", no fuso do aparelho. */
export function mesDe(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function mesVizinho(mes: string, passo: number): string {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + passo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function nomeDoMes(mes: string, comAno = false): string {
  const [a, m] = mes.split('-').map(Number);
  return comAno ? `${NOMES_MES[m - 1]} de ${a}` : NOMES_MES[m - 1];
}

export interface Resumo {
  entregas: number;
  cobrado: number;
  taxas: number;
  recebido: number;
  material: number;
  salario: number;
  lucro: number;
}

export function somar(divisoes: Divisao[]): Resumo {
  const r: Resumo = { entregas: divisoes.length, cobrado: 0, taxas: 0, recebido: 0, material: 0, salario: 0, lucro: 0 };
  for (const d of divisoes) {
    r.cobrado += d.cobrado;
    r.taxas += d.taxas;
    r.recebido += d.recebido;
    r.material += d.material;
    r.salario += d.salario;
    r.lucro += d.lucro;
  }
  return r;
}

interface ProjetoVenda extends ProjetoMaterial {
  venda?: Venda | null;
  precoCentavos: number | null;
  calculo: (ProjetoMaterial['calculo'] & { comShopee?: boolean }) | null;
}

/** A venda anotada ou, se ainda não foi anotada, a que sai do preço calculado. */
export function vendaDe(p: ProjetoVenda): Venda {
  if (p.venda) return p.venda;
  const q = Math.max(1, Math.floor(p.quantidade ?? 1) || 1);
  return { ...VENDA_VAZIA, valorCentavos: (p.precoCentavos ?? 0) * q, canal: p.calculo?.comShopee ? 'shopee' : 'direto' };
}

export function fechar(
  p: ProjetoVenda,
  minutos: number,
  valorHoraCentavos: number,
  novelos: NoveloPreco[],
  regras: Pick<ParamsShopee, 'mais450' | 'campanhaPct'>
): Fechamento {
  const v = vendaDe(p);
  return {
    minutos: Math.max(0, Math.round(minutos)),
    valorHoraCentavos,
    materialCentavos: materialDoProjeto(p, novelos),
    taxasCentavos: v.canal === 'shopee' ? taxasDaShopee(v.valorCentavos, p.quantidade ?? 1, regras) : 0
  };
}
