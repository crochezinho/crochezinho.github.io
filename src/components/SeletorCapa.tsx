import { TEXTURAS, corValida, estiloCapa } from '../app/capa.ts';
import type { Textura } from '../db/types.ts';

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
  const valor = corValida(cor);
  return (
    <div class="seletor-capa">
      <label class="capa-amostra" style={estiloCapa(valor, textura)}>
        <input type="color" value={valor} onInput={(e) => aoMudarCor(e.currentTarget.value)} aria-label="Cor da capa" />
        <span class="capa-amostra-dica">Toque para trocar a cor</span>
      </label>
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
