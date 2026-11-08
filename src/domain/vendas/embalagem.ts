export const REGRAS_EMBALAGEM_EM = 'nov/2026';

export type Nivel = 'nenhuma' | 'leve' | 'media' | 'alta';
export type TipoProduto = 'rigido' | 'flexivel' | 'plano';
export type Onda = 'B' | 'C' | 'BC';
export type Modalidade = 'correios' | 'agencia' | 'mini';
export type TipoOpcao = 'plastico' | 'bolha' | 'catalogo' | 'caixa';
export type Status = 'ok' | 'perto' | 'excede';

export const FOLGA: Record<Nivel, { cm: number; camadas: number }> = {
  nenhuma: { cm: 0.5, camadas: 0 },
  leve: { cm: 1.0, camadas: 0 },
  media: { cm: 2.0, camadas: 1 },
  alta: { cm: 4.0, camadas: 2 }
};
export const NIVEIS: Nivel[] = ['nenhuma', 'leve', 'media', 'alta'];

const PAREDE: Record<Onda, number> = { B: 0.3, C: 0.4, BC: 0.7 };
const GRAMATURA: Record<Onda, number> = { B: 520, C: 620, BC: 1000 };
const ONDA_AUTO: { ateG: number; onda: Onda }[] = [
  { ateG: 1000, onda: 'B' },
  { ateG: 5000, onda: 'C' },
  { ateG: Infinity, onda: 'BC' }
];
const ONDA_MINIMA_ALTA: Onda = 'C';
const ORDEM_ONDA: Onda[] = ['B', 'C', 'BC'];

const BOLHA_G_M2 = 45;
const FITA_ETIQUETA_G = { caixa: 15, envelope: 5 };

const ENVELOPE = {
  espessura: { plastico: 0.2, bolha: 0.8 },
  alturaMax: 5,
  alturaMaxRigidoBolha: 3,
  sobra: 1,
  alturaMin: 2
};

export interface Caixa {
  nome: string;
  c: number;
  l: number;
  a: number;
}
export interface Envelope {
  l: number;
  c: number;
  peso: number;
}

export const CATALOGO_CAIXAS: Caixa[] = [
  { nome: 'Pequena', c: 16, l: 11, a: 6 },
  { nome: 'Média', c: 21, l: 14, a: 7 },
  { nome: 'Média alta', c: 27, l: 18, a: 9 },
  { nome: 'Grande', c: 33.5, l: 27, a: 14 },
  { nome: 'Extra grande', c: 43, l: 35, a: 15 }
];
export const CATALOGO_ENVELOPES: Record<'plastico' | 'bolha', Envelope[]> = {
  plastico: [
    { l: 12, c: 18, peso: 3 },
    { l: 19, c: 25, peso: 5 },
    { l: 26, c: 36, peso: 8 },
    { l: 32, c: 40, peso: 12 },
    { l: 40, c: 50, peso: 18 },
    { l: 50, c: 60, peso: 25 }
  ],
  bolha: [
    { l: 14, c: 19, peso: 6 },
    { l: 19, c: 25, peso: 10 },
    { l: 26, c: 36, peso: 18 },
    { l: 32, c: 40, peso: 26 }
  ]
};

export const MINIMOS = [16, 11, 2];

interface Limite {
  nome: string;
  maiorLado?: number;
  soma?: number;
  caixaMax?: number[];
  pesoMaxG: number;
  minimos: number[];
}
export const LIMITES: Record<Modalidade, Limite> = {
  correios: { nome: 'Correios (Shopee)', maiorLado: 100, soma: 200, pesoMaxG: 30000, minimos: MINIMOS },
  agencia: { nome: 'Agência Shopee', maiorLado: 120, soma: 200, pesoMaxG: 30000, minimos: MINIMOS },
  mini: { nome: 'Mini Envios (Correios)', caixaMax: [24, 16, 4], pesoMaxG: 300, minimos: MINIMOS }
};
const PERTO_DO_LIMITE = 0.9;
export const MULTA_FORA_PADRAO = 50;

const MARGEM = { pct: 0.1, minG: 50, multiploG: 10 };
const FATOR_CUBAGEM = 6000;
const LIMIAR_CUBAGEM_KG = 0;
const CAIXA_PADRAO_EXCESSO = 0.5;
const EPS = 1e-9;

