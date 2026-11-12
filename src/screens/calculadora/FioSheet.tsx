import { useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { SeletorCapa } from '../../components/SeletorCapa.tsx';
import { CampoDinheiro, CampoInteiro } from '../../components/Campos.tsx';
import { DescontoEmbalagem, usePesoEmbalagem } from '../../components/DescontoEmbalagem.tsx';
import { Icone } from '../../components/Icone.tsx';
import { PesagensNovelo } from '../../components/PesagensNovelo.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { novoId } from '../../db/db.ts';
import { criarNovelo, lerNovelo } from '../../db/repo.ts';
import { ordenarUnidades, rotuloUnidade, type Unidade } from '../../domain/unidades.ts';
import type { Novelo, Textura } from '../../db/types.ts';
import type { UsoDaUnidade } from '../../domain/fios.ts';
import { formatarEstoque } from '../../domain/estoque.ts';
import { filtrar, nomeDoNovelo, noveloRepetido } from '../../domain/novelos.ts';
import { descontarEmbalagem, PESAGENS_VAZIAS, unidadesDasPesagens, type Pesagens } from '../../domain/pesagem.ts';
import { brl, custoDoFio, precoPorGrama } from '../../domain/preco.ts';
import { ListasNovelo } from '../novelos/NoveloForm.tsx';

export interface FioEditado {
  noveloId: string | null;
  gramas: number;
  precoPorGramaCentavos: number;
  nome?: string;
  valorCentavos?: number;
  unidadeId?: string | null;
  aPesar?: boolean;
  antesG?: number;
}

type Modo = 'fim' | 'sobrou' | 'usei';
type Passo = 'escolher' | 'unidade' | 'novo' | 'manual';

type PropsFio = Parameters<typeof FioSheetAberta>[0];

export function FioSheet(props: PropsFio) {
  return props.aberta ? <FioSheetAberta {...props} /> : null;
}

const porNome = (a: Novelo, b: Novelo) => nomeDoNovelo(a).localeCompare(nomeDoNovelo(b), 'pt-BR', { sensitivity: 'base' });

function sugerida(us: Unidade[], emUso?: Map<string, UsoDaUnidade>): string | null {
  const livres = us.filter((u) => !emUso?.has(u.id));
  const ordem = [...livres].sort((a, b) => (a.fechado === b.fechado ? a.pesoG - b.pesoG : a.fechado ? 1 : -1));
  return ordem[0]?.id ?? null;
}

function FioSheetAberta({
  aberta,
  aoFechar,
  novelos,
  inicial,
  aoSalvar,
  varias,
  semManual = false,
  pesarNoFim = false,
  emUso,
  aoTirar
}: {
  aberta: boolean;
  aoFechar: () => void;
  novelos: Novelo[];
  inicial: FioEditado | null;
  aoSalvar: (f: FioEditado) => void;
  varias: boolean;
  semManual?: boolean;
  pesarNoFim?: boolean;
  emUso?: Map<string, UsoDaUnidade>;
  aoTirar?: () => void;
}) {
  const ehManual = !!inicial && inicial.noveloId === null;
  const noveloInicial = novelos.find((n) => n.id === inicial?.noveloId);
  const noveloExcluido = !!inicial?.noveloId && !noveloInicial;
  const [noveloId, setNoveloId] = useState<string | null>(noveloInicial?.id ?? null);
  const [unidadeId, setUnidadeId] = useState<string | null | undefined>(inicial ? (inicial.unidadeId ?? null) : undefined);
  const [passo, setPasso] = useState<Passo>(ehManual ? 'manual' : 'escolher');
  const [busca, setBusca] = useState('');
  const [modo, setModo] = useState<Modo>(pesarNoFim ? (inicial && !inicial.aPesar ? 'usei' : 'fim') : inicial ? 'usei' : 'sobrou');
  const [sobrou, setSobrou] = useState<number | null>(null);
  const [acabou, setAcabou] = useState(false);
  const [pesarAntes, setPesarAntes] = useState(false);
  const [antesBalanca, setAntesBalanca] = useState<number | null>(null);
  const [usei, setUsei] = useState<number | null>(inicial && !inicial.aPesar && inicial.gramas > 0 ? inicial.gramas : null);
  const [comEmbalagem, setComEmbalagem] = useState(true);
  const [pesarAgora, setPesarAgora] = useState(false);
  const [balancaAgora, setBalancaAgora] = useState<number | null>(null);

  const novelo = novelos.find((n) => n.id === noveloId);
  const unidade = novelo?.unidades.find((u) => u.id === unidadeId);
  const embalagemG = usePesoEmbalagem(novelo?.tipo ?? '');

  const usarUnidade = (u: Unidade | null) => {
    setUnidadeId(u ? u.id : null);
    setPesarAntes(false);
    setAntesBalanca(null);
    setPesarAgora(false);
    setBalancaAgora(null);
    setSobrou(null);
    setAcabou(false);
    setPasso('escolher');
  };
  const escolher = (n: Novelo) => {
    setNoveloId(n.id);
    if (pesarNoFim && n.unidades.length > 1) {
      setUnidadeId(undefined);
      setPasso('unidade');
    } else usarUnidade(pesarNoFim ? (n.unidades[0] ?? null) : null);
  };

  const titulo = inicial ? 'Editar fio' : 'Adicionar fio';
  const porPeca = varias ? ' por peça' : '';
  const tirar = inicial && aoTirar && (
    <button class="link-pequeno link-centro" onClick={aoTirar}>
      tirar este fio
    </button>
  );

  if (passo === 'manual') {
    return (
      <Sheet aberta={aberta} aoFechar={aoFechar} titulo={titulo} subtitulo={`Um valor qualquer${porPeca}, sem mexer no estoque.`}>
        <FioManual
          inicial={ehManual ? inicial : null}
          porPeca={porPeca}
          aoVoltar={ehManual ? null : () => setPasso('escolher')}
          aoSalvar={(nome, valorCentavos) => aoSalvar({ noveloId: null, gramas: 0, precoPorGramaCentavos: 0, nome, valorCentavos })}
        />
      </Sheet>
    );
  }

  if (passo === 'novo') {
    return (
      <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Novo novelo" subtitulo="Cadastro rápido. Os outros detalhes ficam na aba Novelos.">
        <NovoNovelo novelos={novelos} aoCancelar={() => setPasso('escolher')} aoCriar={escolher} />
      </Sheet>
    );
  }

  if (passo === 'unidade' && novelo) {
    const sugestao = sugerida(novelo.unidades, emUso);
    return (
      <Sheet aberta={aberta} aoFechar={aoFechar} titulo={nomeDoNovelo(novelo)} subtitulo="Qual novelo você vai usar?">
        <ul class="unidades escolher">
          {ordenarUnidades(novelo.unidades).map((u) => (
            <li key={u.id}>
              <button class={'unidade' + (u.id === sugestao ? ' sugerida' : '')} onClick={() => usarUnidade(u)}>
                <span class="unidade-numero">{rotuloUnidade(u)}</span>
                <span class="unidade-texto">
                  {u.fechado ? 'fechado' : 'aberto'}
                  {u.id === sugestao && !u.fechado && <small>sugerido: o resto mais leve</small>}
                  {emUso?.has(u.id) && <small>em uso: {emUso.get(u.id)!.projeto}</small>}
                </span>
                <strong>{u.pesoG} g</strong>
              </button>
            </li>
          ))}
        </ul>
        <button class="link-pequeno link-centro" onClick={() => setNoveloId(null)}>
          escolher outro fio
        </button>
      </Sheet>
    );
  }

  if (!novelo) {
    const filtrados = [...filtrar(novelos, busca)].sort(porNome);
    return (
      <Sheet aberta={aberta} aoFechar={aoFechar} titulo={titulo} subtitulo="Escolha o novelo do estoque.">
        {noveloExcluido && <p class="aviso-uso">O novelo deste fio foi excluído. Escolha outro do estoque ou tire o fio.</p>}
        <div class="opcoes-fio">
          {!semManual && (
            <button class="botao" onClick={() => setPasso('manual')}>
              <Icone nome="calcular" tamanho={18} /> Valor manual
            </button>
          )}
          <button class="botao" onClick={() => setPasso('novo')}>
            <Icone nome="mais" tamanho={18} /> Novo novelo
          </button>
        </div>
        {novelos.length > 0 && (
          <input
            class="campo"
            style={{ marginTop: 12 }}
            type="search"
            placeholder="Buscar tipo, cor ou marca…"
            value={busca}
            onInput={(e) => setBusca(e.currentTarget.value)}
            aria-label="Buscar novelo"
          />
        )}
        <ul class="lista" style={{ marginTop: 12 }}>
          {filtrados.map((n) => (
            <li key={n.id} class="linha-projeto" onClick={() => escolher(n)}>
              <Capa class="capa capa-p" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId} />
              <span class="linha-projeto-texto">
                <strong>{nomeDoNovelo(n)}</strong>
                <small>
                  {[
                    n.marca,
                    `${brl(precoPorGrama(n.precoCentavos, n.gramatura))}/g`,
                    n.unidades.length ? `${n.unidades.length} ${n.unidades.length === 1 ? 'novelo' : 'novelos'} · ${formatarEstoque(n.estoqueG)}` : 'sem estoque'
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
            </li>
          ))}
        </ul>
        {novelos.length === 0 && <p class="texto-apagado">Nenhum novelo cadastrado ainda.</p>}
        {novelos.length > 0 && filtrados.length === 0 && <p class="texto-apagado">Nada encontrado.</p>}
        {tirar}
      </Sheet>
    );
  }

  const ppg = inicial && inicial.noveloId === noveloId ? inicial.precoPorGramaCentavos : precoPorGrama(novelo.precoCentavos, novelo.gramatura);
  const emb = comEmbalagem ? embalagemG : 0;
  const semEmbalagem = (balanca: number) => descontarEmbalagem(balanca, 1, emb);

  const antesBase = unidade ? unidade.pesoG : novelo.gramatura;
  const antesLiquido = pesarAntes ? (antesBalanca === null ? null : semEmbalagem(antesBalanca)) : antesBase;
  const sobraLiquida = acabou ? 0 : sobrou === null ? null : semEmbalagem(sobrou);
  const gramas: number | null =
    modo === 'usei' ? usei : modo === 'sobrou' ? (antesLiquido === null || sobraLiquida === null ? null : Math.max(0, antesLiquido - sobraLiquida)) : null;
  const sobrouDemais = modo === 'sobrou' && antesLiquido !== null && sobraLiquida !== null && sobraLiquida > antesLiquido;

  const mesmoDoInicial = !!inicial?.aPesar && inicial.unidadeId === (unidadeId ?? null) && inicial.antesG !== undefined;
  const antesDoEstoque = mesmoDoInicial ? inicial!.antesG! : (unidade?.pesoG ?? 0);
  const antesFim = pesarAgora || !unidade ? (balancaAgora === null ? null : semEmbalagem(balancaAgora)) : antesDoEstoque;
  const faltaUnidade = pesarNoFim && modo === 'fim' && !unidade && novelo.unidades.length > 0;
  const podeSalvar = modo === 'fim' ? !faltaUnidade && (antesFim ?? 0) > 0 : (gramas ?? 0) > 0 && !sobrouDemais;
  const nomeUnidade = unidade ? ` ${rotuloUnidade(unidade)}` : '';
  const usoDaUnidade = unidade ? emUso?.get(unidade.id) : undefined;

  const salvar = () => {
    if (!podeSalvar) return;
    const base = { noveloId: novelo.id, precoPorGramaCentavos: ppg, unidadeId: unidadeId ?? null };
    if (modo === 'fim') aoSalvar({ ...base, gramas: 0, aPesar: true, antesG: antesFim ?? 0 });
    else aoSalvar({ ...base, gramas: gramas ?? 0 });
  };

  const linkModo = (m: Modo, texto: string) => (
    <button type="button" class="link-pequeno" onClick={() => setModo(m)}>
      {texto}
    </button>
  );

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo={titulo}>
      <div class="linha-projeto" style={{ marginTop: 8 }}>
        <Capa class="capa capa-p" cor={novelo.capaCor} textura={novelo.textura} fotoId={novelo.fotoId} />
        <span class="linha-projeto-texto">
          <strong>
            {nomeDoNovelo(novelo)}
            {nomeUnidade}
          </strong>
          <small>
            {[novelo.marca, unidade ? `${unidade.fechado ? 'fechado' : 'aberto'}, ${unidade.pesoG} g` : '', `${brl(ppg)}/g`].filter(Boolean).join(' · ')}
          </small>
        </span>
        <button class="botao-texto" onClick={() => (pesarNoFim && novelo.unidades.length > 1 ? setPasso('unidade') : setNoveloId(null))}>
          trocar
        </button>
      </div>
      {usoDaUnidade && !mesmoDoInicial && <p class="aviso-uso">Este novelo já está em uso em {usoDaUnidade.projeto}.</p>}

      {!pesarNoFim && (
        <div class="segmentado" role="tablist" aria-label="Como informar">
          <button role="tab" aria-selected={modo === 'sobrou'} class={modo === 'sobrou' ? 'ativo' : ''} onClick={() => setModo('sobrou')}>
            Pesei o que sobrou
          </button>
          <button role="tab" aria-selected={modo === 'usei'} class={modo === 'usei' ? 'ativo' : ''} onClick={() => setModo('usei')}>
            Sei quanto usei
          </button>
        </div>
      )}

      {modo === 'fim' && (
        <>
          <p class="texto-apagado">Ao concluir o projeto, você pesa o que sobrou deste novelo e o app calcula quanto usou.</p>
          {faltaUnidade ? (
            <button class="botao largo" onClick={() => setPasso('unidade')}>
              Escolher qual novelo (#)
            </button>
          ) : unidade && !pesarAgora ? (
            <div class="peso-antes">
              <span>
                Peso de antes
                <small>{mesmoDoInicial ? 'de quando o fio entrou no projeto' : `do estoque (${rotuloUnidade(unidade)})`}</small>
              </span>
              <strong>{antesDoEstoque} g</strong>
              <button class="botao-texto" onClick={() => setPesarAgora(true)}>
                o peso mudou? pesar de novo
              </button>
            </div>
          ) : (
            <>
              {!unidade && <p class="texto-apagado">Este novelo não está no estoque: pese-o agora. Ao concluir, o que sobrar entra no estoque.</p>}
              <label class="rotulo" for="fio-antes-agora">
                Peso de antes, na balança
              </label>
              <CampoInteiro id="fio-antes-agora" permiteVazio valor={balancaAgora} aoMudar={setBalancaAgora} rotulo="Peso de antes, na balança" sufixo="g" />
              <DescontoEmbalagem tipo={novelo.tipo} embalagemG={embalagemG} ligado={comEmbalagem} aoLigar={setComEmbalagem} />
              {unidade && (
                <button class="link-pequeno" onClick={() => setPesarAgora(false)}>
                  usar o peso do estoque ({antesDoEstoque} g)
                </button>
              )}
            </>
          )}
        </>
      )}

      {modo === 'sobrou' && (
        <>
          {pesarAntes ? (
            <>
              <label class="rotulo" for="fio-antes">
                Antes, na balança
              </label>
              <CampoInteiro id="fio-antes" permiteVazio valor={antesBalanca} aoMudar={setAntesBalanca} rotulo="Peso de antes, na balança" sufixo="g" />
              <button class="link-pequeno" onClick={() => setPesarAntes(false)}>
                usar {antesBase} g ({unidade ? `do estoque, ${rotuloUnidade(unidade)}` : 'um novelo fechado'})
              </button>
            </>
          ) : (
            <div class="peso-antes">
              <span>
                Pesava antes
                <small>{unidade ? `do estoque (${rotuloUnidade(unidade)})` : `um novelo fechado de ${novelo.gramatura} g`}</small>
              </span>
              <strong>{antesBase} g</strong>
              <button class="botao-texto" onClick={() => setPesarAntes(true)}>
                {unidade ? 'pesei o antes também' : 'era um aberto? pesei antes'}
              </button>
            </div>
          )}
          <label class="rotulo" for="fio-sobrou">
            Sobrou, na balança
          </label>
          <div class="sobra-linha">
            <CampoInteiro
              id="fio-sobrou"
              permiteVazio
              valor={acabou ? 0 : sobrou}
              aoMudar={(v) => {
                setSobrou(v);
                setAcabou(false);
              }}
              rotulo="Sobrou, na balança"
              sufixo="g"
            />
            <button type="button" class={'chip' + (acabou ? ' ativo' : '')} aria-pressed={acabou} onClick={() => setAcabou(!acabou)}>
              acabou
            </button>
          </div>
          {!acabou && (
            <DescontoEmbalagem
              tipo={novelo.tipo}
              embalagemG={embalagemG}
              ligado={comEmbalagem}
              aoLigar={setComEmbalagem}
              oQue={pesarAntes ? 'de cada pesagem (antes e sobra)' : 'do que sobrou'}
            />
          )}
          {sobrouDemais && <p class="erro">O que sobrou não pode pesar mais que antes.</p>}
          {varias && <p class="texto-apagado">Pese o que sobrou depois de fazer uma peça.</p>}
        </>
      )}

      {modo === 'usei' && (
        <>
          <label class="rotulo" for="fio-usei">
            Usei{porPeca}
          </label>
          <CampoInteiro id="fio-usei" permiteVazio valor={usei} aoMudar={setUsei} rotulo={`Gramas usadas${porPeca}`} sufixo="g" />
        </>
      )}

      {pesarNoFim && (
        <div class="modos-fio">
          {modo !== 'fim' && linkModo('fim', '← pesar no fim')}
          {modo !== 'sobrou' && linkModo('sobrou', 'já usei e pesei a sobra')}
          {modo !== 'usei' && linkModo('usei', 'sei quanto usei')}
        </div>
      )}

      {modo !== 'fim' && (
        <div class="resumo-fio">
          <span>
            Usou <strong>{gramas === null ? '—' : `${gramas} g`}</strong>
            {porPeca}
          </span>
          <strong class="resumo-fio-valor">{gramas === null ? '—' : brl(custoDoFio({ gramas, precoPorGramaCentavos: ppg }))}</strong>
        </div>
      )}

      <button class="botao primario largo" disabled={!podeSalvar} onClick={salvar}>
        {inicial ? 'Salvar fio' : 'Adicionar fio'}
      </button>
      {tirar}
    </Sheet>
  );
}

function FioManual({
  inicial,
  porPeca,
  aoVoltar,
  aoSalvar
}: {
  inicial: FioEditado | null;
  porPeca: string;
  aoVoltar: (() => void) | null;
  aoSalvar: (nome: string, valorCentavos: number) => void;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [valor, setValor] = useState(inicial?.valorCentavos ?? 0);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valor > 0) aoSalvar(nome.trim(), valor);
      }}
    >
      <label class="rotulo" for="fm-nome">
        Nome <span class="opcional">opcional</span>
      </label>
      <input id="fm-nome" class="campo" value={nome} onInput={(e) => setNome(e.currentTarget.value)} placeholder="ex: sobra de linha branca" autocomplete="off" />
      <label class="rotulo" for="fm-valor">
        Valor{porPeca}
      </label>
      <CampoDinheiro id="fm-valor" centavos={valor} aoMudar={setValor} rotulo={`Valor do fio${porPeca}`} />
      <div class="ajuste-botoes" style={{ marginTop: 18 }}>
        {aoVoltar && (
          <button type="button" class="botao" onClick={aoVoltar}>
            Voltar
          </button>
        )}
        <button type="submit" class="botao primario" disabled={valor <= 0}>
          {inicial ? 'Salvar fio' : 'Adicionar fio'}
        </button>
      </div>
    </form>
  );
}

