import { liveQuery } from 'dexie';
import { useEffect, useState } from 'preact/hooks';
import type { Inputs } from 'preact/hooks';

export function useLive<T>(consulta: () => Promise<T>, deps: Inputs = []): T | undefined {
  const [valor, setValor] = useState<T | undefined>(undefined);
  useEffect(() => {
    const sub = liveQuery(consulta).subscribe({
      next: setValor,
      error: (e) => console.error('[db]', e)
    });
    return () => sub.unsubscribe();
  }, deps);
  return valor;
}
