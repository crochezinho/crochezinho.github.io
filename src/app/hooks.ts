import { useEffect, useState } from 'preact/hooks';

export function useAgora(ativo: boolean, intervalo = 1000): number {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    setAgora(Date.now());
    if (!ativo) return;
    const t = setInterval(() => setAgora(Date.now()), intervalo);
    const aoVoltar = () => setAgora(Date.now());
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [ativo, intervalo]);
  return agora;
}

export function useTelaAcesa(ativo: boolean): void {
  useEffect(() => {
    if (!ativo || !('wakeLock' in navigator)) return;
    let trava: WakeLockSentinel | null = null;
    let cancelado = false;
    const pedir = async () => {
      try {
        if (document.visibilityState !== 'visible') return;
        const t = await navigator.wakeLock.request('screen');
        if (cancelado) void t.release();
        else trava = t;
      } catch {
      }
    };
    const aoVoltar = () => void pedir();
    document.addEventListener('visibilitychange', aoVoltar);
    void pedir();
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', aoVoltar);
      void trava?.release();
    };
  }, [ativo]);
}
