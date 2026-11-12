import { useEffect } from 'preact/hooks';
import { useFotoUrl } from '../app/foto.ts';
import { useVoltarFecha } from '../app/voltarFecha.ts';
import { Icone } from './Icone.tsx';

export function VerFoto({ fotoId, titulo, aoFechar }: { fotoId: string; titulo: string; aoFechar: () => void }) {
  const url = useFotoUrl(fotoId);
  useVoltarFecha(true, aoFechar);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    const antes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.documentElement.style.overflow = antes;
    };
  }, [aoFechar]);

  return (
    <div class="ver-foto" role="dialog" aria-modal="true" aria-label={titulo} onClick={aoFechar}>
      <button type="button" class="ver-foto-fechar" aria-label="Fechar foto" onClick={aoFechar}>
        <Icone nome="fechar" tamanho={22} />
      </button>
      {url ? <img src={url} alt={titulo} /> : <p class="ver-foto-aviso">Carregando foto…</p>}
      <p class="ver-foto-titulo">{titulo}</p>
    </div>
  );
}
