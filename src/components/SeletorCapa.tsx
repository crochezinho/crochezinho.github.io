import { CAPAS } from '../app/constantes.ts';

export function SeletorCapa({ valor, aoMudar }: { valor: string; aoMudar: (cor: string) => void }) {
  const atual = CAPAS.find((c) => c.cor.toLowerCase() === valor.toLowerCase());
  return (
    <>
      <div class="capas" role="radiogroup" aria-label="Cor da capa">
        {CAPAS.map((c) => (
          <button
            type="button"
            key={c.cor}
            role="radio"
            aria-checked={c.cor === atual?.cor}
            class={'capa-opcao' + (c.cor === atual?.cor ? ' ativa' : '')}
            style={{ background: c.cor, color: c.cor }}
            aria-label={c.nome}
            title={c.nome}
            onClick={() => aoMudar(c.cor)}
          />
        ))}
      </div>
      {atual && <p class="capa-nome">{atual.nome}</p>}
    </>
  );
}
