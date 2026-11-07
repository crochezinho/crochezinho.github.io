import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

export function Sheet({
  aberta,
  aoFechar,
  titulo,
  subtitulo,
  escuro = false,
  children
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo: string;
  subtitulo?: string;
  escuro?: boolean;
  children: ComponentChildren;
}) {
  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberta, aoFechar]);

  if (!aberta) return null;
  return (
    <div class="sheet-fundo" onClick={aoFechar}>
      <div
        class={'sheet' + (escuro ? ' escuro' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
      >
        <div class="sheet-alca" />
        <h2 class="sheet-titulo">{titulo}</h2>
        {subtitulo && <p class="sheet-sub">{subtitulo}</p>}
        {children}
      </div>
    </div>
  );
}
