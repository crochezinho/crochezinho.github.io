import { useState } from 'preact/hooks';
import { CAPAS, nomeDaCapa } from '../../app/constantes.ts';
import { SeletorCapa } from '../../components/SeletorCapa.tsx';
import { CampoDinheiro, CampoInteiro } from '../../components/Campos.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { criarNovelo } from '../../db/repo.ts';
import type { Novelo } from '../../db/types.ts';
import { formatarEstoque } from '../../domain/estoque.ts';
import { brl, custoDoFio, gramasUsadas, precoPorGrama } from '../../domain/preco.ts';

export interface FioEditado {
  noveloId: string;
  gramas: number;
  precoPorGramaCentavos: number;
}

type Modo = 'sobrou' | 'usei';

type PropsFio = Parameters<typeof FioSheetAberta>[0];

export function FioSheet(props: PropsFio) {
  return props.aberta ? <FioSheetAberta {...props} /> : null;
}

function FioSheetAberta({
  aberta,
  aoFechar,
  novelos,
  inicial,
  aoSalvar
}: {
  aberta: boolean;
  aoFechar: () => void;
  novelos: Novelo[];
  inicial: FioEditado | null;
  aoSalvar: (f: FioEditado) => void;
}) {
  const [noveloId, setNoveloId] = useState<string | null>(inicial?.noveloId ?? null);
  const [busca, setBusca] = useState('');
  const [criando, setCriando] = useState(false);
  const [modo, setModo] = useState<Modo>(inicial ? 'usei' : 'sobrou');
  const [antes, setAntes] = useState(() => novelos.find((n) => n.id === inicial?.noveloId)?.gramatura ?? 0);
  const [sobrou, setSobrou] = useState(0);
  const [usei, setUsei] = useState(inicial?.gramas ?? 0);

  const novelo = novelos.find((n) => n.id === noveloId);
  const escolher = (n: Novelo) => {
    setNoveloId(n.id);
    setAntes(n.gramatura);
    setSobrou(0);
  };

  const ppg =
    inicial && inicial.noveloId === noveloId
      ? inicial.precoPorGramaCentavos
      : novelo
        ? precoPorGrama(novelo.precoCentavos, novelo.gramatura)
        : 0;
  const gramas = modo === 'sobrou' ? gramasUsadas(antes, sobrou) : usei;
  const sobrouDemais = modo === 'sobrou' && sobrou > antes;

  const titulo = inicial ? 'Editar fio' : 'Adicionar fio';

  if (criando) {
    return (
      <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Novo novelo" subtitulo="Cadastro rápido. Os outros detalhes ficam na aba Novelos.">
        <NovoNovelo
          aoCancelar={() => setCriando(false)}
          aoCriar={(n) => {
            setCriando(false);
            escolher(n);
          }}
        />
      </Sheet>
    );
  }

  if (!novelo) {
    const q = busca.trim().toLowerCase();
    const filtrados = novelos.filter((n) => !q || `${n.cor} ${n.marca} ${n.linha}`.toLowerCase().includes(q));
    return (
      <Sheet aberta={aberta} aoFechar={aoFechar} titulo={titulo} subtitulo="Escolha o novelo do estoque.">
        {novelos.length > 0 && (
          <input
            class="campo"
            placeholder="Buscar cor ou marca…"
            value={busca}
            onInput={(e) => setBusca(e.currentTarget.value)}
            aria-label="Buscar novelo"
          />
        )}
        <ul class="lista" style={{ marginTop: 12 }}>
          {filtrados.map((n) => (
            <li key={n.id} class="linha-projeto" onClick={() => escolher(n)}>
              <span class="capa capa-p" style={{ background: n.capaCor }} />
              <span class="linha-projeto-texto">
                <strong>{n.cor}</strong>
                <small>
                  {[n.marca, `${brl(precoPorGrama(n.precoCentavos, n.gramatura))}/g`, formatarEstoque(n.estoqueG, n.gramatura)]
                    .filter(Boolean)
                    .join(' · ')}
                </small>
              </span>
            </li>
          ))}
        </ul>
        {novelos.length === 0 && <p class="texto-apagado">Nenhum novelo cadastrado ainda.</p>}
        {novelos.length > 0 && filtrados.length === 0 && <p class="texto-apagado">Nada encontrado.</p>}
        <button class="botao largo" style={{ marginTop: 14 }} onClick={() => setCriando(true)}>
          + Novo novelo
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo={titulo}>
      <div class="linha-projeto" style={{ marginTop: 8 }}>
        <span class="capa capa-p" style={{ background: novelo.capaCor }} />
        <span class="linha-projeto-texto">
          <strong>{novelo.cor}</strong>
          <small>
            {[novelo.marca, `${novelo.gramatura} g`, `${brl(ppg)}/g`].filter(Boolean).join(' · ')}
          </small>
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
            <CampoInteiro id="fio-antes" valor={antes} aoMudar={setAntes} rotulo="Pesava antes, em gramas" sufixo="g" />
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
            Usei
          </label>
          <CampoInteiro id="fio-usei" valor={usei} aoMudar={setUsei} rotulo="Gramas usadas" sufixo="g" />
        </>
      )}
      {sobrouDemais && <p class="erro">O que sobrou não pode pesar mais que antes.</p>}

      <div class="resumo-fio">
        <span>
          Usou <strong>{gramas} g</strong>
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

function NovoNovelo({ aoCancelar, aoCriar }: { aoCancelar: () => void; aoCriar: (n: Novelo) => void }) {
  const [cor, setCor] = useState('');
  const [marca, setMarca] = useState('');
  const [gramatura, setGramatura] = useState(100);
  const [preco, setPreco] = useState(0);
  const [quantos, setQuantos] = useState(1);
  const [capa, setCapa] = useState(CAPAS[0].cor);
  const valido = cor.trim() && gramatura > 0 && preco > 0;

  const salvar = async (e: Event) => {
    e.preventDefault();
    if (!valido) return;
    const novo = { cor, marca, gramatura, precoCentavos: preco, estoqueG: quantos * gramatura, capaCor: capa, familia: nomeDaCapa(capa) };
    const id = await criarNovelo(novo);
    aoCriar({ ...novo, id, cor: cor.trim(), marca: marca.trim() } as Novelo);
  };

  return (
    <form onSubmit={salvar}>
      <label class="rotulo" for="nn-cor">
        Cor
      </label>
      <input id="nn-cor" class="campo" value={cor} onInput={(e) => setCor(e.currentTarget.value)} placeholder="ex: Rosa Chá" />
      <label class="rotulo" for="nn-marca">
        Marca <span class="opcional">opcional</span>
      </label>
      <input id="nn-marca" class="campo" value={marca} onInput={(e) => setMarca(e.currentTarget.value)} placeholder="ex: Círculo" />
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
      <p class="rotulo">Cor da capa</p>
      <SeletorCapa valor={capa} aoMudar={setCapa} />
      <div class="ajuste-botoes" style={{ marginTop: 18 }}>
        <button type="button" class="botao" onClick={aoCancelar}>
          Voltar
        </button>
        <button type="submit" class="botao primario" disabled={!valido}>
          Salvar novelo
        </button>
      </div>
    </form>
  );
}
