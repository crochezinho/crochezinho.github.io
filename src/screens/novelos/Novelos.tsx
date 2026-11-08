import { useState } from 'preact/hooks';
import { estiloCapa } from '../../app/capa.ts';
import { href, ir } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { useLive } from '../../db/hooks.ts';
import { lerConfig, listarNovelos, listarProjetos, salvarConfig } from '../../db/repo.ts';
import type { Novelo } from '../../db/types.ts';
import { formatarEstoque } from '../../domain/estoque.ts';
import { agrupar, contarUso, filtrar, novelosInteiros, type Agrupamento } from '../../domain/novelos.ts';

const OPCOES: { valor: Agrupamento; rotulo: string }[] = [
  { valor: 'tipo', rotulo: 'Por tipo' },
  { valor: 'marca', rotulo: 'Por marca' }
];

export function Novelos() {
  const novelos = useLive(listarNovelos);
  const projetos = useLive(listarProjetos);
  const agruparSalvo = useLive(() => lerConfig<Agrupamento>('novelos.agrupar', 'tipo'));
  const [busca, setBusca] = useState('');

  if (!novelos || !agruparSalvo || !projetos) return null;
  const uso = contarUso(projetos);
  const por: Agrupamento = agruparSalvo === 'marca' ? 'marca' : 'tipo';
  const visiveis = filtrar(novelos, busca);
  const totalInteiros = novelos.reduce((s, n) => s + novelosInteiros(n), 0);
  const nomeSub = (q: number) => (por === 'marca' ? (q === 1 ? 'tipo' : 'tipos') : q === 1 ? 'marca' : 'marcas');

  return (
    <main class="tela anim-tela">
      <header class="cabecalho">
        <div>
          <h1 class="titulo-grande">Meus novelos</h1>
          {novelos.length > 0 && (
            <p class="subtitulo">
              {novelos.length} {novelos.length === 1 ? 'cor' : 'cores'} · {totalInteiros} {totalInteiros === 1 ? 'novelo' : 'novelos'}
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
          </div>

          {visiveis.length === 0 ? (
            <div class="vazio">
              <h2>Nada encontrado</h2>
              <p>Tente outra busca.</p>
            </div>
          ) : (
            agrupar(visiveis, por, uso).map((g) => {
              const subs = g.sub.filter((s) => s.nome).length;
              return (
                <section key={g.nome} class="grupo">
                  <div class="grupo-cabecalho">
                    <h2>{g.nome}</h2>
                    <span class="grupo-resumo">
                      {subs > 0 && `${subs} ${nomeSub(subs)} · `}
                      {g.totalInteiros} {g.totalInteiros === 1 ? 'novelo' : 'novelos'}
                    </span>
                  </div>
                  {g.sub.map((s) => (
                    <div key={s.nome}>
                      {(s.nome || g.sub.length > 1) && <h3 class="grupo-linha">{s.nome || (por === 'marca' ? 'Sem tipo' : 'Sem marca')}</h3>}
                      <div class="grade-novelos">
                        {s.itens.map((n) => (
                          <BlocoNovelo key={n.id} n={n} />
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

      <button class="fab" aria-label="Novo novelo" onClick={() => ir(href.novoNovelo)}>
        <Icone nome="mais" tamanho={26} espessura={2.4} />
      </button>
    </main>
  );
}

function BlocoNovelo({ n }: { n: Novelo }) {
  const inteiros = novelosInteiros(n);
  return (
    <button class="bloco-novelo" onClick={() => ir(href.novelo(n.id))}>
      <span class="bloco-cor" style={estiloCapa(n.capaCor, n.textura)}>
        <span class="bloco-qtd">{inteiros > 0 ? inteiros : `${Math.max(0, n.estoqueG)} g`}</span>
      </span>
      <strong>{n.cor}</strong>
      <small>{formatarEstoque(n.estoqueG, n.gramatura)}</small>
    </button>
  );
}
