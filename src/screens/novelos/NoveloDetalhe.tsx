import { useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { useDadosCrono } from '../../app/dados.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { CampoInteiro } from '../../components/Campos.tsx';
import { DescontoEmbalagem, usePesoEmbalagem } from '../../components/DescontoEmbalagem.tsx';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { VerFoto } from '../../components/VerFoto.tsx';
import { toast } from '../../components/toast.tsx';
import { novoId } from '../../db/db.ts';
import { useLive } from '../../db/hooks.ts';
import { definirUnidades, excluirNovelo, listarNovelos, mudarUnidades, restaurarNovelo } from '../../db/repo.ts';
import type { Novelo } from '../../db/types.ts';
import { unidadesEmUso, type UsoDaUnidade } from '../../domain/fios.ts';
import { formatarEstoque, formatarGramas } from '../../domain/estoque.ts';
import { nomeDoNovelo } from '../../domain/novelos.ts';
import { contaDaEmbalagem, descontarEmbalagem } from '../../domain/pesagem.ts';
import { brl, precoPorGrama } from '../../domain/preco.ts';
import { novaUnidade, ordenarUnidades, pesarUnidade, rotuloUnidade, type Unidade } from '../../domain/unidades.ts';

export function NoveloDetalhe({ id }: { id: string }) {
  const novelos = useLive(listarNovelos);
  const dados = useDadosCrono();
  const [menu, setMenu] = useState(false);
  const [vendoFoto, setVendoFoto] = useState(false);
  const [pesando, setPesando] = useState<{ unidade: Unidade | null } | null>(null);

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
  const emUso = unidadesEmUso(dados.projetos);
  const unidades = ordenarUnidades(n.unidades);

  const mudar = async (texto: string, fn: (us: Unidade[], piso: number) => Unidade[]) => {
    const antes = await mudarUnidades(n.id, fn);
    if (antes) toast(texto, { rotulo: 'Desfazer', fazer: () => void definirUnidades(n.id, antes) });
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
        {n.fotoId && <button class="faixa-ver-foto" aria-label="Ver foto" onClick={() => setVendoFoto(true)} />}
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
            <div class="estoque-valor" aria-live="polite">
              <strong>{formatarGramas(Math.max(0, n.estoqueG))}</strong>
            </div>

            {unidades.length > 0 ? (
              <ul class="unidades">
                {unidades.map((u) => (
                  <li key={u.id}>
                    <button class="unidade" onClick={() => setPesando({ unidade: u })} aria-label={`Novelo ${rotuloUnidade(u)}: ${u.pesoG} g. Pesar ou marcar que acabou`}>
                      <span class="unidade-numero">{rotuloUnidade(u)}</span>
                      <span class="unidade-texto">
                        {u.fechado ? 'fechado' : 'aberto'}
                        {emUso.has(u.id) && <small>em uso: {emUso.get(u.id)!.projeto}</small>}
                      </span>
                      <strong>{formatarGramas(u.pesoG)}</strong>
                      <Icone nome="seta" tamanho={16} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p class="texto-apagado">Nenhum novelo em estoque.</p>
            )}

            <div class="unidades-acoes">
              <button
                class="botao"
                disabled={n.gramatura <= 0}
                onClick={() => void mudar(`Novelo fechado de ${n.gramatura} g adicionado`, (us, piso) => novaUnidade(us, n.gramatura, true, novoId(), piso))}
              >
                <Icone nome="mais" tamanho={16} /> Fechado{n.gramatura > 0 ? ` (${n.gramatura} g)` : ''}
              </button>
              <button class="botao" onClick={() => setPesando({ unidade: null })}>
                <Icone nome="mais" tamanho={16} /> Aberto (pesar)
              </button>
            </div>
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

      {vendoFoto && n.fotoId && <VerFoto fotoId={n.fotoId} titulo={nome} aoFechar={() => setVendoFoto(false)} />}
      {pesando && (
        <PesarUnidade
          n={n}
          unidade={pesando.unidade}
          emUso={pesando.unidade ? emUso.get(pesando.unidade.id) : undefined}
          aoFechar={() => setPesando(null)}
          aoSalvar={(texto, fn) => {
            setPesando(null);
            void mudar(texto, fn);
          }}
        />
      )}
    </main>
  );
}

function PesarUnidade({
  n,
  unidade,
  emUso,
  aoFechar,
  aoSalvar
}: {
  n: Novelo;
  unidade: Unidade | null;
  emUso?: UsoDaUnidade;
  aoFechar: () => void;
  aoSalvar: (texto: string, fn: (us: Unidade[], piso: number) => Unidade[]) => void;
}) {
  const [balanca, setBalanca] = useState<number | null>(null);
  const [comEmbalagem, setComEmbalagem] = useState(true);
  const embalagemG = usePesoEmbalagem(n.tipo);
  const emb = comEmbalagem ? embalagemG : 0;
  const liquido = balanca === null ? null : descontarEmbalagem(balanca, 1, emb);
  const titulo = unidade ? `${nomeDoNovelo(n)} ${rotuloUnidade(unidade)}` : 'Adicionar novelo aberto';
  const subtitulo = unidade
    ? `Hoje: ${formatarEstoque(unidade.pesoG)} (${unidade.fechado ? 'fechado' : 'aberto'}). Pese de novo ou marque que acabou.`
    : `Um novelo ${nomeDoNovelo(n)} aberto que ainda não estava no estoque.`;
  const diferenca = unidade && liquido !== null ? liquido - unidade.pesoG : 0;

  const salvar = () => {
    if (liquido === null || liquido <= 0) return;
    if (unidade) aoSalvar(`${rotuloUnidade(unidade)} agora tem ${formatarGramas(liquido)}`, (us) => pesarUnidade(us, unidade.id, liquido));
    else aoSalvar(`Novelo de ${formatarGramas(liquido)} adicionado`, (us, piso) => novaUnidade(us, liquido, false, novoId(), piso));
  };

  return (
    <Sheet aberta aoFechar={aoFechar} titulo={titulo} subtitulo={subtitulo}>
      {emUso &&
        (emUso.aPesar ? (
          <p class="aviso-uso">Em uso no projeto {emUso.projeto}, para pesar no fim. O peso de quando o projeto começou continua guardado nele.</p>
        ) : (
          <div class="aviso-uso">
            <p>
              Em uso no projeto {emUso.projeto} com {emUso.gramas} g por peça. Ao concluir, essas gramas saem do estoque. Se você está pesando porque usou deste
              novelo no projeto, troque o fio dele para <strong>Pesar no fim</strong>, senão conta duas vezes.
            </p>
            <button type="button" class="link-pequeno" onClick={() => ir(href.projeto(emUso.projetoId))}>
              abrir o projeto
            </button>
          </div>
        ))}
      <label class="rotulo" for="un-balanca">
        Peso na balança
      </label>
      <CampoInteiro id="un-balanca" permiteVazio autoFoco valor={balanca} aoMudar={setBalanca} rotulo="Peso na balança" sufixo="g" max={99999} />
      <DescontoEmbalagem tipo={n.tipo} embalagemG={embalagemG} ligado={comEmbalagem} aoLigar={setComEmbalagem} />
      <div class="resumo-fio">
        <span>
          {unidade ? 'Fica com' : 'Entra no estoque'}
          {balanca !== null && balanca > 0 && emb > 0 && <small class="resumo-conta">{contaDaEmbalagem(balanca, 1, emb)}</small>}
        </span>
        <strong class="resumo-fio-valor">
          {liquido === null ? (
            '—'
          ) : unidade ? (
            <>
              {unidade.pesoG} g → {formatarGramas(liquido)}
              {diferenca !== 0 && <small class="resumo-diferenca"> ({diferenca > 0 ? '+' : '−'}{Math.abs(diferenca)} g)</small>}
            </>
          ) : (
            formatarGramas(liquido)
          )}
        </strong>
      </div>
      <button class="botao primario largo" disabled={liquido === null || liquido <= 0} onClick={salvar}>
        {unidade ? 'Salvar peso' : 'Adicionar ao estoque'}
      </button>
      {unidade && (
        <button class="link-pequeno link-centro" onClick={() => aoSalvar(`${rotuloUnidade(unidade)} acabou`, (us) => pesarUnidade(us, unidade.id, 0))}>
          este novelo acabou
        </button>
      )}
    </Sheet>
  );
}
