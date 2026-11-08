export const REGRAS_SHOPEE_EM = 'nov/2026';

export interface FaixaShopee {
  min: number;
  pct: number;
  fixa: number | 'metade';
}

export const SHOPEE = {
  faixas: [
    { min: 0, pct: 0.2, fixa: 'metade' },
    { min: 9, pct: 0.2, fixa: 4.5 },
    { min: 80, pct: 0.14, fixa: 16 },
    { min: 100, pct: 0.14, fixa: 20 },
    { min: 200, pct: 0.14, fixa: 26 },
    { min: 500, pct: 0.14, fixa: 26 }
  ] as FaixaShopee[],
  adicionalCPF: 3,
  limiteRegressivo: 12,
  pixSubsidioAPartirDe: 80,
  avisoProdutoBarato: 20
};

export const arred = (v: number): number => Math.round(v * 100) / 100;

export function faixaShopee(preco: number): FaixaShopee {
  let f = SHOPEE.faixas[0];
  for (const x of SHOPEE.faixas) if (Math.round(preco * 100) >= Math.round(x.min * 100)) f = x;
  return f;
}

export function degrausShopee(): number[] {
  const d: number[] = [];
  for (let i = 1; i < SHOPEE.faixas.length; i++) {
    const ant = SHOPEE.faixas[i - 1];
    const f = SHOPEE.faixas[i];
    if (ant.fixa !== 'metade' && f.fixa !== ant.fixa) d.push(f.min);
  }
  return d;
}

export interface ParamsShopee {
  preco: number;
  custo?: number | null;
  qtd?: number;
  mais450?: boolean;
  campanhaPct?: number;
  embalagem?: number;
}

export interface ItemShopee {
  preco: number;
  comissao: number;
  taxaFixa: number;
  adicionalCPF: number;
  taxaCampanha: number;
  totalTaxas: number;
  recebe: number;
  custo: number | null;
  embalagem: number;
  lucro: number | null;
}

export interface ResultadoShopee {
  faixa: FaixaShopee;
  pctComissao: number;
  campanhaPct: number;
  qtd: number;
  item: ItemShopee;
  total: ItemShopee;
  pctTaxas: number;
  margem: number | null;
  abaixoRegressivo: boolean;
  subsidioPix: boolean;
}

export function calcShopee(p: ParamsShopee): ResultadoShopee {
  const preco = +p.preco || 0;
  const qtd = Math.max(1, Math.floor(+(p.qtd ?? 1) || 1));
  const f = faixaShopee(preco);
  const comissao = arred(preco * f.pct);
  const taxaFixa = f.fixa === 'metade' ? arred(preco / 2) : f.fixa;
  const adicionalCPF = p.mais450 ? SHOPEE.adicionalCPF : 0;
  const campanhaPct = +(p.campanhaPct ?? 0) || 0;
  const taxaCampanha = arred((preco * campanhaPct) / 100);
  const totalTaxas = arred(comissao + taxaFixa + adicionalCPF + taxaCampanha);
  const recebe = arred(preco - totalTaxas);
  const temCusto = p.custo != null && !Number.isNaN(p.custo);
  const custo = temCusto ? +p.custo! : 0;
  const embalagem = +(p.embalagem ?? 0) || 0;
  const lucro = temCusto ? arred(recebe - custo - embalagem) : null;

  const item: ItemShopee = {
    preco,
    comissao,
    taxaFixa,
    adicionalCPF,
    taxaCampanha,
    totalTaxas,
    recebe,
    custo: temCusto ? custo : null,
    embalagem,
    lucro
  };
  const total = Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v == null ? null : arred((v as number) * qtd)])) as unknown as ItemShopee;

  return {
    faixa: f,
    pctComissao: f.pct * 100,
    campanhaPct,
    qtd,
    item,
    total,
    pctTaxas: preco > 0 ? (totalTaxas / preco) * 100 : 0,
    margem: temCusto && preco > 0 ? (lucro! / preco) * 100 : null,
    abaixoRegressivo: !!p.mais450 && preco < SHOPEE.limiteRegressivo,
    subsidioPix: preco >= SHOPEE.pixSubsidioAPartirDe
  };
}

