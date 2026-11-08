export interface FioDoCalculo {
  gramas: number;
  precoPorGramaCentavos: number;
  valorCentavos?: number;
}

export interface EntradaCalculo {
  fios: FioDoCalculo[];
  minutos: number;
  valorHoraCentavos: number;
  extrasCentavos: number[];
  margemPct: number;
  quantidade?: number;
}

export interface ResultadoCalculo {
  fios: number;
  trabalho: number;
  outros: number;
  lucro: number;
  total: number;
  porPeca: number;
  quantidade: number;
}

export function precoPorGrama(precoCentavos: number, gramatura: number): number {
  return gramatura > 0 ? precoCentavos / gramatura : 0;
}

export function custoDoFio(f: FioDoCalculo): number {
  if (f.valorCentavos != null) return Math.max(0, f.valorCentavos);
  return Math.max(0, f.gramas) * Math.max(0, f.precoPorGramaCentavos);
}

export const pecas = (q: number | undefined): number => Math.max(1, Math.floor(q ?? 1) || 1);

export function calcular(e: EntradaCalculo): ResultadoCalculo {
  const q = pecas(e.quantidade);
  const fios = e.fios.reduce((a, f) => a + custoDoFio(f), 0) * q;
  const trabalho = (Math.max(0, e.minutos) / 60) * Math.max(0, e.valorHoraCentavos);
  const outros = e.extrasCentavos.reduce((a, v) => a + Math.max(0, v), 0) * q;
  const subtotal = fios + trabalho + outros;
  const lucro = subtotal * (Math.max(0, e.margemPct) / 100);
  return {
    fios: Math.round(fios),
    trabalho: Math.round(trabalho),
    outros: Math.round(outros),
    lucro: Math.round(lucro),
    total: Math.round(subtotal + lucro),
    porPeca: Math.round((subtotal + lucro) / q),
    quantidade: q
  };
}

export function gramasUsadas(pesoAntes: number, sobrou: number): number {
  return Math.max(0, pesoAntes - sobrou);
}

export function composicao(r: Pick<ResultadoCalculo, 'fios' | 'trabalho' | 'outros' | 'lucro'>): Record<'fios' | 'trabalho' | 'outros' | 'lucro', number> {
  const soma = r.fios + r.trabalho + r.outros + r.lucro;
  const f = (v: number) => (soma > 0 ? v / soma : 0);
  return { fios: f(r.fios), trabalho: f(r.trabalho), outros: f(r.outros), lucro: f(r.lucro) };
}

const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function brl(centavos: number): string {
  return 'R$ ' + fmt.format(Math.round(centavos) / 100);
}

export function centavosParaTexto(centavos: number): string {
  return fmt.format(Math.round(centavos) / 100);
}

export function textoParaCentavos(texto: string): number {
  const limpo = texto.replace(/[^\d,.]/g, '');
  if (!limpo) return 0;
  const [inteiro, decimal = ''] = limpo.replace(/\./g, '').split(',');
  const n = Number(`${inteiro || '0'}.${decimal.slice(0, 2).padEnd(2, '0')}`);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
