import { useState } from 'preact/hooks';
import { useDadosCrono } from '../../app/dados.ts';
import { diaCurto } from '../../app/datas.ts';
import { useAgora } from '../../app/hooks.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { Interruptor } from '../../components/Interruptor.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { concluirProjeto, excluirProjeto, iniciar, listarNovelos, reabrirProjeto, restaurarProjeto } from '../../db/repo.ts';
import type { Novelo, Projeto } from '../../db/types.ts';
import { calcularDesconto, formatarEstoque } from '../../domain/estoque.ts';
import { brl } from '../../domain/preco.ts';
import { formatarTotal, totalDoProjeto } from '../../domain/tempo.ts';

export function ProjetoDetalhe({ id }: { id: string }) {
  const dados = useDadosCrono();
  const novelos = useLive(listarNovelos);
  const [menu, setMenu] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);

  const projeto = dados?.projetos.find((p) => p.id === id);
  const rodando = !!projeto && dados?.aberta?.projetoId === projeto.id;
  const agora = useAgora(rodando, 30_000);

  if (!dados || !novelos) return <main class="tela" />;
  if (!projeto) {
    return (
      <main class="tela tela-sem-abas">
        <header class="cabecalho-voltar">
          <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(href.projetos)}>
            <Icone nome="voltar" />
          </button>
          <h1>Projeto</h1>
        </header>
        <p class="texto-apagado">Este projeto não existe mais.</p>
      </main>
    );
  }

  const concluido = projeto.status === 'concluido';
  const temSessao = dados.sessoes.some((s) => s.projetoId === projeto.id && !s.ajuste);
  const novelo = (nid: string) => novelos.find((n) => n.id === nid);
  const detalhes = [projeto.tipo, projeto.agulha, concluido && projeto.concluidoEm ? `concluído em ${diaCurto(projeto.concluidoEm)}` : `iniciado em ${diaCurto(projeto.criadoEm)}`]
    .filter(Boolean)
    .join(' · ');

  const excluir = async () => {
    setMenu(false);
    await excluirProjeto(projeto.id);
    voltar(href.projetos);
    toast(`${projeto.nome} excluído`, { rotulo: 'Desfazer', fazer: () => void restaurarProjeto(projeto.id) });
  };

  const abrirCrono = async () => {
    if (!rodando) {
      const outro = dados.aberta && dados.projetos.find((p) => p.id === dados.aberta!.projetoId);
      await iniciar(projeto.id);
      if (outro) toast(`${outro.nome} pausado`);
    }
    ir(href.crono(projeto.id));
  };

  return (
    <main class="detalhe anim-tela">
      <div class="detalhe-faixa" style={{ background: `linear-gradient(160deg, ${projeto.capaCor}, ${projeto.capaCor}cc)` }}>
        <button class="botao-voltar claro" aria-label="Voltar" onClick={() => voltar(href.projetos)}>
          <Icone nome="voltar" />
        </button>
        <button class="botao-voltar claro" aria-label="Mais opções" onClick={() => setMenu(true)}>
          <Icone nome="opcoes" />
        </button>
      </div>

      <div class="detalhe-corpo">
        <section class="detalhe-cartao">
          <div class="detalhe-titulo">
            <div>
              <h1>{projeto.nome}</h1>
              <p>{detalhes}</p>
            </div>
            <span class={'chip-status ' + projeto.status}>{concluido ? 'concluído' : rodando ? 'rodando' : 'fazendo'}</span>
          </div>
          <div class="detalhe-stats">
            <div>
              <strong>{formatarTotal(totalDoProjeto(dados.sessoes, projeto.id, agora))}</strong>
              <span>tempo</span>
            </div>
            <div>
              <strong class="preco">{projeto.precoCentavos !== null ? brl(projeto.precoCentavos) : '—'}</strong>
              <span>preço</span>
            </div>
          </div>
        </section>

        {!concluido && (
          <button class={'botao primario largo detalhe-crono' + (rodando ? ' rodando' : '')} onClick={() => void abrirCrono()}>
            <Icone nome={rodando ? 'relogio' : 'play'} tamanho={20} />
            {rodando ? 'Ver cronômetro' : temSessao ? 'Continuar cronômetro' : 'Começar cronômetro'}
          </button>
        )}

        <button class="cartao-acao" onClick={() => ir(href.calcularPara(projeto.id))}>
          <span class="cartao-acao-icone">
            <Icone nome="calcular" />
          </span>
          <span class="linha-projeto-texto">
            <strong>{projeto.calculo ? 'Preço de venda' : 'Calcular preço de venda'}</strong>
            <small>
              {projeto.calculo ? `calculado em ${diaCurto(projeto.calculo.calculadoEm)} · toque para revisar` : 'usa o tempo do cronômetro'}
            </small>
          </span>
          <Icone nome="seta" tamanho={18} />
        </button>

        <div class="secao-cabecalho">
          <h2 class="secao-titulo">Fios usados</h2>
          {!concluido && (
            <button class="link-pequeno" onClick={() => ir(href.calcularPara(projeto.id))}>
              {projeto.fios.length ? 'editar' : 'registrar'}
            </button>
          )}
        </div>
        {projeto.fios.length ? (
          <div class="chips">
            {projeto.fios.map((f, i) => {
              const n = novelo(f.noveloId);
              return (
                <span key={i} class="chip-fio">
                  <i style={{ background: n?.capaCor ?? 'var(--divisoria)' }} />
                  {n?.cor ?? 'Fio removido'} · {f.gramas} g
                </span>
              );
            })}
          </div>
        ) : (
          <p class="texto-apagado">Nenhum fio registrado. Os fios entram pela calculadora de preço.</p>
        )}

        <button class="botao largo detalhe-fim" onClick={() => (concluido ? setReabrindo(true) : setConcluindo(true))}>
          {concluido ? 'Reabrir projeto' : 'Concluir projeto'}
        </button>
      </div>

      <Sheet aberta={menu} aoFechar={() => setMenu(false)} titulo={projeto.nome}>
        <div class="menu-acoes">
          <button
            class="botao largo"
            onClick={() => {
              setMenu(false);
              ir(href.editarProjeto(projeto.id));
            }}
          >
            Editar projeto
          </button>
          <button class="botao perigo largo" onClick={() => void excluir()}>
            Excluir projeto
          </button>
        </div>
      </Sheet>

      <ConcluirSheet aberta={concluindo} aoFechar={() => setConcluindo(false)} projeto={projeto} novelos={novelos} rodando={rodando} />
      <ReabrirSheet aberta={reabrindo} aoFechar={() => setReabrindo(false)} projeto={projeto} novelos={novelos} />
    </main>
  );
}

