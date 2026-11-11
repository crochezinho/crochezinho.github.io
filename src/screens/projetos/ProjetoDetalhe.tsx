import { useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { corValida } from '../../app/capa.ts';
import { useDadosCrono } from '../../app/dados.ts';
import { diaCurto } from '../../app/datas.ts';
import { useAgora } from '../../app/hooks.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { CampoInteiro } from '../../components/Campos.tsx';
import { Icone } from '../../components/Icone.tsx';
import { Interruptor } from '../../components/Interruptor.tsx';
import { SeloPrazo } from '../../components/SeloPrazo.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { concluirProjeto, duplicarProjeto, excluirProjeto, iniciar, listarNovelos, marcarEntregue, reabrirProjeto, restaurarProjeto } from '../../db/repo.ts';
import type { FioUsado, Novelo, Projeto } from '../../db/types.ts';
import { calcularDesconto, conferirEstoque, formatarEstoque } from '../../domain/estoque.ts';
import { diaDaEntrega } from '../../domain/prazo.ts';
import { ehEncomenda, etapa } from '../../domain/encomendas.ts';
import { nomeDoNovelo } from '../../domain/novelos.ts';
import { brl } from '../../domain/preco.ts';
import { formatarTotal, totalDoProjeto } from '../../domain/tempo.ts';

export function ProjetoDetalhe({ id }: { id: string }) {
  const dados = useDadosCrono();
  const novelos = useLive(listarNovelos);
  const [menu, setMenu] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const [repetindo, setRepetindo] = useState(false);

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
  const quantidade = projeto.quantidade ?? 1;
  const encomenda = ehEncomenda(projeto);
  const fase = etapa(projeto);
  const manuais = (projeto.calculo?.fios ?? []).filter((f) => !f.noveloId);
  const detalhes = [
    projeto.cliente ? `para ${projeto.cliente}` : '',
    projeto.tipo,
    quantidade > 1 ? `${quantidade} peças` : '',
    projeto.agulha,
    fase === 'entregue' && projeto.entregueEm
      ? `entregue em ${diaCurto(projeto.entregueEm)}`
      : projeto.entregaEm
        ? `entrega ${diaDaEntrega(projeto.entregaEm)}`
        : '',
    concluido && projeto.concluidoEm ? `${encomenda ? 'pronta' : 'concluído'} em ${diaCurto(projeto.concluidoEm)}` : `iniciado em ${diaCurto(projeto.criadoEm)}`
  ]
    .filter(Boolean)
    .join(' · ');

  const excluir = async () => {
    setMenu(false);
    await excluirProjeto(projeto.id);
    voltar(href.projetos);
    toast(`${projeto.nome} excluído`, { rotulo: 'Desfazer', fazer: () => void restaurarProjeto(projeto.id) });
  };

  const entregar = async (sim: boolean) => {
    await marcarEntregue(projeto.id, sim);
    toast(sim ? `Entregue${projeto.cliente ? ` para ${projeto.cliente}` : ''}` : 'Voltou para "pronta"', {
      rotulo: 'Desfazer',
      fazer: () => void marcarEntregue(projeto.id, !sim)
    });
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
      <Capa
        class="detalhe-faixa"
        tag="div"
        cor={projeto.capaCor}
        fotoId={projeto.fotoId}
        semFoto={{ background: `linear-gradient(160deg, ${corValida(projeto.capaCor)}, ${corValida(projeto.capaCor)}cc)` }}
      >
        <button class="botao-voltar claro" aria-label="Voltar" onClick={() => voltar(href.projetos)}>
          <Icone nome="voltar" />
        </button>
        <button class="botao-voltar claro" aria-label="Mais opções" onClick={() => setMenu(true)}>
          <Icone nome="opcoes" />
        </button>
      </Capa>

      <div class="detalhe-corpo">
        <section class="detalhe-cartao">
          <div class="detalhe-titulo">
            <div>
              <h1>{projeto.nome}</h1>
              <p>{detalhes}</p>
              {fase !== 'entregue' && <SeloPrazo entregaEm={projeto.entregaEm} agora={agora} />}
            </div>
            <span class={'chip-status ' + (encomenda ? fase : projeto.status)}>
              {rodando ? 'rodando' : encomenda ? fase : concluido ? 'concluído' : 'fazendo'}
            </span>
          </div>
          <div class="detalhe-stats">
            <div>
              <strong>{formatarTotal(totalDoProjeto(dados.sessoes, projeto.id, agora))}</strong>
              <span>tempo</span>
            </div>
            <div>
              <strong class="preco">{projeto.precoCentavos !== null ? brl(projeto.precoCentavos) : '—'}</strong>
              <span>{quantidade > 1 ? 'por peça' : 'preço'}</span>
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
          <h2 class="secao-titulo">Fios{quantidade > 1 ? ' por peça' : ''}</h2>
          {!concluido && (
            <button class="link-pequeno" onClick={() => ir(href.calcularPara(projeto.id))}>
              {projeto.fios.length ? 'editar' : 'registrar'}
            </button>
          )}
        </div>
        {projeto.fios.length || manuais.length ? (
          <div class="chips">
            {projeto.fios.map((f, i) => {
              const n = novelo(f.noveloId);
              return (
                <span key={i} class="chip-fio">
                  {n ? <Capa tag="i" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId} /> : <i style={{ background: 'var(--divisoria)' }} />}
                  {n ? nomeDoNovelo(n) : 'Fio removido'} · {f.gramas} g
                </span>
              );
            })}
            {manuais.map((f, i) => (
              <span key={`m${i}`} class="chip-fio">
                <i style={{ background: 'var(--divisoria)' }} />
                {f.nome || 'Valor manual'} · {brl(f.valorCentavos ?? 0)}
              </span>
            ))}
          </div>
        ) : (
          <p class="texto-apagado">Nenhum fio registrado. Os fios entram pela calculadora de preço.</p>
        )}
        {!concluido && <ResumoEstoque fios={projeto.fios} novelos={novelos} quantidade={quantidade} />}

        {encomenda && fase === 'pronta' && (
          <button class="botao primario largo detalhe-fim" onClick={() => void entregar(true)}>
            Marcar como entregue
          </button>
        )}
        {concluido && (
          <button class={'botao largo ' + (encomenda && fase === 'pronta' ? 'detalhe-fim-2' : 'primario detalhe-fim')} onClick={() => setRepetindo(true)}>
            Fazer de novo
          </button>
        )}
        <button class={'botao largo ' + (concluido ? 'detalhe-fim-2' : 'detalhe-fim')} onClick={() => (concluido ? setReabrindo(true) : setConcluindo(true))}>
          {concluido ? 'Reabrir projeto' : encomenda ? 'Marcar como pronta' : 'Concluir projeto'}
        </button>
        {fase === 'entregue' && (
          <button class="link-pequeno link-centro" onClick={() => void entregar(false)}>
            ainda não foi entregue
          </button>
        )}
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
          <button
            class="botao largo"
            onClick={() => {
              setMenu(false);
              setRepetindo(true);
            }}
          >
            Fazer de novo
          </button>
          <button class="botao perigo largo" onClick={() => void excluir()}>
            Excluir projeto
          </button>
        </div>
      </Sheet>

      <ConcluirSheet aberta={concluindo} aoFechar={() => setConcluindo(false)} projeto={projeto} novelos={novelos} rodando={rodando} encomenda={encomenda} />
      <ReabrirSheet aberta={reabrindo} aoFechar={() => setReabrindo(false)} projeto={projeto} novelos={novelos} />
      <FazerDeNovoSheet aberta={repetindo} aoFechar={() => setRepetindo(false)} projeto={projeto} novelos={novelos} />
    </main>
  );
}

