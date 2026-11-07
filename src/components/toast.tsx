import { useEffect, useState } from 'preact/hooks';

interface ToastDados {
  id: number;
  texto: string;
  acao?: { rotulo: string; fazer: () => void };
}

let atual: ToastDados | null = null;
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const ouvintes = new Set<(t: ToastDados | null) => void>();
const emitir = () => ouvintes.forEach((f) => f(atual));

export function toast(texto: string, acao?: ToastDados['acao']): void {
  atual = { id: ++seq, texto, acao };
  emitir();
  clearTimeout(timer);
  timer = setTimeout(() => {
    atual = null;
    emitir();
  }, acao ? 5000 : 2200);
}

export function Toast() {
  const [t, setT] = useState<ToastDados | null>(atual);
  useEffect(() => {
    ouvintes.add(setT);
    return () => void ouvintes.delete(setT);
  }, []);
  if (!t) return null;
  return (
    <div class="toast" key={t.id} role="status">
      <span>{t.texto}</span>
      {t.acao && (
        <button
          class="toast-acao"
          onClick={() => {
            t.acao!.fazer();
            atual = null;
            emitir();
          }}
        >
          {t.acao.rotulo}
        </button>
      )}
    </div>
  );
}
