import type { Unidade } from '../domain/unidades.ts';
import type { Fechamento, Venda } from '../domain/financeiro.ts';

export type { Unidade };

export type Id = string;

export interface Registro {
  id: Id;
  atualizadoEm: number;
  excluidoEm: number | null;
}

export type StatusProjeto = 'fazendo' | 'concluido';

export interface FioUsado {
  noveloId: Id;
  gramas: number;
  unidadeId?: Id | null;
  aPesar?: boolean;
  antesG?: number;
}

export interface FioDescontado {
  noveloId: Id;
  gramas: number;
  unidade?: Unidade;
  criada?: boolean;
}

export interface FioCalculo {
  noveloId: Id | null;
  gramas: number;
  precoPorGramaCentavos: number;
  unidadeId?: Id | null;
  aPesar?: boolean;
  antesG?: number;
  nome?: string;
  valorCentavos?: number;
}

export interface CustoExtra {
  nome: string;
  valorCentavos: number;
}

export interface Calculo {
  fios: FioCalculo[];
  minutos: number;
  valorHoraCentavos: number;
  extras: CustoExtra[];
  margemPct: number;
  quantidade?: number;
  /** O preço já soma as taxas da Shopee: totalCentavos é o preço de anúncio. */
  comShopee?: boolean;
  totalCentavos: number;
  calculadoEm: number;
}

export interface Projeto extends Registro {
  nome: string;
  fotoId: Id | null;
  tipo: string;
  agulha: string;
  capaCor: string;
  quantidade: number;
  anotacoes: string;
  receitaUrl: string;
  cliente: string;
  entregaEm: string | null;
  entregueEm: number | null;
  status: StatusProjeto;
  fios: FioUsado[];
  calculo: Calculo | null;
  precoCentavos: number | null;
  criadoEm: number;
  concluidoEm: number | null;
  descontado?: FioDescontado[];
  fiosAntesDeConcluir?: FioUsado[];
  /** Valor combinado, frete e sinal (encomendas). */
  venda?: Venda | null;
  /** Tempo, valor da hora e material congelados no dia da entrega. */
  fechamento?: Fechamento | null;
}

export interface Sessao extends Registro {
  projetoId: Id;
  inicio: number;
  fim: number | null;
  ajuste: boolean;
  editada: boolean;
}

export type Textura = 'liso' | 'brilho' | 'felpudo';

export interface Novelo extends Registro {
  fotoId: Id | null;
  cor: string;
  marca: string;
  tipo: string;
  gramatura: number;
  precoCentavos: number;
  lote: string;
  agulha: string;
  unidades: Unidade[];
  estoqueG: number;
  ultimoNumero?: number;
  capaCor: string;
  textura: Textura;
}

export interface Rascunho {
  fios: (FioCalculo & { chave: string })[];
  quantidade?: number;
  minutos: number;
  minutosDoCrono: boolean;
  valorHoraCentavos: number;
  extras: (CustoExtra & { chave: string })[];
  margemPct: number;
  comShopee?: boolean;
}

export interface Foto {
  id: Id;
  blob: Blob;
  criadoEm: number;
  enviada: boolean;
}

export interface Config {
  chave: string;
  valor: unknown;
  atualizadoEm?: number;
}
