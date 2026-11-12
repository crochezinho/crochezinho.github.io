import { useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { useDadosCrono } from '../../app/dados.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { definirEstoque, excluirNovelo, listarNovelos, restaurarNovelo } from '../../db/repo.ts';
import type { Novelo } from '../../db/types.ts';
import { usePesoEmbalagem } from '../../components/DescontoEmbalagem.tsx';
import { PesagensNovelo, totalDasPesagens } from '../../components/PesagensNovelo.tsx';
import { formatarEstoque, formatarGramas } from '../../domain/estoque.ts';
import { nomeDoNovelo } from '../../domain/novelos.ts';
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

  const nome = nomeDoNovelo(n);
  const usadoEm = dados.projetos.filter((p) => p.fios.some((f) => f.noveloId === n.id));

  const mudarEstoque = (delta: number) => {
    if (n.gramatura <= 0) return;
    void definirEstoque(n.id, n.estoqueG + delta * n.gramatura);
  };

  const excluir = async () => {
    setMenu(false);
    await excluirNovelo(n.id);
    voltar(href.novelos);
    toast(`${nome} excluído`, { rotulo: 'Desfazer', fazer: () => void restaurarNovelo(n.id) });
  };

  const ficha: [string, string][] = [
    ['Gramatura', n.gramatura ? `${n.gramatura} g` : ''],
    ['Agulha sugerida', n.agulha],
    ['Lote / partida', n.lote],
    ['Preço', n.precoCentavos ? brl(n.precoCentavos) : ''],
    ['Preço por grama', n.precoCentavos && n.gramatura ? brl(precoPorGrama(n.precoCentavos, n.gramatura)) : '']
  ];

  return (
    <main class="detalhe anim-tela">
      <Capa class="detalhe-faixa novelo" tag="div" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId}>
        <button class="botao-voltar claro" aria-label="Voltar" onClick={() => voltar(href.novelos)}>
          <Icone nome="voltar" />
        </button>
        <button class="botao-voltar claro" aria-label="Mais opções" onClick={() => setMenu(true)}>
          <Icone nome="opcoes" />
        </button>
      </Capa>

      <div class="detalhe-corpo">
        <section class="detalhe-cartao">
          <h1 class="novelo-nome">{nome}</h1>
          <p class="texto-apagado">{n.marca || 'Sem marca'}</p>

          <div class="estoque">
            <p class="rotulo" style={{ marginTop: 16 }}>
              Em estoque
            </p>
            <div class="estoque-linha">
              <button class="estoque-botao" aria-label={`Tirar um novelo (${n.gramatura} g)`} disabled={n.estoqueG < n.gramatura} onClick={() => mudarEstoque(-1)}>
                <Icone nome="menos" />
              </button>
              <div class="estoque-valor" aria-live="polite">
                <strong>{formatarGramas(Math.max(0, n.estoqueG))}</strong>
                {n.gramatura > 0 && <span>± {n.gramatura} g a cada novelo</span>}
              </div>
              <button class="estoque-botao mais" aria-label={`Somar um novelo (${n.gramatura} g)`} disabled={n.gramatura <= 0} onClick={() => mudarEstoque(1)}>
                <Icone nome="mais" />
              </button>
            </div>
            <button class="link-pequeno estoque-ajustar" onClick={() => setAjustando(true)}>
              ajustar estoque
            </button>
          </div>
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
                <Capa tag="i" cor={p.capaCor} fotoId={p.fotoId} />
                {p.nome}
              </button>
            ))}
          </div>
        ) : (
          <p class="texto-apagado">Ainda não foi usado em nenhum projeto.</p>
        )}
      </div>

      <Sheet aberta={menu} aoFechar={() => setMenu(false)} titulo={nome}>
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
  const [pesos, setPesos] = useState<number[]>([0]);
  const [comEmbalagem, setComEmbalagem] = useState(true);
  const embalagemG = usePesoEmbalagem(n.tipo);
  const total = totalDasPesagens(pesos, comEmbalagem, embalagemG);
  const pesou = pesos.some((p) => p > 0);

  const salvar = async (novo: number) => {
    const antes = n.estoqueG;
    await definirEstoque(n.id, novo);
    aoFechar();
    toast(`Estoque: ${formatarEstoque(novo)}`, { rotulo: 'Desfazer', fazer: () => void definirEstoque(n.id, antes) });
  };

  return (
    <Sheet
      aberta={aberta}
      aoFechar={aoFechar}
      titulo="Ajustar estoque"
      subtitulo={`Hoje: ${formatarEstoque(n.estoqueG)}. Pese um novelo de cada vez; o total substitui o estoque.`}
    >
      <PesagensNovelo
        tipo={n.tipo}
        gramatura={n.gramatura}
        embalagemG={embalagemG}
        pesos={pesos}
        aoMudar={setPesos}
        comEmbalagem={comEmbalagem}
        aoLigar={setComEmbalagem}
        rotuloTotal="Novo estoque"
      />
      <button class="botao primario largo" disabled={!pesou} onClick={() => void salvar(total)}>
        Salvar estoque
      </button>
      {n.estoqueG > 0 && (
        <button class="link-pequeno link-centro" onClick={() => void salvar(0)}>
          acabou, zerar estoque
        </button>
      )}
    </Sheet>
  );
}