const ordenar = (m: number[]) => m.slice().sort((x, y) => y - x);
const cima = (v: number) => Math.ceil(v - 1e-6);
const soma3 = (m: number[]) => m[0] + m[1] + m[2];
const produto3 = (m: number[]) => m[0] * m[1] * m[2];
const superficie = (b: number[]) => 2 * (b[0] * b[1] + b[0] * b[2] + b[1] * b[2]);

export const fmtNum = (v: number, casas = 1) => (+v).toLocaleString('pt-BR', { maximumFractionDigits: casas });
export const fmtMed = (m: number[]) => m.map((x) => fmtNum(x)).join(' × ') + ' cm';
export function fmtG(v: number): string {
  const r = cima(v);
  const s = r.toLocaleString('pt-BR') + ' g';
  return r >= 1000 ? `${s} (${fmtNum(r / 1000, 3)} kg)` : s;
}

export interface Entrada {
  dims: number[];
  pesoUn: number;
  qtd?: number;
  tipo?: TipoProduto;
  protecao?: Nivel;
  fabricante?: boolean;
  embalagem?: 'auto' | TipoOpcao;
  onda?: 'auto' | Onda;
  margemPct?: number;
  margemMinG?: number;
  modalidade?: Modalidade;
  caixas?: Caixa[];
  envelopes?: Partial<Record<'plastico' | 'bolha', Envelope[]>>;
}

interface Norm {
  bruto: Entrada;
  dims: number[];
  pesoUn: number;
  qtd: number;
  pesoProdutos: number;
  tipo: TipoProduto;
  protecaoInformada: Nivel;
  fabricante: boolean;
  protecao: Nivel;
  embalagem: 'auto' | TipoOpcao;
  onda: 'auto' | Onda;
  margem: { pct: number; minG: number; multiploG: number };
  modalidade: Modalidade;
  caixas: Caixa[];
  envelopes: Record<'plastico' | 'bolha', Envelope[]>;
  fator: number;
  limiarKg: number;
}

const num = (x: unknown) => {
  const v = +(x as number);
  return Number.isFinite(v) ? v : 0;
};

function normalizar(e: Entrada): Norm {
  const prot0: Nivel = NIVEIS.includes(e.protecao as Nivel) ? e.protecao! : 'media';
  const fabricante = !!e.fabricante;
  const prot = fabricante && NIVEIS.indexOf(prot0) < NIVEIS.indexOf('leve') ? 'leve' : prot0;
  const qtd = Math.max(1, Math.floor(+(e.qtd ?? 1) || 1));
  const pesoUn = num(e.pesoUn);
  const pct = e.margemPct != null ? +e.margemPct : NaN;
  const min = e.margemMinG != null ? +e.margemMinG : NaN;
  const env = e.envelopes ?? CATALOGO_ENVELOPES;
  return {
    bruto: e,
    dims: ordenar((e.dims ?? [0, 0, 0]).map(num)),
    pesoUn,
    qtd,
    pesoProdutos: pesoUn * qtd,
    tipo: (['rigido', 'flexivel', 'plano'] as const).includes(e.tipo as TipoProduto) ? e.tipo! : 'rigido',
    protecaoInformada: prot0,
    fabricante,
    protecao: prot,
    embalagem: (['auto', 'plastico', 'bolha', 'caixa', 'catalogo'] as const).includes(e.embalagem as TipoOpcao) ? e.embalagem! : 'auto',
    onda: e.onda && e.onda !== 'auto' && PAREDE[e.onda] ? e.onda : 'auto',
    margem: {
      pct: Number.isFinite(pct) && pct >= 0 ? pct : MARGEM.pct,
      minG: Number.isFinite(min) && min >= 0 ? min : MARGEM.minG,
      multiploG: MARGEM.multiploG
    },
    modalidade: e.modalidade && LIMITES[e.modalidade] ? e.modalidade : 'correios',
    caixas: (Array.isArray(e.caixas) ? e.caixas : CATALOGO_CAIXAS).filter((x) => x && +x.c > 0 && +x.l > 0 && +x.a > 0),
    envelopes: {
      plastico: (env.plastico ?? []).filter((x) => x && +x.l > 0 && +x.c > 0 && +x.peso >= 0),
      bolha: (env.bolha ?? []).filter((x) => x && +x.l > 0 && +x.c > 0 && +x.peso >= 0)
    },
    fator: FATOR_CUBAGEM,
    limiarKg: LIMIAR_CUBAGEM_KG
  };
}

