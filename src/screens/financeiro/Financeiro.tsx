import { useDadosCrono } from '../../app/dados.ts';
import { diaCurto } from '../../app/datas.ts';
import { divisaoDe, entreguesNoMes, useBaseFinanceira } from '../../app/financeiro.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { mesDe, mesVizinho, nomeDoMes, somar } from '../../domain/financeiro.ts';
import { brl } from '../../domain/preco.ts';

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function Financeiro({ mes: mesRota }: { mes: string | null }) {
  const dados = useDadosCrono();
  const base = useBaseFinanceira();
  if (!dados || !base) return <main class="tela" />;

  const agora = Date.now();
  const atual = mesDe(agora);
  const mes = mesRota && /^\d{4}-\d{2}$/.test(mesRota) && mesRota <= atual ? mesRota : atual;
  const entregas = dados.projetos.filter((p) => p.entregueEm);
  const primeiro = entregas.reduce((m, p) => (mesDe(p.entregueEm!) < m ? mesDe(p.entregueEm!) : m), atual);
  const doMes = entreguesNoMes(dados.projetos, mes).map((p) => ({ p, d: divisaoDe(p, dados.sessoes, base, agora) }));
  const comValor = doMes.filter((x) => x.d.cobrado > 0);
  const r = somar(comValor.map((x) => x.d));
  const semValor = doMes.length - comValor.length;
  const trocar = (passo: number) => ir(href.financeiro(mesVizinho(mes, passo)), true);

  return (
    <main class="tela tela-sem-abas anim-tela financeiro">
      <header class="cabecalho-voltar">
        <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(href.inicio)}>
          <Icone nome="voltar" />
        </button>
        <h1>Financeiro</h1>
      </header>

      <div class="financeiro-mes">
        <button class="botao-voltar" aria-label="Mês anterior" disabled={mes <= primeiro} onClick={() => trocar(-1)}>
          <Icone nome="voltar" />
        </button>
        <strong>{maiuscula(nomeDoMes(mes, true))}</strong>
        <button class="botao-voltar seta-direita" aria-label="Próximo mês" disabled={mes >= atual} onClick={() => trocar(1)}>
          <Icone nome="voltar" />
        </button>
      </div>

      {comValor.length === 0 ? (
        <section class="cartao-vazio">
          <h2>Nenhuma venda em {nomeDoMes(mes)}</h2>
          <p>Quando você marcar uma encomenda como entregue, ela entra no mês da entrega.</p>
        </section>
      ) : (
        <>
          <section class="cartao-guardar">
            <p class="sobretitulo">Para guardar</p>
            <div class="guardar-linha">
              <span>Salário</span>
              <strong>{brl(r.salario)}</strong>
            </div>
            <div class="guardar-linha">
              <span>Material</span>
              <strong>{brl(r.material)}</strong>
            </div>
          </section>

          <div class="cartao-lista">
            <div class="linha-campo">
              <span class="linha-campo-texto">
                <strong>Recebido</strong>
                <small>
                  {r.entregas === 1 ? '1 encomenda entregue' : `${r.entregas} encomendas entregues`}
                  {r.taxas > 0 ? `, já sem ${brl(r.taxas)} de taxas da Shopee` : ''}
                </small>
              </span>
              <span class="linha-valor">{brl(r.recebido)}</span>
            </div>
            <div class={'linha-campo linha-total' + (r.lucro < 0 ? ' negativo' : '')}>
              <span class="linha-campo-texto">
                <strong>Lucro</strong>
                <small>o que sobrou depois do material e do salário</small>
              </span>
              <span class="linha-valor">{brl(r.lucro)}</span>
            </div>
          </div>
        </>
      )}

      {doMes.length > 0 && (
        <section>
          <h2 class="secao-titulo">Entregues em {nomeDoMes(mes)}</h2>
          <ul class="lista">
            {doMes.map(({ p, d }) => (
              <li key={p.id} class="linha-venda" onClick={() => ir(href.projeto(p.id))}>
                <div class="linha-venda-topo">
                  <span class="linha-projeto-texto">
                    <strong>{p.nome}</strong>
                    <small>{[p.cliente && `para ${p.cliente}`, `entregue ${diaCurto(p.entregueEm!)}`].filter(Boolean).join(' · ')}</small>
                  </span>
                  <span class="linha-valor">{d.cobrado > 0 ? brl(d.recebido) : '—'}</span>
                </div>
                {d.cobrado > 0 ? (
                  <dl class="linha-venda-partes">
                    <div>
                      <dt>Material</dt>
                      <dd>{brl(d.material)}</dd>
                    </div>
                    <div>
                      <dt>Salário</dt>
                      <dd>{brl(d.salario)}</dd>
                    </div>
                    <div class={d.lucro < 0 ? 'negativo' : ''}>
                      <dt>Lucro</dt>
                      <dd>{brl(d.lucro)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p class="texto-apagado">Sem valor anotado. Toque para anotar.</p>
                )}
              </li>
            ))}
          </ul>
          {semValor > 0 && (
            <p class="texto-apagado">
              {semValor === 1 ? '1 encomenda está sem valor e não entra na conta.' : `${semValor} encomendas estão sem valor e não entram na conta.`}
            </p>
          )}
        </section>
      )}

      <p class="dica-campo financeiro-nota">
        Cada encomenda conta no mês em que foi entregue, com o sinal junto. O salário é o tempo do cronômetro vezes o seu valor por hora no dia da entrega.
      </p>
    </main>
  );
}
