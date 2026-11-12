import { useLive } from '../db/hooks.ts';
import { listarPesosEmbalagem } from '../db/repo.ts';
import { numeroG, pesoDaEmbalagem } from '../domain/pesagem.ts';
import { Interruptor } from './Interruptor.tsx';

export function usePesoEmbalagem(tipo: string): number {
  const pesos = useLive(listarPesosEmbalagem);
  return pesos ? pesoDaEmbalagem(pesos, tipo) : 0;
}

export function DescontoEmbalagem({
  tipo,
  embalagemG,
  ligado,
  aoLigar,
  oQue = 'por novelo'
}: {
  tipo: string;
  embalagemG: number;
  ligado: boolean;
  aoLigar: (v: boolean) => void;
  oQue?: string;
}) {
  if (embalagemG <= 0) {
    return tipo.trim() ? (
      <p class="texto-apagado dica-embalagem">Para descontar a embalagem de {tipo.trim()}, cadastre o peso dela em Configurações → Embalagens.</p>
    ) : null;
  }
  return (
    <div class="desconto-embalagem">
      <Interruptor ligado={ligado} aoMudar={aoLigar} rotulo="Pesei com embalagem" detalhe={`Desconta ${numeroG(embalagemG)} g ${oQue} (${tipo.trim()})`} />
    </div>
  );
}
