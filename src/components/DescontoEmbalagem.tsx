import { useLive } from '../db/hooks.ts';
import { listarPesosEmbalagem } from '../db/repo.ts';
import { numeroG, pesoDaEmbalagem } from '../domain/pesagem.ts';
import { CampoInteiro } from './Campos.tsx';
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
  novelos,
  aoMudarNovelos,
  oQue = 'por novelo'
}: {
  tipo: string;
  embalagemG: number;
  ligado: boolean;
  aoLigar: (v: boolean) => void;
  novelos?: number;
  aoMudarNovelos?: (n: number) => void;
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
      {ligado && aoMudarNovelos && (
        <div class="embalagem-novelos">
          <label class="rotulo" for="emb-novelos">
            Novelos na balança
          </label>
          <CampoInteiro id="emb-novelos" valor={novelos ?? 1} aoMudar={aoMudarNovelos} rotulo="Novelos na balança" sufixo="un" max={999} minimo={1} />
        </div>
      )}
    </div>
  );
}
