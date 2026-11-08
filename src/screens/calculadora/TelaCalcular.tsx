import { useEffect } from 'preact/hooks';
import { useLive } from '../../db/hooks.ts';
import { lerConfig } from '../../db/repo.ts';
import { CHAVE_ABA, type AbaCalc } from '../vender/estado.ts';
import { Embalagem } from '../vender/Embalagem.tsx';
import { Shopee } from '../vender/Shopee.tsx';
import { irParaAba } from './AbasCalcular.tsx';
import { Calculadora } from './Calculadora.tsx';

export function TelaCalcular({ projetoIdRota }: { projetoIdRota: string | null }) {
  const aba = useLive(() => lerConfig<AbaCalc>(CHAVE_ABA, 'preco'));

  useEffect(() => {
    if (projetoIdRota) void irParaAba('preco');
  }, [projetoIdRota]);

  if (!aba) return <main class="tela" />;
  if (aba === 'shopee' && !projetoIdRota) return <Shopee />;
  if (aba === 'embalagem' && !projetoIdRota) return <Embalagem />;
  return <Calculadora projetoIdRota={projetoIdRota} />;
}
