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
}

export interface FioCalculo {
  noveloId: Id | null;
  gramas: number;
  precoPorGramaCentavos: number;
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
  totalCentavos: number;
  calculadoEm: number;
}

export interface Projeto extends Registro {
  nome: string;
  tipo: string;
  agulha: string;
  capaCor: string;
  quantidade: number;
  status: StatusProjeto;
  fios: FioUsado[];
  calculo: Calculo | null;
  precoCentavos: number | null;
  criadoEm: number;
  concluidoEm: number | null;
  descontado?: FioUsado[];
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
  cor: string;
  marca: string;
  tipo: string;
  gramatura: number;
  precoCentavos: number;
  lote: string;
  agulha: string;
  estoqueG: number;
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
}

export interface Config {
  chave: string;
  valor: unknown;
  atualizadoEm?: number;
}