export interface Equilibrio {
  degrau: number;
  precoAntes: number;
  recebeAntes: number;
  fixaAntes: number;
  fixaDepois: number | 'metade';
  preco: number;
}

export function equilibrioShopee(degrau: number, params: Partial<ParamsShopee>): Equilibrio | null {
  const base: ParamsShopee = { ...params, preco: 0, qtd: 1 };
  const precoAntes = arred(degrau - 0.01);
  const antes = calcShopee({ ...base, preco: precoAntes });
  const ref = antes.item.recebe;
  const inicio = Math.round(degrau * 100);
  for (let c = inicio; c < inicio + 100000; c++) {
    if (calcShopee({ ...base, preco: c / 100 }).item.recebe >= ref) {
      return { degrau, precoAntes, recebeAntes: ref, fixaAntes: antes.item.taxaFixa, fixaDepois: faixaShopee(degrau).fixa, preco: c / 100 };
    }
  }
  return null;
}

export type NivelAviso = 'alerta' | 'aviso' | 'nota';
export interface AvisoShopee {
  nivel: NivelAviso;
  texto: string;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function avisosShopee(p: ParamsShopee, r: ResultadoShopee): AvisoShopee[] {
  const a: AvisoShopee[] = [];
  const { item: it, total: tt, qtd: q } = r;
  if (tt.recebe < 0) a.push({ nivel: 'alerta', texto: `As taxas passam do valor da venda: você paga ${brl(-tt.recebe)} para vender.` });
  else if (tt.lucro != null && tt.lucro < 0)
    a.push({ nivel: 'alerta', texto: `Prejuízo de ${brl(-tt.lucro)}${q > 1 ? ' no pedido' : ' por venda'}. O que você recebe não cobre o custo${it.embalagem ? ' e a embalagem' : ''}.` });

  for (const d of degrausShopee()) {
    const eq = equilibrioShopee(d, p);
    if (eq && p.preco >= d && p.preco < eq.preco) {
      a.push({
        nivel: 'aviso',
        texto: `Você recebe menos do que vendendo a ${brl(eq.precoAntes)} (que deixa ${brl(eq.recebeAntes)}), porque a taxa fixa pula de ${brl(eq.fixaAntes)} para ${brl(eq.fixaDepois as number)}. Venda a ${brl(eq.precoAntes)} ou suba para pelo menos ${brl(eq.preco)}.`
      });
    }
  }

  if (p.preco > 0 && p.preco < SHOPEE.avisoProdutoBarato) {
    let texto = 'A taxa fixa pesa muito em produto barato. Vender em kit (várias unidades num anúncio só) paga a taxa fixa uma vez só.';
    const limiteKit = degrausShopee()[0] - 0.01;
    const n = Math.min(Math.max(2, Math.ceil(SHOPEE.avisoProdutoBarato / p.preco)), Math.floor(limiteKit / p.preco));
    if (n >= 2) {
      const kit = calcShopee({ ...p, preco: arred(p.preco * n), qtd: 1, custo: null });
      texto += ` Kit com ${n} a ${brl(arred(p.preco * n))} deixa ${brl(kit.item.recebe)} (${n} avulsas: ${brl(arred(it.recebe * n))}).`;
    }
    a.push({ nivel: 'aviso', texto });
  }
  if (r.abaixoRegressivo) a.push({ nivel: 'nota', texto: 'Abaixo de R$ 12 o adicional de +450 pedidos é menor que R$ 3, mas a Shopee não publica quanto. O valor real pode ser um pouco melhor.' });
  if (r.subsidioPix) a.push({ nivel: 'nota', texto: 'No Pix, o comprador ganha 5% a 8% de desconto em itens a partir de R$ 80, mas quem paga é a Shopee. Você recebe o mesmo valor.' });
  return a;
}
