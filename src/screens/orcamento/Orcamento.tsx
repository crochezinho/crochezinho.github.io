import { useEffect, useRef, useState } from 'preact/hooks';
import { useDadosCrono } from '../../app/dados.ts';
import {
  compartilharImagem,
  desenharOrcamento,
  FORMATOS,
  nomeDoArquivo,
  somaDosItens,
  TEMAS,
  totalDoOrcamento,
  type DadosOrcamento,
  type Formato,
  type ItemOrcamento,
  type Tema
} from '../../app/orcamento.ts';
import { href, voltar } from '../../app/router.ts';
import { CampoDinheiro } from '../../components/Campos.tsx';
import { Icone } from '../../components/Icone.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { lerConfig, salvarConfig, salvarVenda } from '../../db/repo.ts';
import { obterFoto } from '../../db/sync.ts';
import type { Projeto } from '../../db/types.ts';
import { vendaDe } from '../../domain/financeiro.ts';
import { brl } from '../../domain/preco.ts';

export const CHAVE_ESTILO = 'orcamento.estilo';
interface Estilo {
  formato: Formato;
  tema: Tema;
  assinatura: string;
  observacoes: string;
}

type OrigemFoto = 'projeto' | 'galeria' | 'nenhuma';

export function Orcamento({ projetoId, valor }: { projetoId: string | null; valor: number | null }) {
  const dados = useDadosCrono();
  const estilo = useLive(async () => {
    const salvo = await lerConfig<Partial<Estilo> | null>(CHAVE_ESTILO, null);
    const nome = await lerConfig('nome', '');
    return { formato: 'vertical', tema: 'rosa', assinatura: nome, observacoes: '', ...(salvo ?? {}) } as Estilo;
  });
  if (!dados || !estilo) return <main class="tela" />;
  const projeto = projetoId ? dados.projetos.find((p) => p.id === projetoId) : undefined;
  return <Editor projeto={projeto} valor={valor} estilo={estilo} />;
}

function inicial(projeto: Projeto | undefined, valor: number | null, estilo: Estilo): Omit<DadosOrcamento, 'foto'> {
  const q = projeto?.quantidade ?? 1;
  const venda = projeto ? vendaDe(projeto) : null;
  return {
    titulo: projeto?.cliente ? `Orçamento para ${projeto.cliente}` : 'Orçamento',
    itens: [{ nome: projeto ? (q > 1 ? `${projeto.nome} (${q} peças)` : projeto.nome) : '', valorCentavos: valor ?? venda?.valorCentavos ?? 0 }],
    freteCentavos: venda?.freteCentavos ?? 0,
    descontoCentavos: 0,
    entregaEm: projeto?.entregaEm ?? null,
    ...estilo
  };
}