function ondaAutomatica(pesoProdutosG: number, protecao: Nivel): Onda {
  let onda: Onda = 'BC';
  for (const o of ONDA_AUTO) {
    if (pesoProdutosG <= o.ateG) {
      onda = o.onda;
      break;
    }
  }
  if (protecao === 'alta' && ORDEM_ONDA.indexOf(onda) < ORDEM_ONDA.indexOf(ONDA_MINIMA_ALTA)) onda = ONDA_MINIMA_ALTA;
  return onda;
}
const ondaDe = (n: Norm): Onda => (n.onda !== 'auto' ? n.onda : ondaAutomatica(n.pesoProdutos, n.protecao));

function aplicarMinimos(m: number[]) {
  let aplicado = false;
  const r = ordenar(m).map((x, i) => {
    if (x < MINIMOS[i] - EPS) {
      aplicado = true;
      return MINIMOS[i];
    }
    return x;
  });
  return { medidas: ordenar(r), aplicado };
}

function areaCaixa(ext: number[]) {
  const m = ordenar(ext);
  return (2 * (m[0] + m[1]) + 3.5) * (m[2] + m[1]);
}
const pesoCaixa = (ext: number[], onda: Onda) => (areaCaixa(ext) / 10000) * GRAMATURA[onda];
const pesoBolha = (bloco: number[], camadas: number) => (superficie(bloco) / 10000) * camadas * BOLHA_G_M2;

export const pesoCubico = (c: number, l: number, a: number, fator = FATOR_CUBAGEM) => (c * l * a * 1000) / fator;

export interface Arranjo {
  bloco: number[];
  grade: number[];
  item: number[];
}

const ROTACOES = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0]
];
function divisores(q: number) {
  const d: number[] = [];
  for (let i = 1; i <= q; i++) if (q % i === 0) d.push(i);
  return d;
}
export function arranjos(dims: number[], qtd: number): Arranjo[] {
  const d = ordenar(dims);
  const q = Math.max(1, Math.floor(+qtd || 1));
  const lista: Arranjo[] = [];
  const vistos = new Set<string>();
  for (const nx of divisores(q)) {
    for (const ny of divisores(q / nx)) {
      const nz = q / nx / ny;
      for (const r of ROTACOES) {
        const item = [d[r[0]], d[r[1]], d[r[2]]];
        const grade = [nx, ny, nz];
        const bloco = [nx * item[0], ny * item[1], nz * item[2]];
        const idx = [0, 1, 2].sort((i, j) => bloco[j] - bloco[i]);
        const a = { bloco: idx.map((i) => bloco[i]), grade: idx.map((i) => grade[i]), item: idx.map((i) => item[i]) };
        const chave = a.bloco.map((x) => x.toFixed(4)).join('x');
        if (!vistos.has(chave)) {
          vistos.add(chave);
          lista.push(a);
        }
      }
    }
  }
  return lista;
}

export interface Pesos {
  produtos: number;
  embalagem: number;
  bolha: number;
  fita: number;
  total: number;
  margem: number;
  cadastrar: number;
}

export interface ItemLimite {
  id: string;
  rotulo: string;
  valor: number | number[];
  limite: number | number[];
  unidade: string;
  status: Status;
  minimo?: boolean;
}
export interface Limites {
  modalidade: Modalidade;
  nome: string;
  status: Status;
  itens: ItemLimite[];
}

export interface Opcao {
  tipo: TipoOpcao;
  ordem: number;
  rotulo: string;
  nome: string;
  serve: boolean;
  motivo?: string;
  descricao?: string;
  arranjo: Arranjo;
  conteudo: number[];
  cadastrar: number[];
  pesos: Pesos;
  cubicoExato: number;
  cubico: number;
  cubicoConta: boolean;
  considerado: number;
  manda: 'tamanho' | 'peso';
  limites: Limites;
  minimoAplicado: boolean;
  camadas: number;
  onda?: Onda;
  parede?: number;
  folga?: number;
  folgaNivel?: Nivel;
  externas?: number[];
  externasFinais?: number[];
  internas?: number[];
  comFolga?: number[];
  volume?: number;
  soma?: number;
  caixa?: Caixa;
  envelope?: Envelope;
  area?: number;
  candidatos?: { cadastrar: number[]; considerado: number; bloco: number[] }[];
  permitida?: boolean;
  viavel?: boolean;
}

