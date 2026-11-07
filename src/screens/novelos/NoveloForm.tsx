import { useEffect, useRef, useState } from 'preact/hooks';
import { AGULHAS, CAPAS, nomeDaCapa } from '../../app/constantes.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { CampoDinheiro, CampoInteiro } from '../../components/Campos.tsx';
import { Icone } from '../../components/Icone.tsx';
import { SeletorCapa } from '../../components/SeletorCapa.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { criarNovelo, editarNovelo, listarNovelos, type CamposNovelo } from '../../db/repo.ts';
import { formatarEstoque } from '../../domain/estoque.ts';

const VAZIO: CamposNovelo = {
  cor: '',
  familia: CAPAS[0].nome,
  marca: '',
  linha: '',
  fibra: '',
  gramatura: 100,
  metros: 0,
  precoCentavos: 0,
  lote: '',
  agulha: '',
  capaCor: CAPAS[0].cor
};

const unicos = (valores: string[]) => [...new Set(valores.map((v) => v.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

export function NoveloForm({ id }: { id: string | null }) {
  const novelos = useLive(listarNovelos);
  const novelo = id ? novelos?.find((n) => n.id === id) : undefined;
  const [c, setC] = useState<CamposNovelo>(VAZIO);
  const [fechados, setFechados] = useState(1);
  const [abertos, setAbertos] = useState(0);
  const [carregado, setCarregado] = useState(!id);
  const corRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (novelo && !carregado) {
      const { id: _i, atualizadoEm: _a, excluidoEm: _e, estoqueG: _s, ...campos } = novelo;
      setC(campos);
      setCarregado(true);
    }
  }, [novelo, carregado]);

  useEffect(() => {
    if (!id) setTimeout(() => corRef.current?.focus(), 80);
  }, [id]);

  if (!novelos || (id && !carregado)) {
    return <main class="tela">{novelos && !novelo && <p class="texto-apagado">Novelo não encontrado.</p>}</main>;
  }

  const mudar = (parte: Partial<CamposNovelo>) => setC((a) => ({ ...a, ...parte }));
  const agulhaOutra = c.agulha !== '' && !AGULHAS.includes(c.agulha);
  const valido = c.cor.trim() !== '' && c.gramatura > 0;
  const estoqueInicial = fechados * c.gramatura + abertos;

  const salvar = async (e: Event) => {
    e.preventDefault();
    if (!valido) return;
    if (id) {
      await editarNovelo(id, c);
      toast('Novelo atualizado');
      voltar(href.novelo(id));
    } else {
      const novoId = await criarNovelo({ ...c, estoqueG: estoqueInicial });
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
        <label class="rotulo" for="nf-cor">
          Nome da cor
        </label>
        <input id="nf-cor" ref={corRef} class="campo" value={c.cor} onInput={(e) => mudar({ cor: e.currentTarget.value })} placeholder="ex: Rosa Chá" autocomplete="off" />

        <div class="grade-2">
          <div>
            <label class="rotulo" for="nf-marca">
              Marca
            </label>
            <input id="nf-marca" class="campo" list="lista-marcas" value={c.marca} onInput={(e) => mudar({ marca: e.currentTarget.value })} placeholder="ex: Círculo" />
          </div>
          <div>
            <label class="rotulo" for="nf-linha">
              Linha
            </label>
            <input id="nf-linha" class="campo" list="lista-linhas" value={c.linha} onInput={(e) => mudar({ linha: e.currentTarget.value })} placeholder="ex: Amigurumi" />
          </div>
        </div>

        <label class="rotulo" for="nf-fibra">
          Fibra / composição <span class="opcional">opcional</span>
        </label>
        <input id="nf-fibra" class="campo" list="lista-fibras" value={c.fibra} onInput={(e) => mudar({ fibra: e.currentTarget.value })} placeholder="ex: 100% Algodão" />

        <div class="grade-2">
          <div>
            <label class="rotulo" for="nf-gram">
              Gramatura
            </label>
            <CampoInteiro id="nf-gram" valor={c.gramatura} aoMudar={(v) => mudar({ gramatura: v })} rotulo="Gramatura" sufixo="g" />
          </div>
          <div>
            <label class="rotulo" for="nf-metros">
              Metragem <span class="opcional">opcional</span>
            </label>
            <CampoInteiro id="nf-metros" valor={c.metros} aoMudar={(v) => mudar({ metros: v })} rotulo="Metragem" sufixo="m" />
          </div>
        </div>

        <div class="grade-2">
          <div>
            <label class="rotulo" for="nf-preco">
              Preço
            </label>
            <CampoDinheiro id="nf-preco" centavos={c.precoCentavos} aoMudar={(v) => mudar({ precoCentavos: v })} rotulo="Preço do novelo" />
          </div>
          <div>
            <label class="rotulo" for="nf-lote">
              Lote <span class="opcional">opcional</span>
            </label>
            <input id="nf-lote" class="campo" value={c.lote} onInput={(e) => mudar({ lote: e.currentTarget.value })} placeholder="ex: A-2241" />
          </div>
        </div>

        <p class="rotulo">
          Agulha sugerida <span class="opcional">opcional</span>
        </p>
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

        <p class="rotulo">Cor (para agrupar)</p>
        <SeletorCapa valor={c.capaCor} aoMudar={(cor) => mudar({ capaCor: cor, familia: nomeDaCapa(cor) })} />

        {!id && (
          <>
            <div class="grade-2">
              <div>
                <label class="rotulo" for="nf-fechados">
                  Novelos fechados
                </label>
                <CampoInteiro id="nf-fechados" valor={fechados} aoMudar={setFechados} rotulo="Novelos fechados" sufixo="un" max={9999} vazioQuandoZero={false} />
              </div>
              <div>
                <label class="rotulo" for="nf-abertos">
                  Abertos (peso)
                </label>
                <CampoInteiro id="nf-abertos" valor={abertos} aoMudar={setAbertos} rotulo="Peso dos novelos abertos" sufixo="g" max={99999} />
              </div>
            </div>
            <p class="texto-apagado">Em estoque: {formatarEstoque(estoqueInicial, c.gramatura)}</p>
          </>
        )}

        {!valido && <p class="erro">Informe o nome da cor e a gramatura.</p>}
        <button type="submit" class="botao primario largo" style={{ marginTop: 24 }} disabled={!valido}>
          {id ? 'Salvar alterações' : 'Salvar novelo'}
        </button>
      </form>

      <datalist id="lista-marcas">
        {unicos(novelos.map((n) => n.marca)).map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="lista-linhas">
        {unicos(novelos.filter((n) => !c.marca || n.marca === c.marca).map((n) => n.linha)).map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      <datalist id="lista-fibras">
        {unicos(novelos.map((n) => n.fibra)).map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </main>
  );
}
