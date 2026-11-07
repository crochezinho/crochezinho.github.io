export function Interruptor({
  ligado,
  aoMudar,
  rotulo,
  detalhe
}: {
  ligado: boolean;
  aoMudar: (v: boolean) => void;
  rotulo: string;
  detalhe?: string;
}) {
  return (
    <label class="interruptor">
      <span class="interruptor-texto">
        <strong>{rotulo}</strong>
        {detalhe && <small>{detalhe}</small>}
      </span>
      <input type="checkbox" role="switch" checked={ligado} onChange={(e) => aoMudar(e.currentTarget.checked)} />
      <span class="interruptor-trilho" aria-hidden="true" />
    </label>
  );
}
