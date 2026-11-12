import { CampoDecimal, CampoInteiro } from '../../components/Campos.tsx';
import { LIMITES, REGRAS_EMBALAGEM_EM, fmtG, fmtMed, recomendar, type Modalidade, type Nivel, type TipoProduto } from '../../domain/vendas/embalagem.ts';
import { AbasCalcular } from '../calculadora/AbasCalcular.tsx';
import { CHAVE_EMBALAGEM, EMBALAGEM_PADRAO, useEstadoSalvo } from './estado.ts';

const TIPOS: { valor: TipoProduto; rotulo: string }[] = [
  { valor: 'flexivel', rotulo: 'Flexível' },
  { valor: 'rigido', rotulo: 'Rígido' },
  { valor: 'plano', rotulo: 'Plano' }
];
const PROTECOES: { valor: Nivel; rotulo: string; dica: string }[] = [
  { valor: 'nenhuma', rotulo: 'Nenhuma', dica: 'não quebra nem amassa (pelúcia, roupa)' },
  { valor: 'leve', rotulo: 'Leve', dica: 'papel ou preenchimento simples' },
  { valor: 'media', rotulo: 'Média', dica: '1 camada de plástico bolha' },
  { valor: 'alta', rotulo: 'Alta', dica: 'frágil: 2 camadas de plástico bolha' }
];
const MODALIDADES = Object.entries(LIMITES) as [Modalidade, (typeof LIMITES)[Modalidade]][];
const EIXOS = ['Compr.', 'Largura', 'Altura'];

