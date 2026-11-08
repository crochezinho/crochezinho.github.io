import { descreverPrazo } from '../domain/prazo.ts';

export function SeloPrazo({ entregaEm, agora = Date.now() }: { entregaEm: string | null | undefined; agora?: number }) {
  const p = descreverPrazo(entregaEm, new Date(agora));
  return p ? <span class={'selo-prazo ' + p.nivel}>{p.texto}</span> : null;
}
