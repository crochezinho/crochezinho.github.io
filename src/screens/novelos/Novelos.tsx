import { useState } from 'preact/hooks';
import { href, ir } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { useLive } from '../../db/hooks.ts';
import { lerConfig, listarNovelos, salvarConfig } from '../../db/repo.ts';
import type { Novelo } from '../../db/types.ts';
import { formatarEstoque } from '../../domain/estoque.ts';
import { agruparPorCor, agruparPorMarca, estaAcabando, filtrar, novelosInteiros } from '../../domain/novelos.ts';

type Agrupar = 'marca' | 'cor';

export function Novelos() {
  const novelos = useLive(listarNovelos);
  const agruparSalvo = useLive(() => lerConfig<Agrupar>('novelos.agrupar', 'marca'));
  const [busca, setBusca] = useState('');
  const [soAcabando, setSoAcabando] = useState(false);

  if (!novelos || !agruparSalvo) return null;
  const agrupar = agruparSalvo;
  const visiveis = filtrar(novelos, busca, soAcabando);
  const totalInteiros = novelos.reduce((s, n) => s + novelosInteiros(n), 0);
  const acabando = novelos.filter(estaAcabando).length;

  const bloco = (n: Novelo) => <BlocoNovelo key={n.id} n={n} />;

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
              placeholder="Buscar cor, marca, fibra…"
              value={busca}
              onInput={(e) => setBusca(e.currentTarget.value)}
              aria-label="Buscar novelos"
            />
          </div>

          <div class="filtros">
            <div class="segmentado compacto" role="tablist" aria-label="Agrupar por">
              {(['marca', 'cor'] as const).map((a) => (
                <button key={a} role="tab" aria-selected={agrupar === a} class={agrupar === a ? 'ativo' : ''} onClick={() => void salvarConfig('novelos.agrupar', a)}>
                  {a === 'marca' ? 'Por marca' : 'Por cor'}
                </button>
              ))}
            </div>
            <button class={'chip-filtro' + (soAcabando ? ' ativo' : '')} aria-pressed={soAcabando} onClick={() => setSoAcabando(!soAcabando)}>
              <i />
              Acabando{acabando ? ` (${acabando})` : ''}
            </button>
          </div>

          {visiveis.length === 0 ? (
            <div class="vazio">
              <h2>Nada encontrado</h2>
              <p>{soAcabando && !busca ? 'Nenhum novelo acabando. Estoque tranquilo!' : 'Tente outra busca.'}</p>
            </div>
          ) : agrupar === 'marca' ? (
            agruparPorMarca(visiveis).map((g) => (
              <section key={g.marca} class="grupo">
                <div class="grupo-cabecalho">
                  <h2>{g.marca}</h2>
                  <span class="grupo-resumo">
                    {g.linhas.length} {g.linhas.length === 1 ? 'linha' : 'linhas'} · {g.totalInteiros} {g.totalInteiros === 1 ? 'novelo' : 'novelos'}
                  </span>
                </div>
                {g.linhas.map((l) => (
                  <div key={l.linha}>
                    {l.linha && <h3 class="grupo-linha">{l.linha}</h3>}
                    <div class="grade-novelos">{l.itens.map(bloco)}</div>
                  </div>
                ))}
              </section>
            ))
          ) : (
            agruparPorCor(visiveis).map((g) => (
              <section key={g.familia} class="grupo">
                <div class="grupo-cabecalho">
                  <h2>{g.familia}</h2>
                  <span class="grupo-resumo">
                    {g.itens.length} {g.itens.length === 1 ? 'tom' : 'tons'}
                  </span>
                </div>
                <div class="grade-novelos">{g.itens.map(bloco)}</div>
              </section>
            ))
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
  const pouco = estaAcabando(n);
  return (
    <button class="bloco-novelo" onClick={() => ir(href.novelo(n.id))}>
      <span class="bloco-cor" style={{ background: n.capaCor }}>
        <span class={'bloco-qtd' + (pouco ? ' pouco' : '')}>{inteiros > 0 ? inteiros : `${Math.max(0, n.estoqueG)} g`}</span>
      </span>
      <strong>{n.cor}</strong>
      <small>{formatarEstoque(n.estoqueG, n.gramatura)}</small>
    </button>
  );
}
