import { useState } from 'preact/hooks';
import { useDadosCrono } from '../../app/dados.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { CampoInteiro } from '../../components/Campos.tsx';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { definirEstoque, excluirNovelo, listarNovelos, restaurarNovelo } from '../../db/repo.ts';
import type { Novelo } from '../../db/types.ts';
import { formatarEstoque } from '../../domain/estoque.ts';
import { estaAcabando, novelosInteiros } from '../../domain/novelos.ts';
import { brl, precoPorGrama } from '../../domain/preco.ts';

export function NoveloDetalhe({ id }: { id: string }) {
  const novelos = useLive(listarNovelos);
  const dados = useDadosCrono();
  const [menu, setMenu] = useState(false);
  const [ajustando, setAjustando] = useState(false);

  if (!novelos || !dados) return <main class="tela" />;
  const n = novelos.find((x) => x.id === id);
  if (!n) {
    return (
      <main class="tela tela-sem-abas">
        <header class="cabecalho-voltar">
          <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(href.novelos)}>
            <Icone nome="voltar" />
          </button>
          <h1>Novelo</h1>
        </header>
        <p class="texto-apagado">Este novelo não existe mais.</p>
      </main>
    );
  }

  const inteiros = novelosInteiros(n);
  const sobra = Math.max(0, n.estoqueG) - inteiros * n.gramatura;
  const usadoEm = dados.projetos.filter((p) => p.fios.some((f) => f.noveloId === n.id));

  const mudarEstoque = (delta: number) => {
    if (n.gramatura <= 0) return;
    void definirEstoque(n.id, n.estoqueG + delta * n.gramatura);
  };

  const excluir = async () => {
    setMenu(false);
    await excluirNovelo(n.id);
    voltar(href.novelos);
    toast(`${n.cor} excluído`, { rotulo: 'Desfazer', fazer: () => void restaurarNovelo(n.id) });
  };

  const ficha: [string, string][] = [
    ['Fibra', n.fibra],
    ['Gramatura', n.gramatura ? `${n.gramatura} g` : ''],
    ['Metragem', n.metros ? `${n.metros} m` : ''],
    ['Agulha sugerida', n.agulha],
    ['Lote / partida', n.lote],
    ['Preço', n.precoCentavos ? brl(n.precoCentavos) : ''],
    ['Preço por grama', n.precoCentavos && n.gramatura ? brl(precoPorGrama(n.precoCentavos, n.gramatura)) : '']
  ];

  return (
    <main class="detalhe anim-tela">
      <div class="detalhe-faixa novelo" style={{ background: n.capaCor }}>
        <button class="botao-voltar claro" aria-label="Voltar" onClick={() => voltar(href.novelos)}>
          <Icone nome="voltar" />
        </button>
        <button class="botao-voltar claro" aria-label="Mais opções" onClick={() => setMenu(true)}>
          <Icone nome="opcoes" />
        </button>
      </div>

      <div class="detalhe-corpo">
        <section class="detalhe-cartao">
          <h1 class="novelo-nome">{n.cor}</h1>
          <p class="texto-apagado">{[n.marca, n.linha].filter(Boolean).join(' · ') || 'Sem marca'}</p>

          <div class="estoque">
            <p class="rotulo" style={{ marginTop: 16 }}>
              Em estoque
            </p>
            <div class="estoque-linha">
              <button class="estoque-botao" aria-label="Tirar um novelo" disabled={n.estoqueG < n.gramatura} onClick={() => mudarEstoque(-1)}>
                <Icone nome="menos" />
              </button>
              <div class="estoque-valor" aria-live="polite">
                <strong>{inteiros}</strong>
                <span>
                  {inteiros === 1 ? 'novelo' : 'novelos'}
                  {sobra > 0 ? ` + ${sobra} g` : ''}
                </span>
              </div>
              <button class="estoque-botao mais" aria-label="Somar um novelo" disabled={n.gramatura <= 0} onClick={() => mudarEstoque(1)}>
                <Icone nome="mais" />
              </button>
            </div>
            <button class="link-pequeno estoque-ajustar" onClick={() => setAjustando(true)}>
              ajustar em gramas
            </button>
          </div>

          {estaAcabando(n) && (
            <div class="aviso aviso-compacto">
              <strong>Tá acabando</strong> · {n.estoqueG > 0 ? `só ${formatarEstoque(n.estoqueG, n.gramatura)}` : 'sem estoque'}
            </div>
          )}
        </section>

        <h2 class="secao-titulo">Ficha</h2>
        <dl class="ficha">
          {ficha
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>

        <h2 class="secao-titulo">Usado em projetos</h2>
        {usadoEm.length ? (
          <div class="chips">
            {usadoEm.map((p) => (
              <button key={p.id} class="chip-fio" onClick={() => ir(href.projeto(p.id))}>
                <i style={{ background: p.capaCor }} />
                {p.nome}
              </button>
            ))}
          </div>
        ) : (
          <p class="texto-apagado">Ainda não foi usado em nenhum projeto.</p>
        )}
      </div>

      <Sheet aberta={menu} aoFechar={() => setMenu(false)} titulo={n.cor}>
        <div class="menu-acoes">
          <button
            class="botao largo"
            onClick={() => {
              setMenu(false);
              ir(href.editarNovelo(n.id));
            }}
          >
            Editar novelo
          </button>
          <button class="botao perigo largo" onClick={() => void excluir()}>
            Excluir novelo
          </button>
        </div>
      </Sheet>

      <AjustarEstoque aberta={ajustando} aoFechar={() => setAjustando(false)} n={n} />
    </main>
  );
}

function AjustarEstoque(props: Parameters<typeof AjustarEstoqueAberto>[0]) {
  return props.aberta ? <AjustarEstoqueAberto {...props} /> : null;
}

function AjustarEstoqueAberto({ aberta, aoFechar, n }: { aberta: boolean; aoFechar: () => void; n: Novelo }) {
  const [inteiros, setInteiros] = useState(() => novelosInteiros(n));
  const [gramas, setGramas] = useState(() => Math.max(0, n.estoqueG) - novelosInteiros(n) * n.gramatura);

  const total = inteiros * n.gramatura + gramas;

  const salvar = async () => {
    const antes = n.estoqueG;
    await definirEstoque(n.id, total);
    aoFechar();
    toast(`Estoque: ${formatarEstoque(total, n.gramatura)}`, { rotulo: 'Desfazer', fazer: () => void definirEstoque(n.id, antes) });
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Ajustar estoque" subtitulo={`Novelos fechados de ${n.gramatura} g e o que sobrou dos abertos.`}>
      <div class="grade-2">
        <div>
          <label class="rotulo" for="ae-inteiros">
            Novelos fechados
          </label>
          <CampoInteiro id="ae-inteiros" valor={inteiros} aoMudar={setInteiros} rotulo="Novelos fechados" sufixo="un" max={9999} vazioQuandoZero={false} />
        </div>
        <div>
          <label class="rotulo" for="ae-gramas">
            Abertos (peso)
          </label>
          <CampoInteiro id="ae-gramas" valor={gramas} aoMudar={setGramas} rotulo="Peso dos novelos abertos" sufixo="g" max={99999} vazioQuandoZero={false} />
        </div>
      </div>
      <div class="resumo-fio">
        <span>Total</span>
        <strong class="resumo-fio-valor">{formatarEstoque(total, n.gramatura)}</strong>
      </div>
      <button class="botao primario largo" onClick={() => void salvar()}>
        Salvar estoque
      </button>
    </Sheet>
  );
}