function ConcluirSheet(props: Parameters<typeof ConcluirAberta>[0]) {
  return props.aberta ? <ConcluirAberta {...props} /> : null;
}

function ConcluirAberta({
  aberta,
  aoFechar,
  projeto,
  novelos,
  rodando
}: {
  aberta: boolean;
  aoFechar: () => void;
  projeto: Projeto;
  novelos: Novelo[];
  rodando: boolean;
}) {
  const itens = calcularDesconto(projeto.fios, novelos);
  const [descontar, setDescontar] = useState(itens.length > 0);

  const concluir = async () => {
    await concluirProjeto(projeto.id, descontar && itens.length > 0);
    aoFechar();
    toast('Projeto concluído', { rotulo: 'Desfazer', fazer: () => void reabrirProjeto(projeto.id, true) });
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Concluir projeto" subtitulo={rodando ? 'O cronômetro deste projeto será pausado.' : undefined}>
      {itens.length > 0 ? (
        <>
          <Interruptor ligado={descontar} aoMudar={setDescontar} rotulo="Descontar fios do estoque" detalhe="Tira do estoque o que este projeto usou." />
          <ul class={'lista-desconto' + (descontar ? '' : ' desligada')}>
            {itens.map((it) => {
              const n = novelos.find((x) => x.id === it.noveloId)!;
              return (
                <li key={it.noveloId}>
                  <span class="capa capa-p" style={{ background: n.capaCor }} />
                  <span class="linha-projeto-texto">
                    <strong>
                      {n.cor} <span class="menos">−{it.gramas} g</span>
                    </strong>
                    <small>
                      fica {formatarEstoque(it.depois, n.gramatura)}
                      {it.faltou > 0 ? ` · faltavam ${it.faltou} g no estoque` : ''}
                    </small>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p class="texto-apagado">Nenhum fio registrado neste projeto, então o estoque não muda.</p>
      )}
      <button class="botao primario largo" style={{ marginTop: 18 }} onClick={() => void concluir()}>
        Concluir projeto
      </button>
    </Sheet>
  );
}

function ReabrirSheet(props: Parameters<typeof ReabrirAberta>[0]) {
  return props.aberta ? <ReabrirAberta {...props} /> : null;
}

function ReabrirAberta({ aberta, aoFechar, projeto, novelos }: { aberta: boolean; aoFechar: () => void; projeto: Projeto; novelos: Novelo[] }) {
  const descontado = (projeto.descontado ?? []).filter((d) => d.gramas > 0 && novelos.some((n) => n.id === d.noveloId));
  const [devolver, setDevolver] = useState(true);

  const reabrir = async () => {
    await reabrirProjeto(projeto.id, devolver && descontado.length > 0);
    aoFechar();
    toast('Projeto reaberto');
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Reabrir projeto" subtitulo="Ele volta para os projetos em andamento.">
      {descontado.length > 0 && (
        <Interruptor
          ligado={devolver}
          aoMudar={setDevolver}
          rotulo="Devolver fios ao estoque"
          detalhe={descontado
            .map((d) => `${novelos.find((n) => n.id === d.noveloId)!.cor} +${d.gramas} g`)
            .join(' · ')}
        />
      )}
      <button class="botao primario largo" style={{ marginTop: 18 }} onClick={() => void reabrir()}>
        Reabrir projeto
      </button>
    </Sheet>
  );
}
