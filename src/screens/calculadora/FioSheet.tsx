import { useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { SeletorCapa } from '../../components/SeletorCapa.tsx';
import { CampoDinheiro, CampoInteiro } from '../../components/Campos.tsx';
import { DescontoEmbalagem, usePesoEmbalagem } from '../../components/DescontoEmbalagem.tsx';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { CAPA_PADRAO, criarNovelo } from '../../db/repo.ts';
import type { Novelo, Textura } from '../../db/types.ts';
import { formatarEstoque } from '../../domain/estoque.ts';
import { nomeDoNovelo } from '../../domain/novelos.ts';
import { descontarEmbalagem } from '../../domain/pesagem.ts';
import { brl, custoDoFio, gramasUsadas, precoPorGrama } from '../../domain/preco.ts';
import { ListasNovelo } from '../novelos/NoveloForm.tsx';

export interface FioEditado {
  noveloId: string | null;
  gramas: number;
  precoPorGramaCentavos: number;
  nome?: string;
  valorCentavos?: number;
}

type Modo = 'sobrou' | 'usei';
type Passo = 'escolher' | 'novo' | 'manual';

type PropsFio = Parameters<typeof FioSheetAberta>[0];

export function FioSheet(props: PropsFio) {
  return props.aberta ? <FioSheetAberta {...props} /> : null;
}

function FioSheetAberta({
  aberta,
  aoFechar,
  novelos,
  inicial,
  aoSalvar,
  varias
}: {
  aberta: boolean;
  aoFechar: () => void;
  novelos: Novelo[];
  inicial: FioEditado | null;
  aoSalvar: (f: FioEditado) => void;
  varias: boolean;
}) {
  const ehManual = !!inicial && inicial.noveloId === null;
  const [noveloId, setNoveloId] = useState<string | null>(inicial?.noveloId ?? null);
  const [passo, setPasso] = useState<Passo>(ehManual ? 'manual' : 'escolher');
  const [busca, setBusca] = useState('');
  const [modo, setModo] = useState<Modo>(inicial ? 'usei' : 'sobrou');
  const [antes, setAntes] = useState(() => novelos.find((n) => n.id === inicial?.noveloId)?.gramatura ?? 0);
  const [sobrou, setSobrou] = useState(0);
  const [usei, setUsei] = useState(inicial?.gramas ?? 0);
  const [comEmbalagem, setComEmbalagem] = useState(true);
  const [antesPesado, setAntesPesado] = useState(false);

  const novelo = novelos.find((n) => n.id === noveloId);
  const embalagemG = usePesoEmbalagem(novelo?.tipo ?? '');
  const escolher = (n: Novelo) => {
    setNoveloId(n.id);
    setAntes(n.gramatura);
    setAntesPesado(false);
    setSobrou(0);
    setPasso('escolher');
  };

  const titulo = inicial ? 'Editar fio' : 'Adicionar fio';
  const porPeca = varias ? ' por peça' : '';

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

  if (!novelo) {
    const q = busca.trim().toLowerCase();
    const filtrados = novelos.filter((n) => !q || `${n.tipo} ${n.cor} ${n.marca}`.toLowerCase().includes(q));
    return (
      <Sheet aberta={aberta} aoFechar={aoFechar} titulo={titulo} subtitulo="Escolha o novelo do estoque.">
        <div class="opcoes-fio">
          <button class="botao" onClick={() => setPasso('manual')}>
            <Icone nome="calcular" tamanho={18} /> Valor manual
          </button>
          <button class="botao" onClick={() => setPasso('novo')}>
            <Icone nome="mais" tamanho={18} /> Novo novelo
          </button>
        </div>
        {novelos.length > 0 && (
          <input
            class="campo"
            style={{ marginTop: 12 }}
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
                  {[n.marca, `${brl(precoPorGrama(n.precoCentavos, n.gramatura))}/g`, formatarEstoque(n.estoqueG)]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
            </li>
          ))}
        </ul>
        {novelos.length === 0 && <p class="texto-apagado">Nenhum novelo cadastrado ainda.</p>}
        {novelos.length > 0 && filtrados.length === 0 && <p class="texto-apagado">Nada encontrado.</p>}
      </Sheet>
    );
  }

  const ppg = inicial && inicial.noveloId === noveloId ? inicial.precoPorGramaCentavos : precoPorGrama(novelo.precoCentavos, novelo.gramatura);
  const descontar = modo === 'sobrou' && embalagemG > 0 && comEmbalagem;
  const sobrouLiquido = descontar && sobrou > 0 ? descontarEmbalagem(sobrou, 1, embalagemG) : sobrou;
  const antesLiquido = descontar && antesPesado ? descontarEmbalagem(antes, 1, embalagemG) : antes;
  const gramas = modo === 'sobrou' ? gramasUsadas(antesLiquido, sobrouLiquido) : usei;
  const sobrouDemais = modo === 'sobrou' && sobrouLiquido > antesLiquido;

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo={titulo}>
      <div class="linha-projeto" style={{ marginTop: 8 }}>
        <Capa class="capa capa-p" cor={novelo.capaCor} textura={novelo.textura} fotoId={novelo.fotoId} />
        <span class="linha-projeto-texto">
          <strong>{nomeDoNovelo(novelo)}</strong>
          <small>{[novelo.marca, `${novelo.gramatura} g`, `${brl(ppg)}/g`].filter(Boolean).join(' · ')}</small>
        </span>
        <button class="botao-texto" onClick={() => setNoveloId(null)}>
          trocar
        </button>
      </div>

      <div class="segmentado" role="tablist" aria-label="Como informar">
        <button role="tab" aria-selected={modo === 'sobrou'} class={modo === 'sobrou' ? 'ativo' : ''} onClick={() => setModo('sobrou')}>
          Pesei o que sobrou
        </button>
        <button role="tab" aria-selected={modo === 'usei'} class={modo === 'usei' ? 'ativo' : ''} onClick={() => setModo('usei')}>
          Sei quanto usei
        </button>
      </div>

      {modo === 'sobrou' ? (
        <div class="grade-2">
          <div>
            <label class="rotulo" for="fio-antes">
              Pesava antes
            </label>
            <CampoInteiro
              id="fio-antes"
              valor={antes}
              aoMudar={(g) => {
                setAntes(g);
                setAntesPesado(true);
              }}
              rotulo="Pesava antes, em gramas"
              sufixo="g"
            />
          </div>
          <div>
            <label class="rotulo" for="fio-sobrou">
              Sobrou
            </label>
            <CampoInteiro id="fio-sobrou" valor={sobrou} aoMudar={setSobrou} rotulo="Sobrou, em gramas" sufixo="g" />
          </div>
        </div>
      ) : (
        <>
          <label class="rotulo" for="fio-usei">
            Usei{porPeca}
          </label>
          <CampoInteiro id="fio-usei" valor={usei} aoMudar={setUsei} rotulo={`Gramas usadas${porPeca}`} sufixo="g" />
        </>
      )}
      {modo === 'sobrou' && (
        <DescontoEmbalagem
          tipo={novelo.tipo}
          embalagemG={embalagemG}
          ligado={comEmbalagem}
          aoLigar={setComEmbalagem}
          oQue={antesPesado ? 'de cada pesagem' : 'do que sobrou'}
        />
      )}
      {sobrouDemais && <p class="erro">O que sobrou não pode pesar mais que antes.</p>}
      {varias && modo === 'sobrou' && <p class="texto-apagado">Pese o que sobrou depois de fazer uma peça.</p>}

      <div class="resumo-fio">
        <span>
          Usou <strong>{gramas} g</strong>
          {porPeca}
        </span>
        <strong class="resumo-fio-valor">{brl(custoDoFio({ gramas, precoPorGramaCentavos: ppg }))}</strong>
      </div>

      <button
        class="botao primario largo"
        disabled={gramas <= 0 || sobrouDemais}
        onClick={() => aoSalvar({ noveloId: novelo.id, gramas, precoPorGramaCentavos: ppg })}
      >
        {inicial ? 'Salvar fio' : 'Adicionar fio'}
      </button>
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
  const [quantos, setQuantos] = useState(1);
  const [capa, setCapa] = useState(CAPA_PADRAO);
  const [textura, setTextura] = useState<Textura>('liso');
  const valido = cor.trim() && gramatura > 0 && preco > 0;

  const salvar = async (e: Event) => {
    e.preventDefault();
    if (!valido) return;
    const novo = { cor, marca, tipo, gramatura, precoCentavos: preco, estoqueG: quantos * gramatura, capaCor: capa, textura };
    const id = await criarNovelo(novo);
    aoCriar({ ...novo, id, cor: cor.trim(), marca: marca.trim(), tipo: tipo.trim(), lote: '', agulha: '', fotoId: null, atualizadoEm: Date.now(), excluidoEm: null });
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
      <div class="grade-2">
        <div>
          <label class="rotulo" for="nn-gram">
            Gramatura
          </label>
          <CampoInteiro id="nn-gram" valor={gramatura} aoMudar={setGramatura} rotulo="Gramatura do novelo" sufixo="g" />
        </div>
        <div>
          <label class="rotulo" for="nn-preco">
            Preço
          </label>
          <CampoDinheiro id="nn-preco" centavos={preco} aoMudar={setPreco} rotulo="Preço do novelo" />
        </div>
      </div>
      <label class="rotulo" for="nn-qtd">
        Quantos você tem
      </label>
      <CampoInteiro id="nn-qtd" valor={quantos} aoMudar={setQuantos} rotulo="Quantidade de novelos" sufixo="novelos" max={999} vazioQuandoZero={false} />
      <p class="rotulo">Capa</p>
      <SeletorCapa cor={capa} aoMudarCor={setCapa} textura={textura} aoMudarTextura={setTextura} />
      <div class="ajuste-botoes" style={{ marginTop: 18 }}>
        <button type="button" class="botao" onClick={aoCancelar}>
          Voltar
        </button>
        <button type="submit" class="botao primario" disabled={!valido}>
          Salvar novelo
        </button>
      </div>
      <ListasNovelo novelos={novelos} />
    </form>
  );
}
