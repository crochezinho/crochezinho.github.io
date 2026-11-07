import { useDadosCrono } from '../../app/dados.ts';
import { useAgora } from '../../app/hooks.ts';
import { href, ir } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import type { Projeto } from '../../db/types.ts';
import { brl } from '../../domain/preco.ts';
import { formatarTotal, totalDoProjeto } from '../../domain/tempo.ts';

export function Projetos() {
  const dados = useDadosCrono();
  const agora = useAgora(!!dados?.aberta, 30_000);

  if (!dados) return null;
  const { projetos, sessoes, aberta } = dados;
  const fazendo = projetos.filter((p) => p.status === 'fazendo');
  const concluidos = projetos.filter((p) => p.status === 'concluido').sort((a, b) => (b.concluidoEm ?? 0) - (a.concluidoEm ?? 0));

  const linha = (p: Projeto) => (
    <li key={p.id} class="linha-projeto" onClick={() => ir(href.projeto(p.id))}>
      <span class="capa" style={{ background: p.capaCor }} />
      <span class="linha-projeto-texto">
        <strong>{p.nome}</strong>
        <small>
          {[p.tipo, formatarTotal(totalDoProjeto(sessoes, p.id, agora)), aberta?.projetoId === p.id ? 'rodando' : '']
            .filter(Boolean)
            .join(' · ')}
        </small>
      </span>
      {p.precoCentavos !== null && <span class="linha-preco">{brl(p.precoCentavos)}</span>}
    </li>
  );

  return (
    <main class="tela anim-tela">
      <header class="cabecalho">
        <h1 class="titulo-grande">Projetos</h1>
        <span class="contador">{projetos.length}</span>
      </header>

      {projetos.length === 0 ? (
        <div class="vazio">
          <h2>Nenhum projeto ainda</h2>
          <p>Toque no + para criar o primeiro.</p>
        </div>
      ) : (
        <>
          {fazendo.length > 0 && (
            <>
              <h2 class="secao-titulo" style={{ marginTop: 0 }}>
                Em andamento
              </h2>
              <ul class="lista">{fazendo.map(linha)}</ul>
            </>
          )}
          {concluidos.length > 0 && (
            <>
              <h2 class="secao-titulo">Concluídos</h2>
              <ul class="lista concluidos">{concluidos.map(linha)}</ul>
            </>
          )}
        </>
      )}

      <button class="fab" aria-label="Novo projeto" onClick={() => ir(href.novoProjeto)}>
        <Icone nome="mais" tamanho={26} espessura={2.4} />
      </button>
    </main>
  );
}