function NovoNovelo({ novelos, aoCancelar, aoCriar }: { novelos: Novelo[]; aoCancelar: () => void; aoCriar: (n: Novelo) => void }) {
  const [tipo, setTipo] = useState('');
  const [cor, setCor] = useState('');
  const [marca, setMarca] = useState('');
  const [gramatura, setGramatura] = useState(100);
  const [preco, setPreco] = useState(0);
  const [pesagens, setPesagens] = useState<Pesagens>(PESAGENS_VAZIAS);
  const [comEmbalagem, setComEmbalagem] = useState(true);
  const [capa, setCapa] = useState('');
  const [textura, setTextura] = useState<Textura>('liso');
  const [tentou, setTentou] = useState(false);
  const embalagemG = usePesoEmbalagem(tipo);
  const repetido = noveloRepetido(novelos, tipo, cor, marca);
  const faltando = [!cor.trim() && 'o nome da cor', gramatura <= 0 && 'a gramatura', !capa && 'a cor da capa'].filter((x): x is string => !!x);

  const salvar = async (e: Event) => {
    e.preventDefault();
    if (faltando.length) return setTentou(true);
    const unidades = unidadesDasPesagens(pesagens, gramatura, comEmbalagem ? embalagemG : 0, novoId);
    const id = await criarNovelo({ cor, marca, tipo, gramatura, precoCentavos: preco, unidades, capaCor: capa, textura });
    const criado = await lerNovelo(id);
    if (criado) aoCriar(criado);
  };

  return (
    <form onSubmit={salvar}>
      <div class="grade-2">
        <div>
          <label class="rotulo" for="nn-tipo">
            Tipo
          </label>
          <input id="nn-tipo" class="campo" list="lista-tipos" value={tipo} onInput={(e) => setTipo(e.currentTarget.value)} placeholder="ex: Chenille" autocomplete="off" />
        </div>
        <div>
          <label class="rotulo" for="nn-cor">
            Cor
          </label>
          <input id="nn-cor" class="campo" value={cor} onInput={(e) => setCor(e.currentTarget.value)} placeholder="ex: Rosa Chá" autocomplete="off" />
        </div>
      </div>
      <label class="rotulo" for="nn-marca">
        Marca <span class="opcional">opcional</span>
      </label>
      <input id="nn-marca" class="campo" list="lista-marcas" value={marca} onInput={(e) => setMarca(e.currentTarget.value)} placeholder="ex: Círculo" autocomplete="off" />
      {repetido && (
        <div class="aviso-repetido" role="status">
          <span>Você já tem esse novelo{repetido.estoqueG > 0 ? ` (${formatarEstoque(repetido.estoqueG)})` : ''}.</span>
          <button type="button" class="botao-texto" onClick={() => aoCriar(repetido)}>
            Usar este
          </button>
        </div>
      )}
      <div class="grade-2">
        <div>
          <label class="rotulo" for="nn-gram">
            Gramatura
          </label>
          <CampoInteiro id="nn-gram" valor={gramatura} aoMudar={setGramatura} rotulo="Gramatura do novelo" sufixo="g" />
        </div>
        <div>
          <label class="rotulo" for="nn-preco">
            Preço <span class="opcional">opcional</span>
          </label>
          <CampoDinheiro id="nn-preco" centavos={preco} aoMudar={setPreco} rotulo="Preço do novelo" />
        </div>
      </div>
      <p class="rotulo">Estoque</p>
      <PesagensNovelo
        tipo={tipo}
        gramatura={gramatura}
        embalagemG={embalagemG}
        pesagens={pesagens}
        aoMudar={setPesagens}
        comEmbalagem={comEmbalagem}
        aoLigar={setComEmbalagem}
      />
      <p class="rotulo">Cor da capa</p>
      <SeletorCapa compacto cor={capa} aoMudarCor={setCapa} textura={textura} aoMudarTextura={setTextura} />
      {tentou && faltando.length > 0 && <p class="erro">Falta {faltando.join(', ').replace(/, ([^,]*)$/, ' e $1')}.</p>}
      <div class="ajuste-botoes" style={{ marginTop: 18 }}>
        <button type="button" class="botao" onClick={aoCancelar}>
          Voltar
        </button>
        <button type="submit" class="botao primario">
          Salvar novelo
        </button>
      </div>
      <ListasNovelo novelos={novelos} />
    </form>
  );
}
