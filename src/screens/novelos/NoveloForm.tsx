import { useEffect, useRef, useState } from 'preact/hooks';
import { AGULHAS } from '../../app/constantes.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { CampoDinheiro, CampoInteiro } from '../../components/Campos.tsx';
import { usePesoEmbalagem } from '../../components/DescontoEmbalagem.tsx';
import { PesagensNovelo } from '../../components/PesagensNovelo.tsx';
import { novoId as gerarId } from '../../db/db.ts';
import { PESAGENS_VAZIAS, unidadesDasPesagens, type Pesagens } from '../../domain/pesagem.ts';
import { Icone } from '../../components/Icone.tsx';
import { SeletorCapa } from '../../components/SeletorCapa.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { criarNovelo, editarNovelo, listarNovelos, type CamposNovelo } from '../../db/repo.ts';
import type { Novelo } from '../../db/types.ts';
import { formatarEstoque } from '../../domain/estoque.ts';
import { grafiaExistente, noveloRepetido, sugerirMarca } from '../../domain/novelos.ts';

const VAZIO: CamposNovelo = {
  cor: '',
  marca: '',
  tipo: '',
  gramatura: 100,
  precoCentavos: 0,
  lote: '',
  agulha: '',
  capaCor: '',
  textura: 'liso',
  fotoId: null
};