function ResumoEstoque({ fios, novelos, quantidade }: { fios: FioUsado[]; novelos: Novelo[]; quantidade: number }) {
  const itens = conferirEstoque(fios, novelos, quantidade);
  if (!itens.length) return null;
  const faltando = itens.filter((i) => i.falta > 0);
  const pecas = quantidade > 1 ? `as ${quantidade} peças` : 'a peça';
  if (!faltando.length) {
    return (
      <p class="estoque-resumo ok">
        <Icone nome="check" tamanho={16} espessura={2.6} /> Tem fio para {pecas}
      </p>
    );
  }
  return (
    <div class="estoque-resumo falta">
      <strong>Falta fio para {pecas}</strong>
      <ul>
        {faltando.map((i) => {
          const n = novelos.find((x) => x.id === i.noveloId)!;
          return (
            <li key={i.noveloId}>
              <Capa tag="i" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId} />
              <span>
                {nomeDoNovelo(n)}: precisa {i.precisa} g, tem {i.tem} g · <b>faltam {i.falta} g</b>
                {i.novelosAComprar > 0 && ` (${i.novelosAComprar} ${i.novelosAComprar === 1 ? 'novelo' : 'novelos'})`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function FazerDeNovoSheet(props: Parameters<typeof FazerDeNovoAberta>[0]) {
  return props.aberta ? <FazerDeNovoAberta {...props} /> : null;
}

function FazerDeNovoAberta({ aberta, aoFechar, projeto, novelos }: { aberta: boolean; aoFechar: () => void; projeto: Projeto; novelos: Novelo[] }) {
  const [quantidade, setQuantidade] = useState(projeto.quantidade ?? 1);
  const [criando, setCriando] = useState(false);
  const q = Math.max(1, quantidade);

  const criar = async () => {
    setCriando(true);
    const novoId = await duplicarProjeto(projeto.id, q);
    aoFechar();
    ir(href.projeto(novoId));
    toast('Projeto novo criado, com o cronômetro zerado');
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Fazer de novo" subtitulo="Um projeto novo com os mesmos fios, custos e capa. O cronômetro começa do zero.">
      <div class="cartao-lista">
        <div class="linha-campo">
          <div class="linha-campo-texto">
            <strong>Peças</strong>
          </div>
          <div class="stepper">
            <button aria-label="Menos uma peça" disabled={q <= 1} onClick={() => setQuantidade(q - 1)}>
              <Icone nome="menos" tamanho={18} />
            </button>
            <CampoInteiro valor={quantidade} aoMudar={setQuantidade} rotulo="Peças" sufixo="" max={9999} minimo={1} />
            <button aria-label="Mais uma peça" onClick={() => setQuantidade(Math.min(9999, q + 1))}>
              <Icone nome="mais" tamanho={18} />
            </button>
          </div>
        </div>
      </div>
      {projeto.fios.length > 0 ? (
        <ResumoEstoque fios={projeto.fios} novelos={novelos} quantidade={q} />
      ) : (
        <p class="texto-apagado">Este projeto não tem fios do estoque registrados.</p>
      )}
      <button class="botao primario largo" style={{ marginTop: 18 }} disabled={criando} onClick={() => void criar()}>
        Criar projeto
      </button>
    </Sheet>
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
  rodando,
  encomenda
}: {
  aberta: boolean;
  aoFechar: () => void;
  projeto: Projeto;
  novelos: Novelo[];
  rodando: boolean;
  encomenda: boolean;
}) {
  const itens = calcularDesconto(projeto.fios, novelos, projeto.quantidade ?? 1);
  const [descontar, setDescontar] = useState(itens.length > 0);

  const concluir = async () => {
    await concluirProjeto(projeto.id, descontar && itens.length > 0);
    aoFechar();
    toast(encomenda ? 'Encomenda pronta' : 'Projeto concluído', { rotulo: 'Desfazer', fazer: () => void reabrirProjeto(projeto.id, true) });
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo={encomenda ? 'Marcar como pronta' : 'Concluir projeto'} subtitulo={rodando ? 'O cronômetro deste projeto será pausado.' : undefined}>
      {itens.length > 0 ? (
        <>
          <Interruptor ligado={descontar} aoMudar={setDescontar} rotulo="Descontar fios do estoque" detalhe="Tira do estoque o que este projeto usou." />
          <ul class={'lista-desconto' + (descontar ? '' : ' desligada')}>
            {itens.map((it) => {
              const n = novelos.find((x) => x.id === it.noveloId)!;
              return (
                <li key={it.noveloId}>
                  <Capa class="capa capa-p" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId} />
                  <span class="linha-projeto-texto">
                    <strong>
                      {nomeDoNovelo(n)} <span class="menos">−{it.gramas} g</span>
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
        {encomenda ? 'Marcar como pronta' : 'Concluir projeto'}
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
            .map((d) => `${nomeDoNovelo(novelos.find((n) => n.id === d.noveloId)!)} +${d.gramas} g`)
            .join(' · ')}
        />
      )}
      <button class="botao primario largo" style={{ marginTop: 18 }} onClick={() => void reabrir()}>
        Reabrir projeto
      </button>
    </Sheet>
  );
}
