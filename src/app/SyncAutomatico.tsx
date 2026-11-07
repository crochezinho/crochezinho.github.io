import { useEffect } from 'preact/hooks';
import { sincronizar } from '../db/sync.ts';

const INTERVALO_MINIMO = 20_000;
let ultimaTentativa = 0;

export function SyncAutomatico() {
  useEffect(() => {
    const tentar = () => {
      if (!navigator.onLine || Date.now() - ultimaTentativa < INTERVALO_MINIMO) return;
      ultimaTentativa = Date.now();
      void sincronizar();
    };
    const inicial = setTimeout(tentar, 1200);
    document.addEventListener('visibilitychange', tentar);
    window.addEventListener('online', tentar);
    return () => {
      clearTimeout(inicial);
      document.removeEventListener('visibilitychange', tentar);
      window.removeEventListener('online', tentar);
    };
  }, []);
  return null;
}
