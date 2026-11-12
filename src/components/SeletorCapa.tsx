import { useRef, useState } from 'preact/hooks';
import { PALETA, TEXTURAS, corValida, estiloCapa, hexParaHsl, hslParaHex, type Hsl } from '../app/capa.ts';
import { lerFoto, salvarFoto } from '../app/foto.ts';
import type { Textura } from '../db/types.ts';
import { Capa } from './Capa.tsx';
import { EditorFoto } from './EditorFoto.tsx';
import { VerFoto } from './VerFoto.tsx';
import { toast } from './toast.tsx';
import { Icone } from './Icone.tsx';

export function SeletorCapa({
  cor,
  aoMudarCor,
  textura,
  aoMudarTextura,
  fotoId,
  aoMudarFoto,
  compacto = false
}: {
  cor: string;
  aoMudarCor: (cor: string) => void;
  textura?: Textura;
  aoMudarTextura?: (t: Textura) => void;
  fotoId?: string | null;
  aoMudarFoto?: (id: string | null) => void;
  compacto?: boolean;
}) {
  const semCor = compacto && !cor;
  const valor = corValida(cor).toUpperCase();
  const [aberto, setAberto] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [editando, setEditando] = useState<Blob | null>(null);
  const [vendo, setVendo] = useState(false);
  const [versaoPaleta, setVersaoPaleta] = useState(0);
  const arquivo = useRef<HTMLInputElement>(null);
  const comFoto = !!fotoId && !!aoMudarFoto;

  const escolherFoto = (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (f) setEditando(f);
  };

  const ajustarAtual = async () => {
    if (!fotoId) return;
    setPreparando(true);
    try {
      const atual = await lerFoto(fotoId);
      if (atual) setEditando(atual);
      else toast('A foto ainda não chegou neste aparelho. Tente de novo daqui a pouco.');
    } finally {
      setPreparando(false);
    }
  };

  const usarRecorte = async (recorte: Blob) => {
    if (!aoMudarFoto) return;
    try {
      aoMudarFoto(await salvarFoto(recorte));
      setEditando(null);
      setAberto(false);
    } catch (err) {
      toast((err as Error).message);
      throw err;
    }
  };

  const fotoAcoes = aoMudarFoto && (
    <div class={'acoes-foto' + (compacto ? ' compactas' : '')}>
      <button type="button" class="botao" onClick={() => arquivo.current?.click()}>
        <Icone nome="camera" tamanho={18} />
        {comFoto ? 'Trocar' : compacto ? 'Usar uma foto' : 'Adicionar foto'}
      </button>
      {comFoto && (
        <>
          <button type="button" class="botao" disabled={preparando} onClick={() => void ajustarAtual()}>
            {preparando ? 'Abrindo…' : 'Ajustar'}
          </button>
          <button type="button" class="botao" onClick={() => aoMudarFoto(null)}>
            Tirar
          </button>
        </>
      )}
      <input ref={arquivo} type="file" accept="image/*" hidden onChange={escolherFoto} />
    </div>
  );
  const extras = (
    <>
      {vendo && fotoId && <VerFoto fotoId={fotoId} titulo="Foto da capa" aoFechar={() => setVendo(false)} />}
      {editando && <EditorFoto foto={editando} aoCancelar={() => setEditando(null)} aoPronto={usarRecorte} />}
    </>
  );

  if (compacto) {
    const naPaleta = PALETA.includes(valor);
    return (
      <div class="seletor-capa compacto">
        {comFoto ? (
          <Capa class="capa-amostra com-foto" cor={valor} fotoId={fotoId} tag="div">
            <button type="button" class="faixa-ver-foto" aria-label="Ver foto" onClick={() => setVendo(true)} />
          </Capa>
        ) : (
          <>
            <div class="paleta-faixa" role="radiogroup" aria-label="Cor do fio">
              {!semCor && !naPaleta && <Amostra cor={valor} ativa aoEscolher={() => setAberto(true)} />}
              {PALETA.map((c) => (
                <Amostra
                  key={c}
                  cor={c}
                  ativa={!semCor && c === valor}
                  aoEscolher={() => {
                    aoMudarCor(c);
                    setVersaoPaleta((v) => v + 1);
                  }}
                />
              ))}
            </div>
            <button type="button" class="link-pequeno" onClick={() => setAberto(!aberto)}>
              {aberto ? 'fechar o ajuste fino' : 'não achou a cor? ajuste fino'}
            </button>
            {aberto && <PainelCor key={versaoPaleta} valor={valor} aoMudar={aoMudarCor} semPaleta />}
            {textura && aoMudarTextura && (
              <div class="texturas compactas" role="radiogroup" aria-label="Textura">
                {TEXTURAS.map((t) => (
                  <button
                    type="button"
                    key={t.valor}
                    role="radio"
                    aria-checked={textura === t.valor}
                    class={'textura-opcao' + (textura === t.valor ? ' ativa' : '')}
                    onClick={() => aoMudarTextura(t.valor)}
                  >
                    <span style={semCor ? { background: 'var(--divisoria)' } : estiloCapa(valor, t.valor)} />
                    {t.nome}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        {fotoAcoes}
        {comFoto && <p class="texto-apagado">Com foto, ela é a capa. A cor volta se você tirar a foto.</p>}
        {extras}
      </div>
    );
  }

  return (
    <div class="seletor-capa">
      {comFoto ? (
        <Capa class="capa-amostra com-foto" cor={valor} fotoId={fotoId} tag="div">
          <button type="button" class="faixa-ver-foto" aria-label="Ver foto" onClick={() => setVendo(true)} />
        </Capa>
      ) : (
        <button type="button" class="capa-amostra" style={estiloCapa(valor, textura)} aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
          <span class="capa-amostra-dica">{aberto ? 'Pronto' : 'Trocar a cor'}</span>
        </button>
      )}

      {fotoAcoes}
      {extras}

      {!comFoto && aberto && <PainelCor valor={valor} aoMudar={aoMudarCor} />}

      {!comFoto && textura && aoMudarTextura && (
        <div class="texturas" role="radiogroup" aria-label="Textura">
          {TEXTURAS.map((t) => (
            <button
              type="button"
              key={t.valor}
              role="radio"
              aria-checked={textura === t.valor}
              class={'textura-opcao' + (textura === t.valor ? ' ativa' : '')}
              onClick={() => aoMudarTextura(t.valor)}
            >
              <span style={estiloCapa(valor, t.valor)} />
              {t.nome}
            </button>
          ))}
        </div>
      )}
      {comFoto && <p class="texto-apagado">Com foto, ela é a capa. A cor volta se você tirar a foto.</p>}
    </div>
  );
}

function Amostra({ cor, ativa, aoEscolher }: { cor: string; ativa: boolean; aoEscolher: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={ativa}
      aria-label={cor}
      class={'paleta-cor' + (ativa ? ' ativa' : '')}
      style={{ background: cor, color: hexParaHsl(cor).l > 72 ? 'var(--texto)' : '#fff' }}
      onClick={aoEscolher}
    >
      {ativa && <Icone nome="check" tamanho={16} espessura={3} />}
    </button>
  );
}

function PainelCor({ valor, aoMudar, semPaleta = false }: { valor: string; aoMudar: (cor: string) => void; semPaleta?: boolean }) {
  const [hsl, setHsl] = useState<Hsl>(() => hexParaHsl(valor));
  const escolherDaPaleta = (c: string) => {
    setHsl(hexParaHsl(c));
    aoMudar(c);
  };
  const ajustar = (parte: Partial<Hsl>) => {
    const novo = { ...hsl, ...parte };
    setHsl(novo);
    aoMudar(hslParaHex(novo));
  };
  const { h, s, l } = hsl;

  return (
    <div class="painel-cor">
      {!semPaleta && (
      <div class="paleta" role="radiogroup" aria-label="Cores">
        {PALETA.map((c) => (
          <button
            type="button"
            key={c}
            role="radio"
            aria-checked={c === valor}
            aria-label={c}
            class={'paleta-cor' + (c === valor ? ' ativa' : '')}
            style={{ background: c, color: hexParaHsl(c).l > 72 ? 'var(--texto)' : '#fff' }}
            onClick={() => escolherDaPaleta(c)}
          >
            {c === valor && <Icone nome="check" tamanho={16} espessura={3} />}
          </button>
        ))}
      </div>
      )}

      {!semPaleta && <p class="painel-cor-titulo">Ajuste fino</p>}
      <Faixa
        rotulo="Tom"
        valor={h}
        max={359}
        fundo="linear-gradient(90deg, #f28b8b, #f2c48b, #f2ee8b, #9ce39c, #8bd6f2, #8b9cf2, #c88bf2, #f28bd0, #f28b8b)"
        aoMudar={(v) => ajustar({ h: v })}
      />
      <Faixa
        rotulo="Intensidade"
        valor={s}
        max={100}
        fundo={`linear-gradient(90deg, ${hslParaHex({ h, s: 0, l })}, ${hslParaHex({ h, s: 100, l })})`}
        aoMudar={(v) => ajustar({ s: v })}
      />
      <Faixa
        rotulo="Claridade"
        valor={l}
        max={100}
        fundo={`linear-gradient(90deg, #2b2220, ${hslParaHex({ h, s, l: 50 })}, #ffffff)`}
        aoMudar={(v) => ajustar({ l: v })}
      />
    </div>
  );
}

function Faixa({ rotulo, valor, max, fundo, aoMudar }: { rotulo: string; valor: number; max: number; fundo: string; aoMudar: (v: number) => void }) {
  return (
    <label class="faixa">
      <span>{rotulo}</span>
      <input type="range" min={0} max={max} value={valor} style={{ background: fundo }} onInput={(e) => aoMudar(Number(e.currentTarget.value))} aria-label={rotulo} />
    </label>
  );
}
