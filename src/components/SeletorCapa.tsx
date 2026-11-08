import { useState } from 'preact/hooks';
import { PALETA, TEXTURAS, corValida, estiloCapa, hexParaHsl, hslParaHex, type Hsl } from '../app/capa.ts';
import type { Textura } from '../db/types.ts';
import { Icone } from './Icone.tsx';

export function SeletorCapa({
  cor,
  aoMudarCor,
  textura,
  aoMudarTextura
}: {
  cor: string;
  aoMudarCor: (cor: string) => void;
  textura?: Textura;
  aoMudarTextura?: (t: Textura) => void;
}) {
  const valor = corValida(cor).toUpperCase();
  const [aberto, setAberto] = useState(false);

  return (
    <div class="seletor-capa">
      <button type="button" class="capa-amostra" style={estiloCapa(valor, textura)} aria-expanded={aberto} onClick={() => setAberto(!aberto)}>
        <span class="capa-amostra-dica">{aberto ? 'Pronto' : 'Trocar a cor'}</span>
      </button>

      {aberto && <PainelCor valor={valor} aoMudar={aoMudarCor} />}

      {textura && aoMudarTextura && (
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
    </div>
  );
}

function PainelCor({ valor, aoMudar }: { valor: string; aoMudar: (cor: string) => void }) {
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

      <p class="painel-cor-titulo">Ajuste fino</p>
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
