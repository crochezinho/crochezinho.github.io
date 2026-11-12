import { useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { href, ir } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { useLive } from '../../db/hooks.ts';
import { lerConfig, listarNovelos, listarProjetos, salvarConfig } from '../../db/repo.ts';
import type { Novelo } from '../../db/types.ts';
import { formatarEstoque, formatarGramas } from '../../domain/estoque.ts';
import { alternarSelecao, MAX_COMBINAR } from '../../domain/combinar.ts';
import { agrupar, contarUso, filtrar, type Agrupamento } from '../../domain/novelos.ts';

const OPCOES: { valor: Agrupamento; rotulo: string }[] = [
  { valor: 'tipo', rotulo: 'Por tipo' },
  { valor: 'marca', rotulo: 'Por marca' }
];

export function Novelos() {
  const novelos = useLive(listarNovelos);
  const projetos = useLive(listarProjetos);
  const agruparSalvo = useLive(() => lerConfig<Agrupamento>('novelos.agrupar', 'tipo'));
  const [busca, setBusca] = useState('');
  const [escolhidos, setEscolhidos] = useState<string[] | null>(null);

  if (!novelos || !agruparSalvo || !projetos) return null;
  const uso = contarUso(projetos);
  const por: Agrupamento = agruparSalvo === 'marca' ? 'marca' : 'tipo';
  const visiveis = filtrar(novelos, busca);
  const totalG = novelos.reduce((s, n) => s + Math.max(0, n.estoqueG), 0);

  return (
    <main class="tela anim-tela">
      <header class="cabecalho">
        <div>
          <h1 class="titulo-grande">Meus novelos</h1>
          {novelos.length > 0 && (
            <p class="subtitulo">
              {fios(novelos.length)} · {formatarGramas(totalG)}
            </p>
          )}
        </div>
      </header>

      {novelos.length === 0 ? (
        <div class="vazio">
          <h2>Nenhum novelo ainda</h2>
          <p>Toque no + para cadastrar o primeiro.</p>
        </div>
      ) : (
        <>
          <div class="busca">
            <input
              class="campo"
              type="search"
              placeholder="Buscar cor, marca, tipo…"
              value={busca}
              onInput={(e) => setBusca(e.currentTarget.value)}
              aria-label="Buscar novelos"
            />
          </div>

          <div class="filtros">
            <div class="segmentado compacto" role="tablist" aria-label="Agrupar por">
              {OPCOES.map((o) => (
                <button key={o.valor} role="tab" aria-selected={por === o.valor} class={por === o.valor ? 'ativo' : ''} onClick={() => void salvarConfig('novelos.agrupar', o.valor)}>
                  {o.rotulo}
                </button>
              ))}
            </div>
            {novelos.length > 1 && (
              <button class={'botao-combinar' + (escolhidos ? ' ativo' : '')} onClick={() => setEscolhidos(escolhidos ? null : [])}>
                <Icone nome={escolhidos ? 'fechar' : 'combinar'} tamanho={18} />
                {escolhidos ? 'Cancelar' : 'Combinar'}
              </button>
            )}
          </div>
          {escolhidos && <p class="combinar-dica">Toque em até {MAX_COMBINAR} fios para ver lado a lado.</p>}

          {visiveis.length === 0 ? (
            <div class="vazio">
              <h2>Nada encontrado</h2>
              <p>Tente outra busca.</p>
            </div>
          ) : (
            agrupar(visiveis, por, uso).map((g) => {
              const qtd = g.sub.reduce((t, s) => t + s.itens.length, 0);
              return (
                <section key={g.nome} class="grupo">
                  <div class="grupo-cabecalho">
                    <h2>{g.nome}</h2>
                    <span class="grupo-resumo">
                      {fios(qtd)} · {formatarGramas(g.totalG)}
                    </span>
                  </div>
                  {g.sub.map((s) => (
                    <div key={s.nome}>
                      {(s.nome || g.sub.length > 1) && <h3 class="grupo-linha">{s.nome || (por === 'marca' ? 'Sem tipo' : 'Sem marca')}</h3>}
                      <div class="grade-novelos">
                        {s.itens.map((n) => (
                          <BlocoNovelo
                            key={n.id}
                            n={n}
                            escolhidos={escolhidos}
                            aoEscolher={() => escolhidos && setEscolhidos(alternarSelecao(escolhidos, n.id))}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              );
            })
          )}
        </>
      )}

      {escolhidos ? (
        <div class="barra-combinar">
          <button class="botao primario largo" disabled={escolhidos.length < 2} onClick={() => ir(href.combinar(escolhidos))}>
            <Icone nome="combinar" />
            {escolhidos.length < 2 ? escolhidos.length === 0 ? 'Escolha dois fios' : 'Escolha mais um fio' : `Ver ${escolhidos.length} lado a lado`}
          </button>
        </div>
      ) : (
        <button class="fab" aria-label="Novo novelo" onClick={() => ir(href.novoNovelo)}>
          <Icone nome="mais" tamanho={26} espessura={2.4} />
        </button>
      )}
    </main>
  );
}

const fios = (q: number) => `${q} ${q === 1 ? 'fio' : 'fios'}`;

function estoqueDoBloco(n: Novelo): string {
  const q = n.unidades.length;
  return q ? `${q} ${q === 1 ? 'novelo' : 'novelos'} · ${formatarEstoque(n.estoqueG)}` : 'sem estoque';
}

function BlocoNovelo({ n, escolhidos, aoEscolher }: { n: Novelo; escolhidos: string[] | null; aoEscolher: () => void }) {
  if (escolhidos) {
    const posicao = escolhidos.indexOf(n.id) + 1;
    const cheio = posicao === 0 && escolhidos.length >= MAX_COMBINAR;
    return (
      <button class={'bloco-novelo escolhendo' + (posicao ? ' escolhido' : '') + (cheio ? ' cheio' : '')} aria-pressed={posicao > 0} onClick={aoEscolher}>
        <Capa class="bloco-cor" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId}>
          <span class="selo-escolha" aria-hidden="true">{posicao || ''}</span>
        </Capa>
        <strong>{n.cor}</strong>
        <small>{estoqueDoBloco(n)}</small>
      </button>
    );
  }
  return (
    <button class="bloco-novelo" onClick={() => ir(href.novelo(n.id))}>
      <Capa class="bloco-cor" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId} />
      <strong>{n.cor}</strong>
      <small>{estoqueDoBloco(n)}</small>
    </button>
  );
}