type Base = Pick<Opcao, 'tipo' | 'ordem' | 'rotulo' | 'nome'>;
type SemPesosFinais = Omit<Opcao, 'pesos' | 'cubicoExato' | 'cubico' | 'cubicoConta' | 'considerado' | 'manda' | 'limites' | 'serve'> & {
  pesos: Pick<Pesos, 'produtos' | 'embalagem' | 'bolha' | 'fita'>;
};

function completar(o: SemPesosFinais, n: Norm): Opcao {
  const p = o.pesos;
  const total = p.produtos + p.embalagem + p.bolha + p.fita;
  const margem = Math.max(total * n.margem.pct, n.margem.minG);
  const mult = n.margem.multiploG || 10;
  const cadastrar = Math.ceil((total + margem) / mult - EPS) * mult;
  const cubicoExato = pesoCubico(o.cadastrar[0], o.cadastrar[1], o.cadastrar[2], n.fator);
  const cubicoConta = cubicoExato > n.limiarKg * 1000 + EPS;
  return {
    ...o,
    pesos: { ...p, total, margem, cadastrar },
    cubicoExato,
    cubico: cima(cubicoExato),
    cubicoConta,
    considerado: cima(Math.max(cadastrar, cubicoConta ? cubicoExato : 0)),
    manda: cubicoConta && cubicoExato > cadastrar + EPS ? 'tamanho' : 'peso',
    limites: validarLimites(o.cadastrar, cadastrar, n.modalidade),
    serve: true
  };
}
const naoServe = (base: Base, motivo: string): Opcao => ({ ...base, serve: false, motivo }) as Opcao;

function textoProtecao(camadas: number, protecao: Nivel): string {
  if (camadas > 0) return `com ${camadas}${camadas > 1 ? ' camadas' : ' camada'} de plástico bolha`;
  if (protecao === 'leve') return 'com papel ou preenchimento simples';
  return '';
}
const juntar = (partes: string[]) => partes.filter(Boolean).join(', ');

export function estimarCaixa(e: Entrada | Norm, op: { folgaNivel?: Nivel; criterio?: 'volume' | 'considerado' } = {}): Opcao {
  const n = 'bruto' in e ? e : normalizar(e);
  const nivel = op.folgaNivel && FOLGA[op.folgaNivel] ? op.folgaNivel : n.protecao;
  const onda = ondaDe(n);
  const parede = PAREDE[onda];
  const folga = FOLGA[nivel].cm;
  const camadas = FOLGA[n.protecao].camadas;

  const cands = arranjos(n.dims, n.qtd).map((arr) => {
    const comFolga = arr.bloco.map((x) => x + 2 * folga);
    const ext = comFolga.map((x) => x + 2 * parede);
    const min = aplicarMinimos(ext);
    return completar(
      {
        tipo: 'caixa',
        ordem: 3,
        rotulo: 'Caixa sob medida',
        nome: 'Caixa sob medida',
        onda,
        parede,
        folga,
        folgaNivel: nivel,
        camadas,
        arranjo: arr,
        conteudo: arr.bloco,
        comFolga,
        externas: ext,
        externasFinais: min.medidas,
        minimoAplicado: min.aplicado,
        cadastrar: min.medidas.map(cima),
        volume: produto3(ext),
        soma: soma3(ext),
        pesos: {
          produtos: n.pesoProdutos,
          embalagem: pesoCaixa(min.medidas, onda),
          bolha: pesoBolha(arr.bloco, camadas),
          fita: FITA_ETIQUETA_G.caixa
        }
      },
      n
    );
  });

  cands.sort(
    op.criterio === 'considerado'
      ? (a, b) => a.considerado - b.considerado || a.volume! - b.volume!
      : (a, b) => (Math.abs(a.volume! - b.volume!) > 1e-6 ? a.volume! - b.volume! : a.soma! - b.soma!)
  );
  const o = cands[0];
  o.descricao = juntar(['Caixa sob medida', `papelão onda ${onda}`, textoProtecao(camadas, n.protecao)]);
  return o;
}

