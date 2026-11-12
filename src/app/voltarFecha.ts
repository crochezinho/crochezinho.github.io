import { useEffect, useRef } from 'preact/hooks';
import { abrirFolha, fecharFolha, folhaAberta } from './router.ts';

export function useVoltarFecha(aberta: boolean, aoFechar: () => void): void {
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;
  useEffect(() => {
    if (!aberta) return;
    const id = abrirFolha();
    const aoVoltar = () => {
      if (!folhaAberta(id)) fechar.current();
    };
    window.addEventListener('popstate', aoVoltar);
    return () => {
      window.removeEventListener('popstate', aoVoltar);
      fecharFolha(id);
    };
  }, [aberta]);
}
