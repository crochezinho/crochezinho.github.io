import { href, ir } from '../../app/router.ts';
import { CampoDecimal, CampoDinheiro, CampoInteiro } from '../../components/Campos.tsx';
import { Icone } from '../../components/Icone.tsx';
import { Interruptor } from '../../components/Interruptor.tsx';
import { brl } from '../../domain/preco.ts';
import { REGRAS_SHOPEE_EM, avisosShopee, calcShopee, type ParamsShopee } from '../../domain/vendas/shopee.ts';
import { AbasCalcular } from '../calculadora/AbasCalcular.tsx';
import { CHAVE_SHOPEE, SHOPEE_PADRAO, useEstadoSalvo } from './estado.ts';

const reais = (centavos: number) => centavos / 100;
const emCentavos = (reaisValor: number) => Math.round(reaisValor * 100);
const pct = (v: number, casas = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: casas }) + '%';

export function Shopee() {
  const [e, mudar] = useEstadoSalvo(CHAVE_SHOPEE, SHOPEE_PADRAO);
  if (!e) return <main class="tela" />;

  const temPreco = e.precoCentavos > 0;
  const p: ParamsShopee = {
    preco: reais(e.precoCentavos),
    custo: e.custoCentavos > 0 ? reais(e.custoCentavos) : null,
    qtd: e.qtd,
    mais450: e.mais450,
    campanhaPct: e.campanhaPct,
    embalagem: reais(e.embalagemCentavos)
  };
  const r = calcShopee(p);
  const t = r.total;
  const q = r.qtd;
  const avisos = temPreco ? avisosShopee(p, r) : [];
  const ajustes = [q > 1 && `${q} itens`, e.embalagemCentavos > 0 && 'embalagem', e.mais450 && '+450 pedidos', e.campanhaPct > 0 && 'campanha'].filter(Boolean);

  return (
    <main class="tela anim-tela calc vender">
      <AbasCalcular atual="shopee" />
      <header class="cabecalho">
        <div>
          <h1 class="titulo-grande">Vender na Shopee</h1>
          <p class="subtitulo">Vendedor CPF · regras de {REGRAS_SHOPEE_EM}</p>
        </div>
      </header>

      <div class="grade-2">
        <div>
          <label class="rotulo" for="sh-preco">
            Preço de venda
          </label>
          <CampoDinheiro id="sh-preco" centavos={e.precoCentavos} aoMudar={(v) => mudar({ precoCentavos: v })} rotulo="Preço de venda do anúncio" />
        </div>
        <div>
          <label class="rotulo" for="sh-custo">
            Custo <span class="opcional">opcional</span>
          </label>
          <CampoDinheiro id="sh-custo" centavos={e.custoCentavos} aoMudar={(v) => mudar({ custoCentavos: v })} rotulo="Custo do produto" />
        </div>
      </div>

      <section class="cartao-preco" aria-live="polite">
        <p class="sobretitulo">Você recebe{q > 1 ? ` (${q} itens)` : ''}</p>
        <p class="cartao-preco-valor">{temPreco ? brl(emCentavos(t.recebe)) : '—'}</p>
        {temPreco && (
          <p class="cartao-preco-sub">
            {t.lucro == null
              ? `taxas de ${brl(emCentavos(t.totalTaxas))} (${pct(r.pctTaxas)})`
              : t.lucro < 0
                ? `prejuízo de ${brl(emCentavos(-t.lucro))}`
                : `lucro de ${brl(emCentavos(t.lucro))} · margem ${pct(r.margem!)}`}
          </p>
        )}
        {!temPreco && <p class="cartao-preco-sub">Digite o preço para ver quanto sobra.</p>}
      </section>

      {avisos.map((a, i) => (
        <div key={i} class={'aviso-venda ' + a.nivel} role={a.nivel === 'alerta' ? 'alert' : undefined}>
          {a.texto}
        </div>
      ))}

      {temPreco && (
        <details class="mais-detalhes">
          <summary>Ver as taxas</summary>
          <dl class="ficha">
            <Linha rotulo={`Preço${q > 1 ? ` × ${q}` : ''}`} valor={brl(emCentavos(t.preco))} />
            <Linha rotulo={`Comissão (${pct(r.pctComissao)})`} valor={`− ${brl(emCentavos(t.comissao))}`} />
            <Linha rotulo={`Taxa fixa por item${r.faixa.fixa === 'metade' ? ' (metade do preço)' : ''}`} valor={`− ${brl(emCentavos(t.taxaFixa))}`} />
            {t.adicionalCPF > 0 && <Linha rotulo="Adicional +450 pedidos" valor={`− ${brl(emCentavos(t.adicionalCPF))}`} />}
            {t.taxaCampanha > 0 && <Linha rotulo={`Campanha (${pct(r.campanhaPct, 2)})`} valor={`− ${brl(emCentavos(t.taxaCampanha))}`} />}
            <Linha rotulo="Você recebe" valor={brl(emCentavos(t.recebe))} forte />
            {t.custo != null && <Linha rotulo="Custo" valor={`− ${brl(emCentavos(t.custo))}`} />}
            {t.custo != null && t.embalagem > 0 && <Linha rotulo="Embalagem" valor={`− ${brl(emCentavos(t.embalagem))}`} />}
            {t.lucro != null && <Linha rotulo="Lucro" valor={brl(emCentavos(t.lucro))} forte />}
          </dl>
          {q > 1 && <p class="texto-apagado">Por item: recebe {brl(emCentavos(r.item.recebe))}.</p>}
        </details>
      )}

      <details class="mais-detalhes">
        <summary>
          Ajustes{ajustes.length ? <span class="resumo-ajustes">· {ajustes.join(', ')}</span> : null}
        </summary>
        <div class="grade-2">
          <div>
            <label class="rotulo" for="sh-qtd">
              Itens no pedido
            </label>
            <CampoInteiro id="sh-qtd" valor={e.qtd} aoMudar={(v) => mudar({ qtd: v })} rotulo="Itens no pedido" sufixo="un" max={999} minimo={1} />
          </div>
          <div>
            <label class="rotulo" for="sh-emb">
              Embalagem de envio, por item
            </label>
            <CampoDinheiro id="sh-emb" centavos={e.embalagemCentavos} aoMudar={(v) => mudar({ embalagemCentavos: v })} rotulo="Custo da embalagem de envio, por item" />
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <Interruptor ligado={e.mais450} aoMudar={(v) => mudar({ mais450: v })} rotulo="Passei de 450 pedidos" detalhe="Nos últimos 90 dias: +R$ 3 por item." />
        </div>
        <label class="rotulo" for="sh-camp">
          Campanha de Destaque <span class="opcional">só se estiver em campanha</span>
        </label>
        <CampoDecimal id="sh-camp" valor={e.campanhaPct} aoMudar={(v) => mudar({ campanhaPct: Math.min(100, v) })} rotulo="Taxa da Campanha de Destaque" sufixo="%" />
        <p class="texto-apagado">Durante a campanha, a taxa vale para todas as vendas da loja.</p>
      </details>

      <p class="rodape-regras">
        Não inclui Shopee Ads, cobrança extra de frete por peso/medida errados, devoluções e impostos. Taxas de {REGRAS_SHOPEE_EM}: confira
        na Central do Vendedor.
      </p>

      <button class="botao largo botao-dicas" onClick={() => ir(href.dicasShopee)}>
        <Icone nome="dica" />
        Dicas para precificar e vender
      </button>
    </main>
  );
}

function Linha({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div class={forte ? 'forte' : ''}>
      <dt>{rotulo}</dt>
      <dd>{valor}</dd>
    </div>
  );
}