export function estimarEnvelope(e: Entrada | Norm, tipoEnv: 'plastico' | 'bolha'): Opcao {
  const n = 'bruto' in e ? e : normalizar(e);
  const tipo = tipoEnv === 'bolha' ? 'bolha' : 'plastico';
  const base: Base = {
    tipo,
    ordem: tipo === 'plastico' ? 0 : 1,
    rotulo: tipo === 'bolha' ? 'Envelope com bolha' : 'Envelope plástico',
    nome: tipo === 'bolha' ? 'Envelope com bolha' : 'Envelope plástico'
  };
  if (n.protecao === 'alta') return naoServe(base, 'Produto frágil (proteção alta) nunca vai em envelope.');
  if (tipo === 'plastico' && n.protecao !== 'nenhuma') return naoServe(base, 'Envelope plástico só para o que não quebra nem amassa (proteção nenhuma).');
  if (tipo === 'bolha' && n.protecao === 'nenhuma') return naoServe(base, 'Sem necessidade de proteção, o envelope plástico simples basta.');

  const lista = n.envelopes[tipo].slice().sort((a, b) => a.l * a.c - b.l * b.c || a.peso - b.peso);
  if (!lista.length) return naoServe(base, `O catálogo de ${base.rotulo.toLowerCase()} está vazio.`);
  const camadas = FOLGA[n.protecao].camadas;
  const esp = ENVELOPE.espessura[tipo];
  let melhor: Opcao | null = null;
  const candidatos: NonNullable<Opcao['candidatos']> = [];
  let algumBaixo = false;
  let algumAlto = false;
  let algumRigidoOk = false;

  for (const arr of arranjos(n.dims, n.qtd)) {
    const [C, L, A] = arr.bloco;
    if (A > ENVELOPE.alturaMax + EPS) {
      algumAlto = true;
      continue;
    }
    algumBaixo = true;
    if (tipo === 'bolha' && n.tipo === 'rigido' && A > ENVELOPE.alturaMaxRigidoBolha + EPS) continue;
    algumRigidoOk = true;
    const precisaL = L + A + ENVELOPE.sobra;
    const precisaC = C + A + ENVELOPE.sobra;
    const env = lista.find((v) => (+v.l >= precisaL - EPS && +v.c >= precisaC - EPS) || (+v.c >= precisaL - EPS && +v.l >= precisaC - EPS));
    if (!env) continue;
    const altura = Math.max(ENVELOPE.alturaMin, cima(A + esp));
    const min = aplicarMinimos([Math.max(+env.c, +env.l), Math.min(+env.c, +env.l), altura]);
    const o = completar(
      {
        ...base,
        envelope: env,
        arranjo: arr,
        conteudo: arr.bloco,
        camadas,
        minimoAplicado: min.aplicado,
        cadastrar: min.medidas.map(cima),
        area: +env.l * +env.c,
        pesos: { produtos: n.pesoProdutos, embalagem: +env.peso, bolha: pesoBolha(arr.bloco, camadas), fita: FITA_ETIQUETA_G.envelope }
      },
      n
    );
    candidatos.push({ cadastrar: o.cadastrar, considerado: o.considerado, bloco: arr.bloco });
    if (!melhor || o.considerado < melhor.considerado || (o.considerado === melhor.considerado && o.area! < melhor.area!)) melhor = o;
  }

  if (melhor) {
    melhor.candidatos = candidatos;
    melhor.descricao = juntar([
      `${tipo === 'bolha' ? 'Envelope com plástico bolha ' : 'Envelope plástico de segurança '}${fmtNum(melhor.envelope!.l)} × ${fmtNum(melhor.envelope!.c)} cm`,
      camadas > 0 ? `mais ${textoProtecao(camadas, n.protecao)} no produto` : ''
    ]);
    return melhor;
  }
  if (!algumBaixo) return naoServe(base, `O conteúdo passa de ${ENVELOPE.alturaMax} cm de altura em qualquer arrumação. Use caixa.`);
  if (!algumRigidoOk) return naoServe(base, `Produto rígido com mais de ${ENVELOPE.alturaMaxRigidoBolha} cm de altura não vai em envelope com bolha. Use caixa.`);
  return naoServe(
    base,
    'Nenhum envelope do catálogo serve' +
      (n.qtd > 1 && algumAlto ? ` (empilhado passa de ${ENVELOPE.alturaMax} cm e lado a lado não cabe)` : ' (o conteúdo é grande demais)') +
      '. Use caixa.'
  );
}

