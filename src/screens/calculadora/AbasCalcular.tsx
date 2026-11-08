import { salvarConfig } from '../../db/repo.ts';
import { CHAVE_ABA, type AbaCalc } from '../vender/estado.ts';

const ABAS: { valor: AbaCalc; rotulo: string }[] = [
  { valor: 'preco', rotulo: 'Preço' },
  { valor: 'shopee', rotulo: 'Shopee' },
  { valor: 'embalagem', rotulo: 'Embalagem' }
];

export const irParaAba = (aba: AbaCalc) => salvarConfig(CHAVE_ABA, aba);

export function AbasCalcular({ atual }: { atual: AbaCalc }) {
  return (
    <div class="segmentado abas-calc" role="tablist" aria-label="Calculadoras">
      {ABAS.map((a) => (
        <button key={a.valor} role="tab" aria-selected={atual === a.valor} class={atual === a.valor ? 'ativo' : ''} onClick={() => void irParaAba(a.valor)}>
          {a.rotulo}
        </button>
      ))}
    </div>
  );
}