export function Embalagem() {
  const [e, mudar] = useEstadoSalvo(CHAVE_EMBALAGEM, EMBALAGEM_PADRAO);
  if (!e) return <main class="tela" />;

  const pronto = e.dims.every((d) => d > 0) && e.pesoG > 0;
  const r = pronto ? recomendar({ dims: e.dims, pesoUn: e.pesoG, qtd: e.qtd, tipo: e.tipo, protecao: e.protecao, modalidade: e.modalidade }) : null;
  const m = r?.mostrar;
  const protecao = PROTECOES.find((p) => p.valor === e.protecao)!;

  return (
    <main class="tela anim-tela calc vender">
      <AbasCalcular atual="embalagem" />
      <header class="cabecalho">
        <div>
          <h1 class="titulo-grande">Embalagem de envio</h1>
          <p class="subtitulo">Peso e medidas do pacote para cadastrar na Shopee</p>
        </div>
      </header>

      <p class="rotulo">Medidas de uma peça</p>
      <div class="grade-3">
        {EIXOS.map((eixo, i) => (
          <div key={eixo}>
            <CampoDecimal
              valor={e.dims[i]}
              aoMudar={(v) => mudar({ dims: e.dims.map((d, j) => (j === i ? v : d)) })}
              rotulo={`${eixo} em centímetros`}
              sufixo="cm"
            />
            <small class="legenda-campo">{eixo}</small>
          </div>
        ))}
      </div>

      <div class="grade-2">
        <div>
          <label class="rotulo" for="em-peso">
            Peso de uma peça
          </label>
          <CampoInteiro id="em-peso" valor={e.pesoG} aoMudar={(v) => mudar({ pesoG: v })} rotulo="Peso de uma peça" sufixo="g" />
        </div>
        <div>
          <label class="rotulo" for="em-qtd">
            Peças no pacote
          </label>
          <CampoInteiro id="em-qtd" valor={e.qtd} aoMudar={(v) => mudar({ qtd: v })} rotulo="Peças no pacote" sufixo="un" max={99} minimo={1} />
        </div>
      </div>

      <p class="rotulo">Produto</p>
      <div class="chips" role="radiogroup" aria-label="Tipo de produto">
        {TIPOS.map((t) => (
          <button type="button" key={t.valor} role="radio" aria-checked={e.tipo === t.valor} class={'chip' + (e.tipo === t.valor ? ' ativo' : '')} onClick={() => mudar({ tipo: t.valor })}>
            {t.rotulo}
          </button>
        ))}
      </div>

      <p class="rotulo">Proteção</p>
      <div class="chips" role="radiogroup" aria-label="Proteção">
        {PROTECOES.map((p) => (
          <button type="button" key={p.valor} role="radio" aria-checked={e.protecao === p.valor} class={'chip' + (e.protecao === p.valor ? ' ativo' : '')} onClick={() => mudar({ protecao: p.valor })}>
            {p.rotulo}
          </button>
        ))}
      </div>
      <p class="texto-apagado">{protecao.dica}</p>

      <section class="cartao-preco" aria-live="polite">
        <p class="sobretitulo">Cadastre no anúncio</p>
        {m ? (
          <>
            <p class="cartao-preco-valor medidas">{fmtMed(m.cadastrar)}</p>
            <p class="cartao-preco-sub">
              <strong>{fmtG(m.pesos.cadastrar)}</strong> · {m.descricao}
            </p>
          </>
        ) : (
          <>
            <p class="cartao-preco-valor">—</p>
            <p class="cartao-preco-sub">Preencha as medidas e o peso.</p>
          </>
        )}
      </section>

      {m && (
        <p class="texto-apagado frete-considera">
          O frete é calculado sobre <strong>{fmtG(m.considerado)}</strong>
          {m.manda === 'tamanho' ? ' (o tamanho pesa mais que o produto)' : ''}.
        </p>
      )}

      {r?.dicas.map((d) => (
        <div key={d.id} class={'aviso-venda ' + d.nivel} role={d.nivel === 'alerta' ? 'alert' : undefined}>
          {d.texto}
        </div>
      ))}

      {r && (
        <details class="mais-detalhes">
          <summary>Comparar embalagens</summary>
          <ul class="lista-opcoes">
            {[...r.todas]
              .sort((a, b) => (a.viavel === b.viavel ? (a.viavel ? a.considerado - b.considerado : a.ordem - b.ordem) : a.viavel ? -1 : 1))
              .map((o) => (
                <li key={o.tipo} class={o === m ? 'escolhida' : ''}>
                  <strong>
                    {o.nome}
                    {o === r.recomendada && <span class="selo">melhor</span>}
                  </strong>
                  {o.viavel ? (
                    <small>
                      {fmtMed(o.cadastrar)} · {fmtG(o.pesos.cadastrar)} · frete sobre {fmtG(o.considerado)}
                    </small>
                  ) : (
                    <small>{o.motivo}</small>
                  )}
                </li>
              ))}
          </ul>
          {m && (
            <p class="texto-apagado">
              Peso: produto {fmtG(m.pesos.produtos)} + embalagem {fmtG(m.pesos.embalagem + m.pesos.bolha + m.pesos.fita)} + margem de segurança {fmtG(m.pesos.margem)}.
            </p>
          )}
        </details>
      )}

      <details class="mais-detalhes">
        <summary>
          Envio <span class="resumo-ajustes">· {LIMITES[e.modalidade].nome}</span>
        </summary>
        <div class="chips" role="radiogroup" aria-label="Modalidade de envio">
          {MODALIDADES.map(([valor, lim]) => (
            <button type="button" key={valor} role="radio" aria-checked={e.modalidade === valor} class={'chip' + (e.modalidade === valor ? ' ativo' : '')} onClick={() => mudar({ modalidade: valor })}>
              {lim.nome}
            </button>
          ))}
        </div>
      </details>

      <p class="rodape-regras">
        Estimativas ({REGRAS_EMBALAGEM_EM}): peso de caixas e envelopes comuns, peso cúbico = C × L × A ÷ 6000. Meça o pacote pronto antes de vender: medida ou peso acima do
        cadastrado viram cobrança no seu saldo.
      </p>
    </main>
  );
}
