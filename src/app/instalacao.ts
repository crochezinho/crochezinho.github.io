import { useEffect, useState } from 'preact/hooks';

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let eventoInstalar: EventoInstalar | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoInstalar = e as EventoInstalar;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    eventoInstalar = null;
    avisar();
  });
}

export type Plataforma = 'ios' | 'android' | 'outro';

export function plataforma(): Plataforma {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'outro';
}

export function estaInstalado(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
}

export function useInstalacao() {
  const [, setVersao] = useState(0);
  useEffect(() => {
    const f = () => setVersao((v) => v + 1);
    ouvintes.add(f);
    return () => void ouvintes.delete(f);
  }, []);
  return {
    plataforma: plataforma(),
    instalado: estaInstalado(),
    podeInstalar: !!eventoInstalar,
    instalar: async () => {
      if (!eventoInstalar) return false;
      await eventoInstalar.prompt();
      const { outcome } = await eventoInstalar.userChoice;
      eventoInstalar = null;
      avisar();
      return outcome === 'accepted';
    }
  };
}
