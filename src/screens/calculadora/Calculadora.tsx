import { useEffect, useRef, useState } from 'preact/hooks';
import { estiloCapa } from '../../app/capa.ts';
import { useDadosCrono } from '../../app/dados.ts';
import { diaCurto } from '../../app/datas.ts';
import { useAgora } from '../../app/hooks.ts';
import { href, ir } from '../../app/router.ts';
import { CampoDinheiro, CampoInteiro } from '../../components/Campos.tsx';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import {
  criarProjeto,
  descartarRascunho,
  lerConfig,
  lerPadroesCalculo,
  lerRascunho,
  listarNovelos,
  salvarCalculoNoProjeto,
  salvarConfig,
  salvarRascunho,
  type PadroesCalculo
} from '../../db/repo.ts';
import type { Calculo, Novelo, Projeto, Rascunho } from '../../db/types.ts';
import { nomeDoNovelo } from '../../domain/novelos.ts';
import { brl, calcular, composicao, custoDoFio, pecas, precoPorGrama } from '../../domain/preco.ts';
import { formatarTotal, totalDoProjeto } from '../../domain/tempo.ts';
import { CHAVE_SHOPEE, SHOPEE_PADRAO, type EstadoShopee } from '../vender/estado.ts';
import { AbasCalcular, irParaAba } from './AbasCalcular.tsx';
import { FioSheet, type FioEditado } from './FioSheet.tsx';

const CHAVE_CONTEXTO = 'calc.contexto';
const chave = () => Math.random().toString(36).slice(2, 10);

function rascunhoInicial(projeto: Projeto | undefined, novelos: Novelo[], p: PadroesCalculo): Rascunho {
  return {
    fios: (projeto?.fios ?? []).map((f) => {
      const n = novelos.find((x) => x.id === f.noveloId);
      return { chave: chave(), ...f, precoPorGramaCentavos: n ? precoPorGrama(n.precoCentavos, n.gramatura) : 0 };
    }),
    quantidade: projeto?.quantidade ?? 1,
    minutos: 0,
    minutosDoCrono: !!projeto,
    valorHoraCentavos: p.valorHoraCentavos,
    extras: [],
    margemPct: p.margemPct
  };
}

function rascunhoDoCalculo(c: Calculo, projeto?: Projeto): Rascunho {
  return {
    fios: c.fios.map((f) => ({ chave: chave(), ...f })),
    quantidade: projeto?.quantidade ?? c.quantidade ?? 1,
    minutos: c.minutos,
    minutosDoCrono: false,
    valorHoraCentavos: c.valorHoraCentavos,
    extras: c.extras.map((e) => ({ chave: chave(), ...e })),
    margemPct: c.margemPct
  };
}

const assinatura = (c: Omit<Calculo, 'calculadoEm'>) =>
  JSON.stringify([
    c.fios.map((f) => [f.noveloId, f.gramas, f.precoPorGramaCentavos, f.nome ?? '', f.valorCentavos ?? null]),
    pecas(c.quantidade),
    c.minutos,
    c.valorHoraCentavos,
    c.extras.map((e) => [e.nome, e.valorCentavos]),
    c.margemPct
  ]);