function Editor({ projeto, valor, estilo }: { projeto: Projeto | undefined; valor: number | null; estilo: Estilo }) {
  const [d, setD] = useState(() => inicial(projeto, valor, estilo));
  const [origemFoto, setOrigemFoto] = useState<OrigemFoto>(projeto?.fotoId ? 'projeto' : 'nenhuma');
  const [fotoGaleria, setFotoGaleria] = useState<Blob | null>(null);
  const [fotoProjeto, setFotoProjeto] = useState<Blob | null>(null);
  const [imagem, setImagem] = useState<{ blob: Blob; url: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const arquivo = useRef<HTMLInputElement>(null);
  const mudar = (parte: Partial<typeof d>) => setD((a) => ({ ...a, ...parte }));
  const mudarItem = (i: number, parte: Partial<ItemOrcamento>) => setD((a) => ({ ...a, itens: a.itens.map((x, j) => (j === i ? { ...x, ...parte } : x)) }));

  useEffect(() => {
    if (!projeto?.fotoId) return;
    void obterFoto(projeto.fotoId).then((b) => b && setFotoProjeto(b));
  }, [projeto?.fotoId]);

  const foto = origemFoto === 'projeto' ? fotoProjeto : origemFoto === 'galeria' ? fotoGaleria : null;

  useEffect(() => {
    let vivo = true;
    let url: string | null = null;
    const espera = setTimeout(() => {
      void desenharOrcamento({ ...d, foto })
        .then((blob) => {
          if (!vivo) return;
          url = URL.createObjectURL(blob);
          setImagem({ blob, url });
        })
        .catch(() => vivo && toast('Não foi possível gerar a imagem'));
    }, 200);
    return () => {
      vivo = false;
      clearTimeout(espera);
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 2000);
    };
  }, [d, foto]);

  const escolherFoto = (e: Event) => {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    (e.currentTarget as HTMLInputElement).value = '';
    if (!f) return;
    setFotoGaleria(f);
    setOrigemFoto('galeria');
  };

  const enviar = async () => {
    if (!imagem) return;
    setEnviando(true);
    try {
      void salvarConfig(CHAVE_ESTILO, { formato: d.formato, tema: d.tema, assinatura: d.assinatura.trim(), observacoes: d.observacoes.trim() });
      const r = await compartilharImagem(imagem.blob, nomeDoArquivo(d.titulo));
      if (r === 'cancelou') return;
      if (r === 'baixou') toast('Imagem salva nos downloads');
      if (projeto && (projeto.cliente || projeto.entregaEm)) {
        const v = vendaDe(projeto);
        const valorCentavos = Math.max(0, somaDosItens(d) - d.descontoCentavos);
        if (v.canal === 'direto' && (!projeto.venda || v.valorCentavos !== valorCentavos || v.freteCentavos !== d.freteCentavos)) {
          await salvarVenda(projeto.id, { ...v, valorCentavos, freteCentavos: d.freteCentavos });
        }
      }
    } finally {
      setEnviando(false);
    }
  };

  const total = totalDoOrcamento(d);
  const { largura, altura } = FORMATOS[d.formato];

  return (
    <main class="tela tela-sem-abas anim-tela orcamento">
      <header class="cabecalho-voltar">
        <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(projeto ? href.projeto(projeto.id) : href.calcular)}>
          <Icone nome="voltar" />
        </button>
        <h1>Orçamento</h1>
      </header>

      <div class="previa-orcamento" style={{ aspectRatio: `${largura} / ${altura}`, '--proporcao': String(largura / altura) } as Record<string, string>}>
        {imagem ? <img src={imagem.url} alt="Prévia do orçamento" /> : null}
      </div>

      <div class="segmentado tres" role="radiogroup" aria-label="Formato">
        {(Object.keys(FORMATOS) as Formato[]).map((f) => (
          <button key={f} role="radio" aria-checked={d.formato === f} class={d.formato === f ? 'ativo' : ''} onClick={() => mudar({ formato: f })}>
            {FORMATOS[f].nome}
          </button>
        ))}
      </div>

      <p class="rotulo">Cor</p>
      <div class="temas-orcamento" role="radiogroup" aria-label="Cor">
        {(Object.keys(TEMAS) as Tema[]).map((t) => (
          <button
            key={t}
            role="radio"
            aria-checked={d.tema === t}
            aria-label={TEMAS[t].nome}
            class={'tema-orcamento' + (d.tema === t ? ' ativo' : '')}
            style={{ background: TEMAS[t].fundo, color: TEMAS[t].destaque }}
            onClick={() => mudar({ tema: t })}
          >
            <i style={{ background: TEMAS[t].destaque }} />
          </button>
        ))}
      </div>

      <p class="rotulo">Foto</p>
      <div class="chips" role="radiogroup" aria-label="Foto">
        {projeto?.fotoId && (
          <button type="button" role="radio" aria-checked={origemFoto === 'projeto'} class={'chip' + (origemFoto === 'projeto' ? ' ativo' : '')} onClick={() => setOrigemFoto('projeto')}>
            Do projeto
          </button>
        )}
        <button
          type="button"
          role="radio"
          aria-checked={origemFoto === 'galeria'}
          class={'chip' + (origemFoto === 'galeria' ? ' ativo' : '')}
          onClick={() => (fotoGaleria && origemFoto !== 'galeria' ? setOrigemFoto('galeria') : arquivo.current?.click())}
        >
          {fotoGaleria ? 'Da galeria' : 'Escolher da galeria'}
        </button>
        <button type="button" role="radio" aria-checked={origemFoto === 'nenhuma'} class={'chip' + (origemFoto === 'nenhuma' ? ' ativo' : '')} onClick={() => setOrigemFoto('nenhuma')}>
          Sem foto
        </button>
        {fotoGaleria && origemFoto === 'galeria' && (
          <button type="button" class="link-pequeno" onClick={() => arquivo.current?.click()}>
            trocar
          </button>
        )}
      </div>
      <input ref={arquivo} type="file" accept="image/*" hidden onChange={escolherFoto} />

      <label class="rotulo" for="orc-titulo">
        Título
      </label>
      <input id="orc-titulo" class="campo" value={d.titulo} onInput={(e) => mudar({ titulo: e.currentTarget.value })} autocomplete="off" />

      <p class="rotulo">Itens</p>
      <div class="cartao-lista itens-orcamento">
        {d.itens.map((item, i) => (
          <div key={i} class="item-orcamento">
            <input
              class="campo"
              value={item.nome}
              onInput={(e) => mudarItem(i, { nome: e.currentTarget.value })}
              placeholder="ex: Urso 30 cm"
              aria-label={`Item ${i + 1}`}
              autocomplete="off"
            />
            <CampoDinheiro compacto centavos={item.valorCentavos} aoMudar={(v) => mudarItem(i, { valorCentavos: v })} rotulo={`Valor do item ${i + 1}`} />
            {d.itens.length > 1 && (
              <button class="botao-x" aria-label={`Tirar item ${i + 1}`} onClick={() => mudar({ itens: d.itens.filter((_, j) => j !== i) })}>
                <Icone nome="fechar" tamanho={18} />
              </button>
            )}
          </div>
        ))}
        <button class="linha-adicionar" onClick={() => mudar({ itens: [...d.itens, { nome: '', valorCentavos: 0 }] })}>
          <Icone nome="mais" tamanho={18} /> Adicionar item
        </button>
      </div>

      <div class="grade-2">
        <div>
          <label class="rotulo" for="orc-frete">
            Frete <span class="opcional">opcional</span>
          </label>
          <CampoDinheiro id="orc-frete" centavos={d.freteCentavos} aoMudar={(v) => mudar({ freteCentavos: v })} rotulo="Frete" />
        </div>
        <div>
          <label class="rotulo" for="orc-desconto">
            Desconto <span class="opcional">opcional</span>
          </label>
          <CampoDinheiro id="orc-desconto" centavos={d.descontoCentavos} aoMudar={(v) => mudar({ descontoCentavos: v })} rotulo="Desconto" />
        </div>
      </div>

      <label class="rotulo" for="orc-entrega">
        Entrega <span class="opcional">opcional</span>
      </label>
      <input id="orc-entrega" class="campo campo-data" type="date" value={d.entregaEm ?? ''} onInput={(e) => mudar({ entregaEm: e.currentTarget.value || null })} />

      <label class="rotulo" for="orc-obs">
        Observações <span class="opcional">opcional</span>
      </label>
      <textarea
        id="orc-obs"
        class="campo anotacoes"
        rows={3}
        value={d.observacoes}
        onInput={(e) => mudar({ observacoes: e.currentTarget.value })}
        placeholder="Prazo de produção, pagamento, validade…"
      />

      <label class="rotulo" for="orc-assinatura">
        Assinatura <span class="opcional">opcional</span>
      </label>
      <input id="orc-assinatura" class="campo" value={d.assinatura} onInput={(e) => mudar({ assinatura: e.currentTarget.value })} placeholder="ex: Crochê da Ana" autocomplete="off" />

      <button class="botao primario largo orcamento-enviar" disabled={!imagem || enviando || total <= 0} onClick={() => void enviar()}>
        <Icone nome="compartilhar" tamanho={20} />
        Compartilhar · {brl(total)}
      </button>
    </main>
  );
}