export function escolherCaixaPadrao(e: Entrada | Norm): Opcao {
  const n = 'bruto' in e ? e : normalizar(e);
  const base: Base = { tipo: 'catalogo', ordem: 2, rotulo: 'Caixa do catálogo', nome: 'Caixa do catálogo' };
  if (!n.caixas.length) return naoServe(base, 'O catálogo de caixas está vazio.');
  const onda = ondaDe(n);
  const parede = PAREDE[onda];
  const folga = FOLGA[n.protecao].cm;
  const camadas = FOLGA[n.protecao].camadas;
  const arrs = arranjos(n.dims, n.qtd)
    .map((arr) => ({ arr, precisa: arr.bloco.map((x) => x + 2 * folga), sup: superficie(arr.bloco) }))
    .sort((a, b) => a.sup - b.sup);

  let melhor: Opcao | null = null;
  for (const cx of n.caixas) {
    const ext = ordenar([+cx.c, +cx.l, +cx.a]);
    const interna = ext.map((x) => x - 2 * parede);
    const fit = arrs.find(({ precisa: p }) => interna[0] >= p[0] - EPS && interna[1] >= p[1] - EPS && interna[2] >= p[2] - EPS);
    if (!fit) continue;
    const min = aplicarMinimos(ext);
    const o = completar(
      {
        ...base,
        caixa: cx,
        nome: 'Caixa ' + cx.nome,
        onda,
        parede,
        folga,
        camadas,
        arranjo: fit.arr,
        conteudo: fit.arr.bloco,
        comFolga: fit.precisa,
        internas: interna,
        externas: ext,
        externasFinais: min.medidas,
        minimoAplicado: min.aplicado,
        cadastrar: min.medidas.map(cima),
        volume: produto3(ext),
        pesos: { produtos: n.pesoProdutos, embalagem: pesoCaixa(ext, onda), bolha: pesoBolha(fit.arr.bloco, camadas), fita: FITA_ETIQUETA_G.caixa }
      },
      n
    );
    if (!melhor || o.considerado < melhor.considerado || (o.considerado === melhor.considerado && o.volume! < melhor.volume!)) melhor = o;
  }
  if (!melhor) return naoServe(base, `Nenhuma caixa do catálogo é grande o bastante por dentro (medida interna = externa − 2 × ${fmtNum(parede)} cm de parede).`);
  melhor.descricao = juntar([
    `Caixa ${melhor.caixa!.nome} do catálogo (${fmtMed(ordenar([+melhor.caixa!.c, +melhor.caixa!.l, +melhor.caixa!.a]))})`,
    `papelão onda ${onda}`,
    textoProtecao(camadas, n.protecao)
  ]);
  return melhor;
}

const GRAVIDADE: Record<Status, number> = { ok: 0, perto: 1, excede: 2 };
const pior = (a: Status, b: Status): Status => (GRAVIDADE[b] > GRAVIDADE[a] ? b : a);

export function validarLimites(medidas: number[], pesoG: number, modalidade: Modalidade): Limites {
  const lim = LIMITES[modalidade] ?? LIMITES.correios;
  const m = ordenar(medidas);
  const itens: ItemLimite[] = [];
  const st = (valor: number, max: number): Status => (valor > max + EPS ? 'excede' : valor >= PERTO_DO_LIMITE * max - EPS ? 'perto' : 'ok');
  if (lim.caixaMax) {
    const cm = ordenar(lim.caixaMax);
    let s: Status = 'ok';
    for (let i = 0; i < 3; i++) s = pior(s, st(m[i], cm[i]));
    itens.push({ id: 'tamanho', rotulo: 'Tamanho', valor: m, limite: cm, unidade: 'cm', status: s });
  } else {
    itens.push({ id: 'maiorLado', rotulo: 'Maior lado', valor: m[0], limite: lim.maiorLado!, unidade: 'cm', status: st(m[0], lim.maiorLado!) });
    if (lim.soma) itens.push({ id: 'soma', rotulo: 'Soma C + L + A', valor: soma3(m), limite: lim.soma, unidade: 'cm', status: st(soma3(m), lim.soma) });
  }
  itens.push({ id: 'peso', rotulo: 'Peso', valor: pesoG, limite: lim.pesoMaxG, unidade: 'g', status: st(pesoG, lim.pesoMaxG) });
  const mins = ordenar(lim.minimos);
  const abaixo = m.some((x, i) => x < mins[i] - EPS);
  itens.push({ id: 'minimo', rotulo: 'Tamanho mínimo', valor: m, limite: mins, unidade: 'cm', status: abaixo ? 'excede' : 'ok', minimo: true });
  return {
    modalidade: LIMITES[modalidade] ? modalidade : 'correios',
    nome: lim.nome,
    status: itens.reduce<Status>((s, it) => pior(s, it.status), 'ok'),
    itens
  };
}