export function Calculadora({ projetoIdRota }: { projetoIdRota: string | null }) {
  const dados = useDadosCrono();
  const novelos = useLive(listarNovelos);
  const padroes = useLive(lerPadroesCalculo);
  const contextoSalvo = useLive(() => lerConfig<string | null>(CHAVE_CONTEXTO, null));
  const agora = useAgora(!!dados?.aberta, 30_000);

  const [r, setR] = useState<Rascunho | null>(null);
  const [rChave, setRChave] = useState<string | null>(null);
  const pendente = useRef(false);
  const [fioSheet, setFioSheet] = useState<{ chave: string | null } | null>(null);
  const [trocando, setTrocando] = useState(false);
  const [criando, setCriando] = useState(false);
  const cartao = useRef<HTMLElement>(null);
  const [totalFixo, setTotalFixo] = useState(false);

  useEffect(() => {
    if (!projetoIdRota) return;
    void salvarConfig(CHAVE_CONTEXTO, projetoIdRota).then(() => ir(href.calcular, true));
  }, [projetoIdRota]);

  const ctxId = projetoIdRota ?? contextoSalvo;
  const projeto = ctxId && dados ? dados.projetos.find((p) => p.id === ctxId) : undefined;
  const chaveCtx = projeto?.id ?? 'avulso';
  const pronto = !!dados && !!novelos && !!padroes && contextoSalvo !== undefined;

  useEffect(() => {
    if (!pronto || rChave === chaveCtx) return;
    let vivo = true;
    void (async () => {
      const salvo = await lerRascunho(projeto?.id ?? null);
      const novo = salvo ?? (projeto?.calculo ? rascunhoDoCalculo(projeto.calculo, projeto) : rascunhoInicial(projeto, novelos!, padroes!));
      if (!vivo) return;
      pendente.current = false;
      setR(novo);
      setRChave(chaveCtx);
    })();
    return () => {
      vivo = false;
    };
  }, [pronto, chaveCtx, rChave]);

  useEffect(() => {
    if (!r || !rChave || !pendente.current) return;
    const t = setTimeout(() => {
      pendente.current = false;
      void salvarRascunho(rChave === 'avulso' ? null : rChave, r);
    }, 300);
    return () => clearTimeout(t);
  }, [r, rChave]);

  useEffect(() => {
    const el = cartao.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(([e]) => setTotalFixo(!e.isIntersecting), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [r !== null, rChave, chaveCtx]);

  if (!pronto || !r || rChave !== chaveCtx) return <main class="tela" />;

  const atualizar = (mudanca: Partial<Rascunho> | ((r: Rascunho) => Rascunho)) => {
    pendente.current = true;
    setR((atual) => (atual ? (typeof mudanca === 'function' ? mudanca(atual) : { ...atual, ...mudanca }) : atual));
  };
  const substituir = (novo: Rascunho) => {
    pendente.current = true;
    setR(novo);
  };

  const minutosCrono = projeto ? Math.floor(totalDoProjeto(dados!.sessoes, projeto.id, agora) / 60_000) : null;
  const minutos = r.minutosDoCrono && minutosCrono !== null ? minutosCrono : r.minutos;
  const quantidade = pecas(r.quantidade);
  const varias = quantidade > 1;
  const res = calcular({
    fios: r.fios,
    minutos,
    valorHoraCentavos: r.valorHoraCentavos,
    extrasCentavos: r.extras.map((e) => e.valorCentavos),
    margemPct: r.margemPct,
    quantidade
  });
  const comp = composicao(res);
  const fiosPorPeca = r.fios.reduce((s, f) => s + custoDoFio(f), 0);
  const outrosPorPeca = r.extras.reduce((s, e) => s + Math.max(0, e.valorCentavos), 0);
  const porPeca = varias ? ' por peça' : '';

  const montar = (): Calculo => ({
    fios: r.fios.map(({ noveloId, gramas, precoPorGramaCentavos, nome, valorCentavos }) =>
      noveloId ? { noveloId, gramas, precoPorGramaCentavos } : { noveloId: null, gramas: 0, precoPorGramaCentavos: 0, nome: nome ?? '', valorCentavos: valorCentavos ?? 0 }
    ),
    quantidade,
    minutos,
    valorHoraCentavos: r.valorHoraCentavos,
    extras: r.extras.map(({ nome, valorCentavos }) => ({ nome: nome.trim(), valorCentavos })),
    margemPct: r.margemPct,
    totalCentavos: res.total,
    calculadoEm: Date.now()
  });

  const salvoNoProjeto = projeto?.calculo ?? null;
  const salvoPorPeca = salvoNoProjeto ? projeto!.precoCentavos ?? salvoNoProjeto.totalCentavos : 0;
  const naoSalvo = !!projeto && (!salvoNoProjeto || assinatura(montar()) !== assinatura(salvoNoProjeto));
  const tempoMudou =
    !!salvoNoProjeto && minutosCrono !== null && minutosCrono > 0 && !r.minutosDoCrono && minutosCrono !== r.minutos;

  const novelo = (id: string | null) => (id ? novelos!.find((n) => n.id === id) : undefined);
  const nomeDoFio = (f: { noveloId: string | null; nome?: string }) => {
    if (!f.noveloId) return f.nome || 'Valor manual';
    const n = novelo(f.noveloId);
    return n ? nomeDoNovelo(n) : 'Fio removido';
  };
  const fioEditando = fioSheet?.chave ? r.fios.find((f) => f.chave === fioSheet.chave) ?? null : null;

  const salvarFio = (f: FioEditado) => {
    if (fioSheet?.chave) {
      const k = fioSheet.chave;
      atualizar((a) => ({ ...a, fios: a.fios.map((x) => (x.chave === k ? { ...x, ...f } : x)) }));
    } else {
      atualizar((a) => ({ ...a, fios: [...a.fios, { chave: chave(), ...f }] }));
    }
    setFioSheet(null);
  };

  const removerFio = (k: string) => {
    const antes = r;
    const f = r.fios.find((x) => x.chave === k);
    atualizar((a) => ({ ...a, fios: a.fios.filter((x) => x.chave !== k) }));
    toast(`${f ? nomeDoFio(f) : 'Fio'} removido`, { rotulo: 'Desfazer', fazer: () => substituir(antes) });
  };

  const verNaShopee = async () => {
    const atual = await lerConfig<EstadoShopee | null>(CHAVE_SHOPEE, null);
    const custo = Math.round((res.fios + res.trabalho + res.outros) / quantidade);
    await salvarConfig(CHAVE_SHOPEE, { ...SHOPEE_PADRAO, ...(atual ?? {}), precoCentavos: res.porPeca, custoCentavos: custo });
    await irParaAba('shopee');
  };

  const copiar = async () => {
    const valor = brl(res.porPeca);
    toast((await copiarTexto(valor)) ? `Copiado: ${valor}` : 'Não foi possível copiar');
  };

  const salvarNoProjeto = async () => {
    if (!projeto) return;
    await salvarCalculoNoProjeto(projeto.id, montar(), res.porPeca);
    substituir({ ...r, minutos, minutosDoCrono: false });
    pendente.current = false;
    toast(`Preço salvo em ${projeto.nome}`);
  };

  const recomecar = () => {
    const antes = r;
    if (projeto && salvoNoProjeto) {
      void descartarRascunho(projeto.id);
      pendente.current = false;
      setR(rascunhoDoCalculo(salvoNoProjeto, projeto));
      toast('Alterações descartadas', { rotulo: 'Desfazer', fazer: () => substituir(antes) });
    } else {
      substituir(rascunhoInicial(projeto, novelos!, padroes!));
      toast('Cálculo limpo', { rotulo: 'Desfazer', fazer: () => substituir(antes) });
    }
  };

  const podeRecomecar = projeto ? naoSalvo && !!salvoNoProjeto : r.fios.length > 0 || r.extras.length > 0 || r.minutos > 0;

  const trocarContexto = async (id: string | null) => {
    setTrocando(false);
    await salvarConfig(CHAVE_CONTEXTO, id);
  };

  const criarComCalculo = async (nome: string) => {
    const calculo = montar();
    const id = await criarProjeto(nome, { quantidade });
    await salvarCalculoNoProjeto(id, calculo, res.porPeca);
    await descartarRascunho(null);
    setCriando(false);
    await salvarConfig(CHAVE_CONTEXTO, id);
    toast('Projeto criado com este preço');
  };

  return (
    <main class="tela anim-tela calc">
      <AbasCalcular atual="preco" />
      {totalFixo && (
        <div class="total-fixo" aria-hidden="true">
          <span>
            {projeto ? projeto.nome : 'Preço sugerido'}
            {porPeca}
          </span>
          <strong>{brl(res.porPeca)}</strong>
        </div>
      )}

      <header class="cabecalho">
        <h1 class="titulo-grande">Calcular preço</h1>
        {podeRecomecar && (
          <button class="botao-texto" onClick={recomecar}>
            {projeto ? 'Descartar alterações' : 'Limpar'}
          </button>
        )}
      </header>

      <button class="contexto" onClick={() => setTrocando(true)}>
        <span class="capa capa-p" style={projeto ? estiloCapa(projeto.capaCor) : { background: 'var(--rosa-suave)' }}>
          {!projeto && <Icone nome="calcular" />}
        </span>
        <span class="linha-projeto-texto">
          <small>{projeto ? 'Calculando para' : 'Calculando'}</small>
          <strong>{projeto ? projeto.nome : 'Cálculo avulso'}</strong>
        </span>
        <span class="chip-trocar">trocar</span>
      </button>

      <section class="cartao-preco" ref={cartao}>
        <p class="sobretitulo">Preço sugerido{porPeca}</p>
        <p class="cartao-preco-valor">{brl(res.porPeca)}</p>
        {varias && (
          <p class="cartao-preco-sub">
            {quantidade} peças: <strong>{brl(res.total)}</strong>
          </p>
        )}
        {projeto && (
          <p class="cartao-preco-sub">
            {naoSalvo
              ? salvoNoProjeto
                ? `não salvo · no projeto: ${brl(salvoPorPeca)}`
                : 'ainda não salvo no projeto'
              : `salvo no projeto em ${diaCurto(salvoNoProjeto!.calculadoEm)}`}
          </p>
        )}
      </section>

      <div class="cartao-lista">
        <div class="linha-campo">
          <div class="linha-campo-texto">
            <strong>Peças iguais</strong>
            <small>{varias ? 'fios e outros custos são por peça' : 'faz mais de uma? aumente aqui'}</small>
          </div>
          <div class="stepper">
            <button aria-label="Menos uma peça" disabled={quantidade <= 1} onClick={() => atualizar({ quantidade: quantidade - 1 })}>
              <Icone nome="menos" tamanho={18} />
            </button>
            <CampoInteiro valor={quantidade} aoMudar={(q) => atualizar({ quantidade: Math.max(1, q) })} rotulo="Peças iguais" sufixo="" max={9999} vazioQuandoZero={false} />
            <button aria-label="Mais uma peça" onClick={() => atualizar({ quantidade: Math.min(9999, quantidade + 1) })}>
              <Icone nome="mais" tamanho={18} />
            </button>
          </div>
        </div>
      </div>

      <section class="composicao" aria-label="Composição do preço">
        <div class="barra">
          <span class="seg fios" style={{ width: `${comp.fios * 100}%` }} />
          <span class="seg trabalho" style={{ width: `${comp.trabalho * 100}%` }} />
          <span class="seg outros" style={{ width: `${comp.outros * 100}%` }} />
          <span class="seg lucro" style={{ width: `${comp.lucro * 100}%` }} />
        </div>
        <ul class="legenda">
          <li><i class="fios" />Fios <strong>{brl(res.fios)}</strong></li>
          <li><i class="trabalho" />Trabalho <strong>{brl(res.trabalho)}</strong></li>
          <li><i class="outros" />Outros <strong>{brl(res.outros)}</strong></li>
          <li><i class="lucro" />Lucro <strong>{brl(res.lucro)}</strong></li>
        </ul>
        {varias && <p class="composicao-nota">Valores das {quantidade} peças juntas.</p>}
      </section>

      {tempoMudou && (
        <div class="aviso">
          <p>
            O cronômetro mudou desde o cálculo: agora são <strong>{formatarTotal(minutosCrono! * 60_000)}</strong>.
          </p>
          <button class="botao" onClick={() => atualizar({ minutosDoCrono: true })}>
            Usar tempo novo
          </button>
        </div>
      )}

      <div class="secao-cabecalho">
        <h2 class="secao-titulo">Fios{porPeca}</h2>
        <span class="secao-valor">{brl(fiosPorPeca)}</span>
      </div>
      <div class="cartao-lista">
        {r.fios.map((f) => {
          const n = novelo(f.noveloId);
          const nome = nomeDoFio(f);
          return (
            <div key={f.chave} class="linha-fio">
              <button class="linha-fio-principal" onClick={() => setFioSheet({ chave: f.chave })}>
                {f.noveloId ? (
                  <span class="capa capa-p" style={n ? estiloCapa(n.capaCor, n.textura) : { background: 'var(--divisoria)' }} />
                ) : (
                  <span class="capa capa-p" style={{ background: 'var(--divisoria)' }}>
                    <Icone nome="calcular" tamanho={18} />
                  </span>
                )}
                <span class="linha-projeto-texto">
                  <strong>{nome}</strong>
                  <small>{f.noveloId ? [n?.marca, `${f.gramas} g`].filter(Boolean).join(' · ') : 'valor manual'}</small>
                </span>
                <span class="linha-fio-valor">{brl(custoDoFio(f))}</span>
              </button>
              <button class="botao-x" aria-label={`Remover ${nome}`} onClick={() => removerFio(f.chave)}>
                <Icone nome="fechar" tamanho={16} />
              </button>
            </div>
          );
        })}
        <button class="linha-adicionar" onClick={() => setFioSheet({ chave: null })}>
          <span class="mais-redondo"><Icone nome="mais" tamanho={16} espessura={2.2} /></span>
          Adicionar fio
        </button>
      </div>

      <h2 class="secao-titulo">Mão de obra</h2>
      <div class="cartao-lista">
        <div class="linha-campo">
          <div class="linha-campo-texto">
            <strong>Horas trabalhadas{varias ? ' (todas as peças)' : ''}</strong>
            {projeto &&
              (r.minutosDoCrono ? (
                <small>do cronômetro</small>
              ) : minutosCrono !== null && minutosCrono !== r.minutos ? (
                <button class="link-pequeno" onClick={() => atualizar({ minutosDoCrono: true })}>
                  usar cronômetro ({formatarTotal(minutosCrono * 60_000)})
                </button>
              ) : null)}
          </div>
          <div class="campos-hm">
            <CampoInteiro
              valor={Math.floor(minutos / 60)}
              aoMudar={(h) => atualizar({ minutos: h * 60 + (minutos % 60), minutosDoCrono: false })}
              rotulo="Horas"
              sufixo="h"
              max={999}
              vazioQuandoZero={false}
            />
            <CampoInteiro
              valor={minutos % 60}
              aoMudar={(m) => atualizar({ minutos: Math.floor(minutos / 60) * 60 + Math.min(59, m), minutosDoCrono: false })}
              rotulo="Minutos"
              sufixo="min"
              max={59}
              vazioQuandoZero={false}
            />
          </div>
        </div>
        <div class="linha-campo">
          <div class="linha-campo-texto">
            <strong>Valor por hora</strong>
            <Padrao
              ehPadrao={r.valorHoraCentavos === padroes!.valorHoraCentavos}
              aoSalvar={() => {
                void salvarConfig('valorHoraCentavos', r.valorHoraCentavos);
                toast(`${brl(r.valorHoraCentavos)}/h é o novo padrão`);
              }}
            />
          </div>
          <div class="campo-estreito">
            <CampoDinheiro centavos={r.valorHoraCentavos} aoMudar={(v) => atualizar({ valorHoraCentavos: v })} rotulo="Valor por hora" />
          </div>
        </div>
      </div>

      <div class="secao-cabecalho">
        <h2 class="secao-titulo">Outros custos{porPeca}</h2>
        <span class="secao-valor">{brl(outrosPorPeca)}</span>
      </div>
      <div class="cartao-lista">
        {r.extras.map((e) => (
          <div key={e.chave} class="linha-extra">
            <input
              class="campo campo-plano"
              value={e.nome}
              placeholder="ex: olhos de segurança"
              aria-label="Nome do custo"
              onInput={(ev) => {
                const nome = ev.currentTarget.value;
                atualizar((a) => ({ ...a, extras: a.extras.map((x) => (x.chave === e.chave ? { ...x, nome } : x)) }));
              }}
            />
            <div class="campo-estreito">
              <CampoDinheiro
                compacto
                centavos={e.valorCentavos}
                rotulo={`Valor de ${e.nome || 'outro custo'}`}
                aoMudar={(v) => atualizar((a) => ({ ...a, extras: a.extras.map((x) => (x.chave === e.chave ? { ...x, valorCentavos: v } : x)) }))}
              />
            </div>
            <button
              class="botao-x"
              aria-label={`Remover ${e.nome || 'custo'}`}
              onClick={() => {
                const antes = r;
                atualizar((a) => ({ ...a, extras: a.extras.filter((x) => x.chave !== e.chave) }));
                toast('Custo removido', { rotulo: 'Desfazer', fazer: () => substituir(antes) });
              }}
            >
              <Icone nome="fechar" tamanho={16} />
            </button>
          </div>
        ))}
        <button
          class="linha-adicionar"
          onClick={() => atualizar((a) => ({ ...a, extras: [...a.extras, { chave: chave(), nome: '', valorCentavos: 0 }] }))}
        >
          <span class="mais-redondo"><Icone nome="mais" tamanho={16} espessura={2.2} /></span>
          Adicionar custo
        </button>
      </div>

      <h2 class="secao-titulo">Margem de lucro</h2>
      <div class="cartao-lista">
        <div class="linha-campo">
          <div class="linha-campo-texto">
            <strong>Lucro</strong>
            <small>aplicado sobre fios + trabalho + outros</small>
            <Padrao
              ehPadrao={r.margemPct === padroes!.margemPct}
              aoSalvar={() => {
                void salvarConfig('margemPct', r.margemPct);
                toast(`${r.margemPct}% é a nova margem padrão`);
              }}
            />
          </div>
          <div class="stepper">
            <button aria-label="Diminuir margem" onClick={() => atualizar({ margemPct: Math.max(0, r.margemPct - 5) })}>
              <Icone nome="menos" tamanho={18} />
            </button>
            <CampoInteiro valor={r.margemPct} aoMudar={(m) => atualizar({ margemPct: m })} rotulo="Margem de lucro" sufixo="%" max={500} vazioQuandoZero={false} />
            <button aria-label="Aumentar margem" onClick={() => atualizar({ margemPct: Math.min(500, r.margemPct + 5) })}>
              <Icone nome="mais" tamanho={18} />
            </button>
          </div>
        </div>
      </div>

      <div class="acoes-calc">
        <button class="botao" onClick={() => void copiar()}>
          Copiar valor
        </button>
        {projeto ? (
          <button class="botao primario" disabled={!naoSalvo} onClick={() => void salvarNoProjeto()}>
            {naoSalvo ? 'Salvar no projeto' : 'Salvo no projeto'}
          </button>
        ) : (
          <button class="botao primario" onClick={() => setCriando(true)}>
            Criar projeto
          </button>
        )}
      </div>
      {res.porPeca > 0 && (
        <button class="link-pequeno link-shopee" onClick={() => void verNaShopee()}>
          Quanto sobra vendendo na Shopee? →
        </button>
      )}

      <FioSheet
        aberta={fioSheet !== null}
        aoFechar={() => setFioSheet(null)}
        novelos={novelos!}
        inicial={fioEditando}
        aoSalvar={salvarFio}
        varias={varias}
      />

      <Sheet aberta={trocando} aoFechar={() => setTrocando(false)} titulo="Calcular para">
        <ul class="lista">
          <li class={'linha-projeto' + (!projeto ? ' selecionada' : '')} onClick={() => void trocarContexto(null)}>
            <span class="capa capa-p" style={{ background: 'var(--rosa-suave)' }}>
              <Icone nome="calcular" />
            </span>
            <span class="linha-projeto-texto">
              <strong>Cálculo avulso</strong>
              <small>orçamento sem projeto</small>
            </span>
          </li>
          {[...dados!.projetos]
            .sort((a, b) => (a.status === b.status ? 0 : a.status === 'fazendo' ? -1 : 1))
            .map((p) => (
              <li key={p.id} class={'linha-projeto' + (p.id === projeto?.id ? ' selecionada' : '')} onClick={() => void trocarContexto(p.id)}>
                <span class="capa capa-p" style={estiloCapa(p.capaCor)} />
                <span class="linha-projeto-texto">
                  <strong>{p.nome}</strong>
                  <small>{p.precoCentavos !== null ? brl(p.precoCentavos) : 'sem preço'}{p.status === 'concluido' ? ' · concluído' : ''}</small>
                </span>
              </li>
            ))}
        </ul>
      </Sheet>

      <CriarProjetoSheet aberta={criando} aoFechar={() => setCriando(false)} aoCriar={(nome) => void criarComCalculo(nome)} total={res.porPeca} />
    </main>
  );
}

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(area);
    area.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}

function Padrao({ ehPadrao, aoSalvar }: { ehPadrao: boolean; aoSalvar: () => void }) {
  return ehPadrao ? (
    <small>seu padrão</small>
  ) : (
    <button class="link-pequeno" onClick={aoSalvar}>
      usar como padrão
    </button>
  );
}

function CriarProjetoSheet(props: Parameters<typeof CriarProjetoAberta>[0]) {
  return props.aberta ? <CriarProjetoAberta {...props} /> : null;
}

function CriarProjetoAberta({
  aberta,
  aoFechar,
  aoCriar,
  total
}: {
  aberta: boolean;
  aoFechar: () => void;
  aoCriar: (nome: string) => void;
  total: number;
}) {
  const [nome, setNome] = useState('');
  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Criar projeto" subtitulo={`O projeto já começa com o preço de ${brl(total)}.`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          aoCriar(nome);
        }}
      >
        <label class="rotulo" for="cp-nome">
          Nome do projeto
        </label>
        <input id="cp-nome" class="campo" value={nome} onInput={(e) => setNome(e.currentTarget.value)} placeholder="ex: Urso Theo (encomenda)" />
        <button type="submit" class="botao primario largo" style={{ marginTop: 16 }}>
          Criar projeto
        </button>
      </form>
    </Sheet>
  );
}
