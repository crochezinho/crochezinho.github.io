import { useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { useDadosCrono } from '../../app/dados.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { CampoInteiro } from '../../components/Campos.tsx';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { definirEstoque, excluirNovelo, listarNovelos, restaurarNovelo } from '../../db/repo.ts';
import type { Novelo } from '../../db/types.ts';
import { DescontoEmbalagem, usePesoEmbalagem } from '../../components/DescontoEmbalagem.tsx';
import { formatarEstoque, formatarGramas } from '../../domain/estoque.ts';
import { nomeDoNovelo, novelosInteiros } from '../../domain/novelos.ts';
import { contaDaEmbalagem, descontarEmbalagem } from '../../domain/pesagem.ts';
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
  const [inteiros, setInteiros] = useState(() => novelosInteiros(n));
  const [gramas, setGramas] = useState(() => Math.max(0, n.estoqueG) - novelosInteiros(n) * n.gramatura);
  const [comEmbalagem, setComEmbalagem] = useState(false);
  const [mexeuNoInterruptor, setMexeuNoInterruptor] = useState(false);
  const [abertosNovelos, setAbertosNovelos] = useState(1);
  const embalagemG = usePesoEmbalagem(n.tipo);

  const descontar = comEmbalagem && embalagemG > 0 && gramas > 0;
  const gramasLiquido = descontar ? descontarEmbalagem(gramas, abertosNovelos, embalagemG) : gramas;
  const total = inteiros * n.gramatura + gramasLiquido;

  const mudarGramas = (g: number) => {
    setGramas(g);
    if (!mexeuNoInterruptor) setComEmbalagem(true);
  };

  const salvar = async () => {
    const antes = n.estoqueG;
    await definirEstoque(n.id, total);
    aoFechar();
    toast(`Estoque: ${formatarEstoque(total)}`, { rotulo: 'Desfazer', fazer: () => void definirEstoque(n.id, antes) });
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
          <CampoInteiro id="ae-gramas" valor={gramas} aoMudar={mudarGramas} rotulo="Peso dos novelos abertos" sufixo="g" max={99999} vazioQuandoZero={false} />
        </div>
      </div>
      {gramas > 0 && (
        <DescontoEmbalagem
          tipo={n.tipo}
          embalagemG={embalagemG}
          ligado={comEmbalagem}
          aoLigar={(v) => {
            setComEmbalagem(v);
            setMexeuNoInterruptor(true);
          }}
          novelos={abertosNovelos}
          aoMudarNovelos={setAbertosNovelos}
          oQue="por novelo aberto"
        />
      )}
      <div class="resumo-fio">
        <span>
          Total
          {descontar && <small class="resumo-conta">abertos: {contaDaEmbalagem(gramas, abertosNovelos, embalagemG)} = {formatarGramas(gramasLiquido)}</small>}
        </span>
        <strong class="resumo-fio-valor">{formatarEstoque(total)}</strong>
      </div>
      <button class="botao primario largo" onClick={() => void salvar()}>
        Salvar estoque
      </button>
    </Sheet>
  );
}