export function descreverArranjo(arr: Arranjo): string {
  const g = arr.grade;
  if (g[0] * g[1] * g[2] === 1) return '1 unidade';
  const deitado = arr.item[2] <= Math.min(arr.item[0], arr.item[1]) + EPS ? 'deitados' : 'em pé';
  const porCamada = g[0] * g[1];
  const camadas = g[2];
  const txt = g.join(' × ') + ' (C × L × A), ';
  if (camadas === 1) return `${txt}${deitado} lado a lado`;
  if (porCamada === 1) return `${txt}${camadas} ${deitado} empilhados`;
  return `${txt}${camadas} camadas de ${porCamada} ${deitado} lado a lado`;
}

export type NivelDica = 'alerta' | 'aviso' | 'positivo' | 'dica' | 'nota';
export interface Dica {
  id: string;
  nivel: NivelDica;
  texto: string;
}

export interface Recomendacao {
  todas: Opcao[];
  plastico: Opcao;
  bolha: Opcao;
  catalogo: Opcao;
  caixa: Opcao;
  viaveis: Opcao[];
  opcoes: Opcao[];
  recomendada: Opcao | null;
  preferida: Opcao | null;
  preferidaFalhou: boolean;
  mostrar: Opcao;
  foraDoLimite: boolean;
  cabeMini: boolean;
  dicas: Dica[];
}

export function recomendar(e: Entrada): Recomendacao {
  const n = normalizar(e);
  const plastico = estimarEnvelope(n, 'plastico');
  const bolha = estimarEnvelope(n, 'bolha');
  const catalogo = escolherCaixaPadrao(n);
  const caixa = estimarCaixa(n);
  const todas = [plastico, bolha, catalogo, caixa];
  const lim = LIMITES[n.modalidade];
  for (const o of todas) {
    o.permitida = n.embalagem === 'auto' || n.embalagem === o.tipo;
    o.viavel = !!o.serve && o.limites.status !== 'excede';
    if (o.serve && !o.viavel) o.motivo = `Passa do limite da modalidade ${lim.nome}.`;
  }
  const ordem = (a: Opcao, b: Opcao) => a.considerado - b.considerado || a.ordem - b.ordem;
  const viaveis = todas.filter((o) => o.viavel).sort(ordem);
  const opcoes = viaveis.filter((o) => o.permitida);
  const recomendada = opcoes[0] ?? null;
  const preferida = n.embalagem === 'auto' ? null : todas.find((o) => o.tipo === n.embalagem) ?? null;
  const mostrar = recomendada ?? viaveis[0] ?? caixa;
  const r: Recomendacao = {
    todas,
    plastico,
    bolha,
    catalogo,
    caixa,
    viaveis,
    opcoes,
    recomendada,
    preferida,
    preferidaFalhou: !!preferida && !recomendada,
    mostrar,
    foraDoLimite: mostrar.limites.status === 'excede',
    cabeMini: validarLimites(mostrar.cadastrar, mostrar.pesos.cadastrar, 'mini').status !== 'excede',
    dicas: []
  };
  r.dicas = montarDicas(r, n);
  return r;
}

