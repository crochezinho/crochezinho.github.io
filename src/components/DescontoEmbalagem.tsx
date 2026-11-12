import { useState } from 'preact/hooks';
import { useLive } from '../db/hooks.ts';
import { listarPesosEmbalagem, salvarPesoEmbalagem } from '../db/repo.ts';
import { numeroG, pesoDaEmbalagem } from '../domain/pesagem.ts';
import { CampoDecimal } from './Campos.tsx';
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
  if (embalagemG <= 0) return tipo.trim() ? <CadastrarEmbalagem tipo={tipo.trim()} /> : null;
  return (
    <div class="desconto-embalagem">
      <Interruptor ligado={ligado} aoMudar={aoLigar} rotulo="Pesei com embalagem" detalhe={`Desconta ${numeroG(embalagemG)} g ${oQue} (${tipo.trim()})`} />
    </div>
  );
}

function CadastrarEmbalagem({ tipo }: { tipo: string }) {
  const [aberto, setAberto] = useState(false);
  const [gramas, setGramas] = useState(0);
  if (!aberto) {
    return (
      <button type="button" class="link-pequeno dica-embalagem" onClick={() => setAberto(true)}>
        pesou com a embalagem? descontar o peso dela
      </button>
    );
  }
  return (
    <div class="embalagem-nova">
      <p class="texto-apagado">
        Quanto pesa uma embalagem vazia de {tipo} (etiqueta, cone…)? Vale para todos os novelos {tipo}; dá para mudar em Configurações.
      </p>
      <div class="embalagem-nova-linha">
        <CampoDecimal valor={gramas} aoMudar={setGramas} rotulo={`Peso da embalagem de ${tipo}`} sufixo="g" />
        <button type="button" class="botao primario" disabled={gramas <= 0} onClick={() => void salvarPesoEmbalagem(tipo, gramas)}>
          Descontar
        </button>
      </div>
    </div>
  );
}
