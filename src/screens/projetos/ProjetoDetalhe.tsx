import { useEffect, useRef, useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { corValida } from '../../app/capa.ts';
import { useDadosCrono } from '../../app/dados.ts';
import { diaCurto } from '../../app/datas.ts';
import { useAgora } from '../../app/hooks.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { CampoInteiro } from '../../components/Campos.tsx';
import { Icone } from '../../components/Icone.tsx';
import { Interruptor } from '../../components/Interruptor.tsx';
import { VerFoto } from '../../components/VerFoto.tsx';
import { SeloPrazo } from '../../components/SeloPrazo.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import {
  concluirProjeto,
  duplicarProjeto,
  excluirProjeto,
  iniciar,
  listarNovelos,
  marcarEntregue,
  reabrirProjeto,
  restaurarProjeto,
  listarPesosEmbalagem,
  salvarAnotacoes,
  salvarFiosDoProjeto,
  salvarReceita
} from '../../db/repo.ts';
import { FioSheet, type FioEditado } from '../calculadora/FioSheet.tsx';
import { precoPorGrama } from '../../domain/preco.ts';
import { lerLink, origemDoLink } from '../../domain/receita.ts';
import { unidadesEmUso, usadoNoFim } from '../../domain/fios.ts';
import { contaDaEmbalagem, descontarEmbalagem, pesoDaEmbalagem } from '../../domain/pesagem.ts';
import { rotuloUnidade } from '../../domain/unidades.ts';
import { DescontoEmbalagem } from '../../components/DescontoEmbalagem.tsx';
import type { FioDescontado, FioUsado, Novelo, Projeto } from '../../db/types.ts';
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
  const [vendoFoto, setVendoFoto] = useState(false);
  const [concluindo, setConcluindo] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const [repetindo, setRepetindo] = useState(false);
  const [editandoReceita, setEditandoReceita] = useState(false);
  const [fioEditando, setFioEditando] = useState<{ indice: number | null } | null>(null);

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
  const temTempo = totalDoProjeto(dados.sessoes, projeto.id, agora) > 0;
  const novelo =(nid: string) => novelos.find((n) => n.id === nid);
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

  const fioAtual = fioEditando?.indice != null ? projeto.fios[fioEditando.indice] : undefined;
  const fioInicial = fioAtual ? { ...fioAtual, precoPorGramaCentavos: precoDoNovelo(novelo(fioAtual.noveloId)) } : null;
  const avisoFios = (texto: string) =>
    toast(texto, projeto.calculo ? { rotulo: 'Revisar preço', fazer: () => ir(href.calcularPara(projeto.id)) } : undefined);

  const salvarFio = async (f: FioEditado) => {
    if (!f.noveloId || !fioEditando) return;
    const novo: FioUsado = { noveloId: f.noveloId, gramas: f.gramas };
    if (f.unidadeId) novo.unidadeId = f.unidadeId;
    if (f.aPesar) {
      novo.aPesar = true;
      novo.antesG = f.antesG ?? 0;
    }
    const indice = fioEditando.indice;
    const fios = indice === null ? [...projeto.fios, novo] : projeto.fios.map((x, i) => (i === indice ? novo : x));
    await salvarFiosDoProjeto(projeto.id, fios);
    setFioEditando(null);
    avisoFios(indice === null ? 'Fio adicionado' : 'Fio atualizado');
  };

  const tirarFio = async (indice: number) => {
    const antes = projeto.fios;
    await salvarFiosDoProjeto(
      projeto.id,
      antes.filter((_, i) => i !== indice)
    );
    setFioEditando(null);
    toast('Fio tirado', { rotulo: 'Desfazer', fazer: () => void salvarFiosDoProjeto(projeto.id, antes) });
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
        {projeto.fotoId && <button class="faixa-ver-foto" aria-label="Ver foto" onClick={() => setVendoFoto(true)} />}
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
              {projeto.calculo
                ? `calculado em ${diaCurto(projeto.calculo.calculadoEm)}${
                    !temTempo && projeto.calculo.minutos > 0 ? ` · estimado com ${formatarTotal(projeto.calculo.minutos * 60_000)}` : ''
                  } · toque para revisar`
                : 'usa o tempo do cronômetro'}
            </small>
          </span>
          <Icone nome="seta" tamanho={18} />
        </button>

        <div class="secao-cabecalho">
          <h2 class="secao-titulo">Fios{quantidade > 1 ? ' por peça' : ''}</h2>
          {!concluido && (
            <button class="link-pequeno" onClick={() => setFioEditando({ indice: null })}>
              adicionar
            </button>
          )}
        </div>
        {projeto.fios.length || manuais.length ? (
          <div class="chips">
            {projeto.fios.map((f, i) => {
              const n = novelo(f.noveloId);
              const nome = n ? nomeDoFioDoProjeto(n, f) : 'Fio removido';
              const conteudo = (
                <>
                  {n ? <Capa tag="i" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId} /> : <i style={{ background: 'var(--divisoria)' }} />}
                  {nome}
                  {n ? ` · ${f.aPesar ? 'a pesar' : `${f.gramas} g`}` : concluido ? ` · ${f.gramas} g` : ' · toque para trocar ou tirar'}
                </>
              );
              const classe = 'chip-fio' + (f.aPesar ? ' a-pesar' : '');
              return concluido ? (
                <span key={i} class={classe}>
                  {conteudo}
                </span>
              ) : (
                <button key={i} class={classe} aria-label={`Editar fio ${nome}`} onClick={() => setFioEditando({ indice: i })}>
                  {conteudo}
                </button>
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
          <p class="texto-apagado">Nenhum fio ainda. Toque em "adicionar" ou registre pela calculadora de preço.</p>
        )}
        {!concluido && <ResumoEstoque fios={projeto.fios} novelos={novelos} quantidade={quantidade} />}

        <div class="secao-cabecalho">
          <h2 class="secao-titulo">Receita</h2>
          {projeto.receitaUrl && (
            <button class="link-pequeno" onClick={() => setEditandoReceita(true)}>
              trocar
            </button>
          )}
        </div>
        {projeto.receitaUrl ? (
          <a class="cartao-acao" href={projeto.receitaUrl} target="_blank" rel="noopener noreferrer">
            <span class="cartao-acao-icone">
              <Icone nome="receita" />
            </span>
            <span class="linha-projeto-texto">
              <strong>Abrir receita</strong>
              <small>{origemDoLink(projeto.receitaUrl)}</small>
            </span>
            <Icone nome="abrir" tamanho={18} />
          </a>
        ) : (
          <button class="cartao-acao vazio-tracejado" onClick={() => setEditandoReceita(true)}>
            <span class="cartao-acao-icone">
              <Icone nome="receita" />
            </span>
            <span class="linha-projeto-texto">
              <strong>Adicionar link da receita</strong>
              <small>cole o link do PDF no Google Drive</small>
            </span>
            <Icone nome="mais" tamanho={18} />
          </button>
        )}

        <h2 class="secao-titulo">Anotações</h2>
        <Anotacoes key={projeto.id} projeto={projeto} />

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
      {vendoFoto && projeto.fotoId && <VerFoto fotoId={projeto.fotoId} titulo={projeto.nome} aoFechar={() => setVendoFoto(false)} />}
      <ReceitaSheet aberta={editandoReceita} aoFechar={() => setEditandoReceita(false)} projeto={projeto} />
      <FioSheet
        aberta={!!fioEditando}
        aoFechar={() => setFioEditando(null)}
        novelos={novelos}
        varias={quantidade > 1}
        semManual
        pesarNoFim
        emUso={unidadesEmUso(dados.projetos, projeto.id)}
        inicial={fioInicial}
        aoSalvar={(f) => void salvarFio(f)}
        aoTirar={fioEditando?.indice != null ? () => void tirarFio(fioEditando.indice!) : undefined}
      />
    </main>
  );
}

function Anotacoes({ projeto }: { projeto: Projeto }) {
  const [texto, setTexto] = useState(projeto.anotacoes ?? '');
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salvo = useRef(projeto.anotacoes ?? '');
  const campo = useRef<HTMLTextAreaElement>(null);

  const salvar = (valor: string) => {
    if (espera.current) clearTimeout(espera.current);
    espera.current = null;
    if (valor === salvo.current) return;
    salvo.current = valor;
    void salvarAnotacoes(projeto.id, valor);
  };

  const ajustarAltura = () => {
    const el = campo.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  useEffect(ajustarAltura, [texto]);

  useEffect(() => {
    const remoto = projeto.anotacoes ?? '';
    if (remoto !== salvo.current && document.activeElement !== campo.current) {
      salvo.current = remoto;
      setTexto(remoto);
    }
  }, [projeto.anotacoes]);

  useEffect(() => () => espera.current !== null && salvar(campo.current?.value ?? texto), []);

  return (
    <textarea
      ref={campo}
      class="campo anotacoes"
      rows={3}
      value={texto}
      placeholder="Carreiras, ajustes na receita, o que a cliente pediu…"
      aria-label="Anotações do projeto"
      onInput={(e) => {
        const v = e.currentTarget.value;
        setTexto(v);
        if (espera.current) clearTimeout(espera.current);
        espera.current = setTimeout(() => salvar(v), 700);
      }}
      onBlur={(e) => salvar(e.currentTarget.value)}
    />
  );
}

function ReceitaSheet(props: Parameters<typeof ReceitaAberta>[0]) {
  return props.aberta ? <ReceitaAberta {...props} /> : null;
}

function ReceitaAberta({ aberta, aoFechar, projeto }: { aberta: boolean; aoFechar: () => void; projeto: Projeto }) {
  const [texto, setTexto] = useState(projeto.receitaUrl ?? '');
  const link = lerLink(texto);
  const invalido = texto.trim() !== '' && !link;

  const salvar = async (url: string) => {
    await salvarReceita(projeto.id, url);
    aoFechar();
    toast(url ? 'Receita salva' : 'Link da receita removido');
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Link da receita" subtitulo="No Drive: Compartilhar → Copiar link. O PDF abre no app do Drive.">
      <input
        class="campo"
        type="url"
        inputMode="url"
        autocomplete="off"
        placeholder="https://drive.google.com/…"
        aria-label="Link da receita"
        value={texto}
        onInput={(e) => setTexto(e.currentTarget.value)}
      />
      {invalido && <p class="erro">Isso não parece um link.</p>}
      <button class="botao primario largo" style={{ marginTop: 16 }} disabled={!link} onClick={() => void salvar(link)}>
        Salvar link
      </button>
      {projeto.receitaUrl && (
        <button class="link-pequeno link-centro" onClick={() => void salvar('')}>
          tirar o link da receita
        </button>
      )}
    </Sheet>
  );
}

function ResumoEstoque({ fios, novelos, quantidade }: { fios: FioUsado[]; novelos: Novelo[]; quantidade: number }) {
  const itens = conferirEstoque(
    fios.filter((f) => !f.aPesar),
    novelos,
    quantidade
  );
  const aPesar = fios
    .filter((f) => f.aPesar)
    .flatMap((f) => {
      const n = novelos.find((x) => x.id === f.noveloId);
      return n ? [nomeDoFioDoProjeto(n, f)] : [];
    });
  if (!itens.length && !aPesar.length) return null;
  const faltando = itens.filter((i) => i.falta > 0);
  const pecas = quantidade > 1 ? `as ${quantidade} peças` : 'a peça';
  const notaAPesar = aPesar.length > 0 && (
    <p class="estoque-resumo a-pesar">
      {aPesar.join(', ')} {aPesar.length === 1 ? 'vai ser pesado' : 'vão ser pesados'} no fim.
    </p>
  );
  if (!faltando.length) {
    return (
      <>
        {itens.length > 0 && (
          <p class="estoque-resumo ok">
            <Icone nome="check" tamanho={16} espessura={2.6} /> {aPesar.length ? `Os fios por gramas dão para ${pecas}` : `Tem fio para ${pecas}`}
          </p>
        )}
        {notaAPesar}
      </>
    );
  }
  return (
    <>
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
      {notaAPesar}
    </>
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
  const q = Math.max(1, projeto.quantidade ?? 1);
  const noveloDe = (f: FioUsado) => novelos.find((n) => n.id === f.noveloId);
  const removidos = projeto.fios.filter((f) => !noveloDe(f)).length;
  const itens = calcularDesconto(
    projeto.fios.filter((f) => !f.aPesar),
    novelos,
    q
  );
  const aPesar = projeto.fios
    .map((f, i) => ({ f, i, n: noveloDe(f) }))
    .filter((x): x is { f: FioUsado; i: number; n: Novelo } => !!x.f.aPesar && !!x.n);
  const pesosEmbalagem = useLive(listarPesosEmbalagem);
  const [sobras, setSobras] = useState<Record<number, Sobra>>({});
  const temEstoque = itens.length > 0 || aPesar.length > 0;
  const [descontar, setDescontar] = useState(true);

  const sobraDe = (i: number): Sobra => sobras[i] ?? { balanca: null, acabou: false, comEmbalagem: true };
  const mudarSobra = (i: number, parte: Partial<Sobra>) => setSobras((a) => ({ ...a, [i]: { ...sobraDe(i), ...a[i], ...parte } }));
  const embalagemDe = (n: Novelo) => (pesosEmbalagem ? pesoDaEmbalagem(pesosEmbalagem, n.tipo) : 0);
  const liquidoDe = (n: Novelo, i: number): number | null => {
    const s = sobraDe(i);
    if (s.acabou) return 0;
    if (s.balanca === null) return null;
    return descontarEmbalagem(s.balanca, 1, s.comEmbalagem ? embalagemDe(n) : 0);
  };
  const faltaPesar = aPesar.some(({ n, i }) => liquidoDe(n, i) === null);
  const tiradoAPesar = (noveloId: string) =>
    aPesar.reduce((soma, { f, n, i }) => {
      const liquido = liquidoDe(n, i);
      const u = n.unidades.find((x) => x.id === f.unidadeId);
      return f.noveloId === noveloId && liquido !== null && u ? soma + Math.max(0, u.pesoG - liquido) : soma;
    }, 0);

  const concluir = async () => {
    const pesadas: Record<number, number> = {};
    for (const { n, i } of aPesar) pesadas[i] = liquidoDe(n, i) ?? 0;
    await concluirProjeto(projeto.id, descontar && temEstoque, pesadas);
    aoFechar();
    toast(encomenda ? 'Encomenda pronta' : 'Projeto concluído', { rotulo: 'Desfazer', fazer: () => void reabrirProjeto(projeto.id, true) });
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo={encomenda ? 'Marcar como pronta' : 'Concluir projeto'} subtitulo={rodando ? 'O cronômetro deste projeto será pausado.' : undefined}>
      {aPesar.length > 0 && (
        <div class="pesar-no-fim">
          <p class="rotulo">Pese o que sobrou</p>
          {aPesar.map(({ f, i, n }) => {
            const s = sobraDe(i);
            const emb = embalagemDe(n);
            const liquido = liquidoDe(n, i);
            const antes = f.antesG ?? 0;
            const u = n.unidades.find((x) => x.id === f.unidadeId);
            return (
              <div key={i} class="sobra-fio">
                <div class="linha-projeto">
                  <Capa class="capa capa-p" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId} />
                  <span class="linha-projeto-texto">
                    <strong>{nomeDoFioDoProjeto(n, f)}</strong>
                    <small>pesava {antes} g quando começou</small>
                  </span>
                </div>
                <div class="sobra-linha">
                  <CampoInteiro
                    id={`sobra-${i}`}
                    permiteVazio
                    valor={s.acabou ? 0 : s.balanca}
                    aoMudar={(v) => mudarSobra(i, { balanca: v, acabou: false })}
                    rotulo={`Sobrou de ${nomeDoFioDoProjeto(n, f)}, na balança`}
                    sufixo="g"
                  />
                  <button type="button" class={'chip' + (s.acabou ? ' ativo' : '')} aria-pressed={s.acabou} onClick={() => mudarSobra(i, { acabou: !s.acabou })}>
                    acabou
                  </button>
                </div>
                {!s.acabou && <DescontoEmbalagem tipo={n.tipo} embalagemG={emb} ligado={s.comEmbalagem} aoLigar={(v) => mudarSobra(i, { comEmbalagem: v })} />}
                <p class="sobra-conta">
                  {liquido === null ? (
                    'Pese a sobra ou marque "acabou".'
                  ) : (
                    <>
                      {!s.acabou && s.comEmbalagem && emb > 0 && s.balanca !== null && `${contaDaEmbalagem(s.balanca, 1, emb)} = ${liquido} g · `}
                      usou <b>{Math.max(0, antes - liquido)} g</b>
                      {q > 1 ? ` (${usadoNoFim(antes, liquido, q)} g por peça)` : ''}
                      {' · '}
                      {u ? (liquido > 0 ? `fica ${liquido} g` : 'sai do estoque') : liquido > 0 ? `a sobra entra no estoque (${liquido} g)` : 'não sobrou nada'}
                      {liquido > antes ? ' · a sobra pesa mais que antes; confira' : ''}
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
      {itens.length > 0 && (
        <>
          {aPesar.length > 0 && <p class="rotulo">Fios por gramas</p>}
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
                      fica {formatarEstoque(Math.max(0, it.depois - tiradoAPesar(it.noveloId)))}
                      {q > 1 ? ` · ${it.gramas / q} g por peça` : ''}
                      {it.faltou > 0 ? ` · faltavam ${it.faltou} g no estoque` : ''}
                    </small>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {removidos > 0 && (
        <p class="texto-apagado">
          {removidos === 1 ? '1 fio é de um novelo excluído e não mexe' : `${removidos} fios são de novelos excluídos e não mexem`} no estoque.
        </p>
      )}
      {temEstoque ? (
        <Interruptor
          ligado={descontar}
          aoMudar={setDescontar}
          rotulo="Atualizar o estoque"
          detalhe={aPesar.length ? 'Tira o que foi usado; cada novelo pesado fica com o peso da sobra.' : 'Tira do estoque o que este projeto usou.'}
        />
      ) : (
        removidos === 0 && <p class="texto-apagado">Nenhum fio registrado neste projeto, então o estoque não muda.</p>
      )}
      {faltaPesar && <p class="texto-apagado">Pese a sobra de cada novelo (ou marque "acabou") para concluir.</p>}
      <button class="botao primario largo" style={{ marginTop: 18 }} disabled={faltaPesar} onClick={() => void concluir()}>
        {encomenda ? 'Marcar como pronta' : 'Concluir projeto'}
      </button>
    </Sheet>
  );
}

type Sobra = { balanca: number | null; acabou: boolean; comEmbalagem: boolean };

function ReabrirSheet(props: Parameters<typeof ReabrirAberta>[0]) {
  return props.aberta ? <ReabrirAberta {...props} /> : null;
}

function ReabrirAberta({ aberta, aoFechar, projeto, novelos }: { aberta: boolean; aoFechar: () => void; projeto: Projeto; novelos: Novelo[] }) {
  const descontado = (projeto.descontado ?? []).filter((d) => (d.gramas > 0 || d.criada) && novelos.some((n) => n.id === d.noveloId));
  const voltamAPesar = (projeto.fiosAntesDeConcluir ?? []).filter((f) => f.aPesar).length;
  const [devolver, setDevolver] = useState(true);

  const reabrir = async () => {
    await reabrirProjeto(projeto.id, devolver && descontado.length > 0);
    aoFechar();
    toast('Projeto reaberto');
  };

  const descrever = (d: FioDescontado) => {
    const n = novelos.find((x) => x.id === d.noveloId)!;
    const nome = `${nomeDoNovelo(n)}${d.unidade ? ` ${rotuloUnidade(d.unidade)}` : ''}`;
    return d.criada ? `${nome}: a sobra sai (${d.unidade?.pesoG ?? 0} g)` : `${nome} +${d.gramas} g`;
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Reabrir projeto" subtitulo="Ele volta para os projetos em andamento.">
      {descontado.length > 0 && (
        <Interruptor ligado={devolver} aoMudar={setDevolver} rotulo="Devolver fios ao estoque" detalhe={descontado.map(descrever).join(' · ')} />
      )}
      {voltamAPesar > 0 && (
        <p class="texto-apagado">
          {voltamAPesar === 1 ? 'O fio que era "a pesar" volta a ser pesado' : `Os ${voltamAPesar} fios que eram "a pesar" voltam a ser pesados`} quando você concluir
          de novo.
        </p>
      )}
      <button class="botao primario largo" style={{ marginTop: 18 }} onClick={() => void reabrir()}>
        Reabrir projeto
      </button>
    </Sheet>
  );
}

const precoDoNovelo = (n: Novelo | undefined) => (n ? precoPorGrama(n.precoCentavos, n.gramatura) : 0);

function nomeDoFioDoProjeto(n: Novelo, f: FioUsado): string {
  const u = f.unidadeId ? n.unidades.find((x) => x.id === f.unidadeId) : undefined;
  return u ? `${nomeDoNovelo(n)} ${rotuloUnidade(u)}` : nomeDoNovelo(n);
}
