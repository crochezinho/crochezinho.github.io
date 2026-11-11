import { useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { useDadosCrono, projetoDaVez } from '../../app/dados.ts';
import { useAgora, useTelaAcesa } from '../../app/hooks.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { iniciar, pausar } from '../../db/repo.ts';
import { duracao, formatarSessao, formatarTotal, totalDoProjeto } from '../../domain/tempo.ts';
import { AjustarTempo } from './AjustarTempo.tsx';

export function Cronometro({ projetoId }: { projetoId: string | null }) {
  const dados = useDadosCrono();
  const [trocando, setTrocando] = useState(false);
  const [ajustando, setAjustando] = useState(false);

  const projeto = dados && (projetoId ? dados.projetos.find((p) => p.id === projetoId) : projetoDaVez(dados));
  const rodandoAqui = !!projeto && dados?.aberta?.projetoId === projeto.id;
  const agora = useAgora(rodandoAqui);
  useTelaAcesa(rodandoAqui);

  if (!dados) return <main class="crono" />;
  if (!projeto) {
    return (
      <main class="crono">
        <BarraTopo titulo="Cronômetro" />
        <p class="crono-vazio">Nenhum projeto encontrado.</p>
      </main>
    );
  }

  const { projetos, sessoes, aberta } = dados;
  const outroRodando = aberta && !rodandoAqui ? projetos.find((p) => p.id === aberta.projetoId) : undefined;
  const temSessao = sessoes.some((s) => s.projetoId === projeto.id && !s.ajuste);

  const alternar = async () => {
    if (rodandoAqui) return pausar();
    await iniciar(projeto.id);
    if (outroRodando) toast(`${outroRodando.nome} pausado`);
  };

  return (
    <main class="crono anim-tela">
      <BarraTopo
        titulo={projeto.nome}
        sub={projeto.agulha || undefined}
        direita={
          <button class="crono-icone" aria-label="Trocar de projeto" onClick={() => setTrocando(true)}>
            <Icone nome="trocar" />
          </button>
        }
      />

      <section class="crono-centro" aria-live="polite">
        <p class="crono-rotulo">tempo do projeto</p>
        <p class="crono-total">{formatarTotal(totalDoProjeto(sessoes, projeto.id, agora))}</p>
        <p class="crono-sessao">
          {rodandoAqui && aberta ? `esta sessão: ${formatarSessao(duracao(aberta, agora))}` : ' '}
        </p>
        <p class={'crono-status' + (rodandoAqui ? ' rodando' : '')}>
          <span class="ponto" />
          {rodandoAqui ? 'Em andamento' : outroRodando ? `Rodando: ${outroRodando.nome}` : 'Pausado'}
        </p>
      </section>

      <div class="crono-acoes">
        <button class={'botao crono-principal' + (rodandoAqui ? ' pausar' : '')} onClick={() => void alternar()}>
          <Icone nome={rodandoAqui ? 'pause' : 'play'} tamanho={22} />
          {rodandoAqui ? 'Pausar' : temSessao ? 'Retomar' : 'Começar'}
        </button>
        <div class="crono-secundarios">
          <button class="botao crono-secundario" onClick={() => setAjustando(true)}>
            <Icone nome="relogio" tamanho={20} />
            Ajustar tempo
          </button>
          <button class="botao crono-secundario" onClick={() => ir(href.calcularPara(projeto.id))}>
            <Icone nome="calcular" tamanho={20} />
            Calcular preço
          </button>
        </div>
      </div>

      <Sheet aberta={trocando} aoFechar={() => setTrocando(false)} titulo="Trocar de projeto">
        <ul class="lista">
          {projetos
            .filter((p) => p.status === 'fazendo')
            .map((p) => (
              <li
                key={p.id}
                class={'linha-projeto' + (p.id === projeto.id ? ' selecionada' : '')}
                onClick={() => {
                  setTrocando(false);
                  if (p.id !== projeto.id) ir(href.crono(p.id), true);
                }}
              >
                <Capa class="capa" cor={p.capaCor} fotoId={p.fotoId} />
                <span class="linha-projeto-texto">
                  <strong>{p.nome}</strong>
                  <small>
                    {formatarTotal(totalDoProjeto(sessoes, p.id, agora))}
                    {aberta?.projetoId === p.id ? ' · rodando' : ''}
                  </small>
                </span>
              </li>
            ))}
        </ul>
      </Sheet>

      <AjustarTempo
        aberta={ajustando}
        aoFechar={() => setAjustando(false)}
        projetoId={projeto.id}
        sessoes={sessoes}
        agora={agora}
      />
    </main>
  );
}

function BarraTopo({ titulo, sub, direita }: { titulo: string; sub?: string; direita?: preact.ComponentChildren }) {
  return (
    <header class="crono-topo">
      <button class="crono-icone" aria-label="Voltar" onClick={() => voltar(href.inicio)}>
        <Icone nome="voltar" />
      </button>
      <div class="crono-topo-texto">
        <h1>{titulo}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {direita ?? <span class="crono-icone-espaco" />}
    </header>
  );
}