function montarDicas(r: Recomendacao, n: Norm): Dica[] {
  const d: Dica[] = [];
  const m = r.mostrar;
  const lim = LIMITES[n.modalidade];
  if (m.limites.status === 'excede') {
    d.push({ id: 'limite', nivel: 'alerta', texto: `Este pacote passa do limite desta modalidade (${lim.nome}). A Shopee cobra R$ ${MULTA_FORA_PADRAO} por pedido fora do padrão e pode remover o anúncio.` });
  } else if (m.limites.status === 'perto') {
    d.push({ id: 'perto', nivel: 'aviso', texto: `O pacote está perto do limite da modalidade ${lim.nome}. Meça o pacote de verdade antes de vender: se passar, a Shopee cobra R$ ${MULTA_FORA_PADRAO} por pedido.` });
  }
  if (r.preferidaFalhou) {
    d.push({ id: 'preferida', nivel: 'aviso', texto: `${r.preferida!.rotulo} não serve: ${r.preferida!.motivo}${r.viaveis.length ? ' Mostrando a melhor opção automática.' : ''}` });
  }
  if (r.cabeMini && n.modalidade !== 'mini') {
    d.push({ id: 'mini', nivel: 'positivo', texto: 'Pode caber no Mini Envios dos Correios, se a modalidade estiver disponível para você.' });
  }
  if (m.manda === 'tamanho') {
    let t = `O tamanho do pacote está pesando mais que o produto (peso cúbico de ${fmtG(m.cubico)} contra ${fmtG(m.pesos.cadastrar)} de peso).`;
    const alt = reducao(n, m);
    if (alt) t += ` Se reduzir a embalagem para ${fmtMed(alt.opcao.cadastrar)} (${alt.como}), o peso considerado cai de ${fmtG(m.considerado)} para ${fmtG(alt.opcao.considerado)}.`;
    d.push({ id: 'tamanho', nivel: 'dica', texto: t });
  }
  if (n.qtd > 1) {
    const um = recomendar({ ...n.bruto, qtd: 1 }).mostrar;
    d.push({
      id: 'kit',
      nivel: 'dica',
      texto:
        `Kit de ${n.qtd} unidades: ${descreverArranjo(m.arranjo)}. No kit, o frete considera ${fmtG(m.considerado / n.qtd)} por unidade ` +
        `(${fmtG(m.considerado)} ÷ ${n.qtd}). Em ${n.qtd} pacotes separados seriam ${fmtG(um.considerado)} cada (${fmtG(um.considerado * n.qtd)} no total).`
    });
  }
  if (r.catalogo.serve && r.caixa.serve && r.catalogo.cubico > r.caixa.cubico * (1 + CAIXA_PADRAO_EXCESSO)) {
    d.push({
      id: 'caixaPadrao',
      nivel: 'aviso',
      texto:
        `A caixa do catálogo que serve (${r.catalogo.caixa!.nome}) gera ${fmtG(r.catalogo.cubico)} de peso cúbico, ` +
        `${fmtG(r.catalogo.cubico - r.caixa.cubico)} a mais que a caixa sob medida (${fmtG(r.caixa.cubico)}). Vale comprar uma caixa mais perto de ${fmtMed(r.caixa.cadastrar)}.`
    });
  }
  if (r.caixa.minimoAplicado) {
    const leve = n.protecao === 'nenhuma' ? ' Envelope plástico costuma ser a opção mais leve.' : n.protecao === 'alta' ? '' : ' Envelope com bolha costuma ser a opção mais leve.';
    d.push({ id: 'minimo', nivel: 'dica', texto: `Seu pacote vai ser cadastrado no tamanho mínimo aceito (${fmtMed(MINIMOS)}).${leve}` });
  }
  if (n.fabricante && n.protecaoInformada !== n.protecao) {
    d.push({ id: 'fabricante', nivel: 'nota', texto: 'Produto na caixa do fabricante: usei proteção leve, a mínima nesse caso.' });
  }
  if (n.onda !== 'auto') {
    const auto = ondaAutomatica(n.pesoProdutos, n.protecao);
    if (ORDEM_ONDA.indexOf(n.onda) < ORDEM_ONDA.indexOf(auto)) {
      d.push({ id: 'onda', nivel: 'aviso', texto: `Você escolheu papelão onda ${n.onda}, mais fino que o recomendado (${auto}) para este peso e proteção.` });
    }
  }
  if (n.protecao === 'alta') {
    d.push({ id: 'fragil', nivel: 'aviso', texto: 'Produto frágil: escreva FRÁGIL na embalagem e preencha todos os espaços vazios. Nenhuma embalagem garante contra quebra.' });
  }
  return d;
}

function reducao(n: Norm, m: Opcao): { opcao: Opcao; como: string } | null {
  const tentativas: { opcao: Opcao; como: string }[] = [];
  const c1 = estimarCaixa(n, { criterio: 'considerado' });
  tentativas.push({ opcao: c1, como: m.tipo === 'caixa' ? `arrumando as unidades assim: ${descreverArranjo(c1.arranjo)}` : 'caixa sob medida' });
  if (n.protecao === 'leve' || n.protecao === 'media') {
    const abaixo = NIVEIS[NIVEIS.indexOf(n.protecao) - 1];
    const c2 = estimarCaixa(n, { criterio: 'considerado', folgaNivel: abaixo });
    tentativas.push({
      opcao: c2,
      como: `${m.tipo === 'caixa' ? '' : 'caixa sob medida com '}folga de ${fmtNum(FOLGA[abaixo].cm)} cm por lado em vez de ${fmtNum(FOLGA[n.protecao].cm)} cm, mais justa`
    });
  }
  let melhor: { opcao: Opcao; como: string } | null = null;
  for (const t of tentativas) {
    if (t.opcao.limites.status === 'excede' || t.opcao.considerado >= m.considerado) continue;
    if (!melhor || t.opcao.considerado < melhor.opcao.considerado) melhor = t;
  }
  return melhor;
}