const unicos = (valores: string[]) => [...new Set(valores.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

export function ListasNovelo({ novelos }: { novelos: Novelo[] }) {
  return (
    <>
      <datalist id="lista-tipos">
        {unicos(novelos.map((n) => n.tipo)).map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="lista-marcas">
        {unicos(novelos.map((n) => n.marca)).map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </>
  );
}

export function NoveloForm({ id }: { id: string | null }) {
  const novelos = useLive(listarNovelos);
  const novelo = id ? novelos?.find((n) => n.id === id) : undefined;
  const [c, setC] = useState<CamposNovelo>(VAZIO);
  const [pesagens, setPesagens] = useState<Pesagens>(PESAGENS_VAZIAS);
  const [tentou, setTentou] = useState(false);
  const [carregado, setCarregado] = useState(!id);
  const [marcaAuto, setMarcaAuto] = useState(false);
  const [comEmbalagem, setComEmbalagem] = useState(true);
  const tipoRef = useRef<HTMLInputElement>(null);
  const corRef = useRef<HTMLInputElement>(null);
  const embalagemG = usePesoEmbalagem(c.tipo);

  useEffect(() => {
    if (novelo && !carregado) {
      const { id: _i, atualizadoEm: _a, excluidoEm: _e, estoqueG: _s, unidades: _u, ...campos } = novelo;
      setC(campos);
      setCarregado(true);
    }
  }, [novelo, carregado]);

  useEffect(() => {
    if (!id) setTimeout(() => tipoRef.current?.focus(), 80);
  }, [id]);

  if (!novelos || (id && !carregado)) {
    return <main class="tela">{novelos && !novelo && <p class="texto-apagado">Novelo não encontrado.</p>}</main>;
  }

  const mudar = (parte: Partial<CamposNovelo>) => setC((a) => ({ ...a, ...parte }));
  const mudarTipoCor = (parte: Pick<Partial<CamposNovelo>, 'tipo' | 'cor'>) => {
    const tipo = parte.tipo ?? c.tipo;
    const cor = parte.cor ?? c.cor;
    if (c.marca.trim() && !marcaAuto) return mudar(parte);
    const outros = novelos.filter((n) => n.id !== id);
    mudar({ ...parte, marca: sugerirMarca(outros, tipo, cor) });
    setMarcaAuto(true);
  };
  const agulhaOutra = c.agulha !== '' && !AGULHAS.includes(c.agulha);
  const faltando = [!c.cor.trim() && 'o nome da cor', c.gramatura <= 0 && 'a gramatura', !c.capaCor && !c.fotoId && 'a cor da capa (na paleta)'].filter(
    (x): x is string => !!x
  );
  const valido = faltando.length === 0;
  const embalagemUsada = comEmbalagem ? embalagemG : 0;
  const repetido = noveloRepetido(novelos, c.tipo, c.cor, c.marca, id);
  const temDetalhes = !!(c.lote || c.agulha);

  const salvar = async (e: Event) => {
    e.preventDefault();
    if (!valido) {
      setTentou(true);
      if (!c.cor.trim()) corRef.current?.focus();
      else if (c.gramatura <= 0) document.getElementById('nf-gram')?.focus();
      else document.querySelector('.seletor-capa')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (id) {
      await editarNovelo(id, c);
      toast('Novelo atualizado');
      voltar(href.novelo(id));
    } else {
      const novoId = await criarNovelo({ ...c, unidades: unidadesDasPesagens(pesagens, c.gramatura, embalagemUsada, gerarId) });
      toast('Novelo adicionado ao estoque');
      ir(href.novelo(novoId), true);
    }
  };

  return (
    <main class="tela tela-sem-abas anim-tela">
      <header class="cabecalho-voltar">
        <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(id ? href.novelo(id) : href.novelos)}>
          <Icone nome="voltar" />
        </button>
        <h1>{id ? 'Editar novelo' : 'Novo novelo'}</h1>
      </header>

      <form onSubmit={salvar}>
        <div class="grade-2">
          <div>
            <label class="rotulo" for="nf-tipo">
              Tipo
            </label>
            <input
              id="nf-tipo"
              ref={tipoRef}
              class="campo"
              list="lista-tipos"
              value={c.tipo}
              onInput={(e) => mudarTipoCor({ tipo: e.currentTarget.value })}
              onBlur={() => {
                const igual = grafiaExistente(novelos, 'tipo', c.tipo);
                if (igual && igual !== c.tipo) mudar({ tipo: igual });
              }}
              placeholder="ex: Chenille"
              autocomplete="off"
            />
          </div>
          <div>
            <label class="rotulo" for="nf-cor">
              Cor
            </label>
            <input
              id="nf-cor"
              ref={corRef}
              class="campo"
              value={c.cor}
              onInput={(e) => mudarTipoCor({ cor: e.currentTarget.value })}
              placeholder="ex: Rosa Chá"
              autocomplete="off"
            />
          </div>
        </div>

        <label class="rotulo" for="nf-marca">
          Marca
        </label>
        <input
          id="nf-marca"
          class="campo"
          list="lista-marcas"
          value={c.marca}
          onInput={(e) => {
            mudar({ marca: e.currentTarget.value });
            setMarcaAuto(false);
          }}
          onBlur={() => {
            const igual = grafiaExistente(novelos, 'marca', c.marca);
            if (igual && igual !== c.marca) mudar({ marca: igual });
          }}
          placeholder="ex: Círculo"
          autocomplete="off"
        />
        {repetido && (
          <div class="aviso-repetido" role="status">
            <span>
              Você já tem esse novelo{repetido.estoqueG > 0 ? ` (${formatarEstoque(repetido.estoqueG)} em estoque)` : ''}.
            </span>
            <button type="button" class="botao-texto" onClick={() => ir(href.novelo(repetido.id))}>
              Ver novelo
            </button>
          </div>
        )}

        <div class="grade-2">
          <div>
            <label class="rotulo" for="nf-gram">
              Gramatura
            </label>
            <CampoInteiro id="nf-gram" valor={c.gramatura} aoMudar={(v) => mudar({ gramatura: v })} rotulo="Gramatura" sufixo="g" />
          </div>
          <div>
            <label class="rotulo" for="nf-preco">
              Preço do novelo
            </label>
            <CampoDinheiro id="nf-preco" centavos={c.precoCentavos} aoMudar={(v) => mudar({ precoCentavos: v })} rotulo="Preço do novelo" />
          </div>
        </div>

        {!id && (
          <>
            <p class="rotulo">Estoque</p>
            <PesagensNovelo
              tipo={c.tipo}
              gramatura={c.gramatura}
              embalagemG={embalagemG}
              pesagens={pesagens}
              aoMudar={setPesagens}
              comEmbalagem={comEmbalagem}
              aoLigar={setComEmbalagem}
            />
          </>
        )}

        <p class="rotulo">Cor da capa</p>
        <SeletorCapa
          compacto
          cor={c.capaCor}
          aoMudarCor={(cor) => mudar({ capaCor: cor })}
          textura={c.textura}
          aoMudarTextura={(t) => mudar({ textura: t })}
          fotoId={c.fotoId}
          aoMudarFoto={(f) => mudar({ fotoId: f })}
        />

        <details class="mais-detalhes" open={temDetalhes}>
          <summary>Mais detalhes (opcional)</summary>
          <label class="rotulo" for="nf-lote">
            Lote
          </label>
          <input id="nf-lote" class="campo" value={c.lote} onInput={(e) => mudar({ lote: e.currentTarget.value })} placeholder="ex: A-2241" />
          <p class="rotulo">Agulha sugerida</p>
          <div class="chips" role="radiogroup" aria-label="Agulha sugerida">
            {AGULHAS.map((a) => (
              <button
                type="button"
                key={a}
                role="radio"
                aria-checked={c.agulha === a}
                class={'chip' + (c.agulha === a ? ' ativo' : '')}
                onClick={() => mudar({ agulha: c.agulha === a ? '' : a })}
              >
                {a}
              </button>
            ))}
          </div>
          <input
            class="campo"
            style={{ marginTop: 10 }}
            value={agulhaOutra ? c.agulha : ''}
            onInput={(e) => mudar({ agulha: e.currentTarget.value })}
            placeholder="outro tamanho (ex: 6 mm)"
            aria-label="Outro tamanho de agulha"
          />
        </details>

        {tentou && !valido && <p class="erro">Falta {faltando.join(', ').replace(/, ([^,]*)$/, ' e $1')}.</p>}
        <button type="submit" class="botao primario largo" style={{ marginTop: 24 }}>
          {id ? 'Salvar alterações' : 'Salvar novelo'}
        </button>
      </form>

      <ListasNovelo novelos={novelos} />
    </main>
  );
}
