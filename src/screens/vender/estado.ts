import { useEffect, useRef, useState } from 'preact/hooks';
import { useLive } from '../../db/hooks.ts';
import { lerConfig, salvarConfig } from '../../db/repo.ts';
import type { Modalidade, Nivel, TipoProduto } from '../../domain/vendas/embalagem.ts';

export const CHAVE_ABA = 'calc.aba';
export type AbaCalc = 'preco' | 'shopee' | 'embalagem';

export const CHAVE_SHOPEE = 'vender.shopee';
export interface EstadoShopee {
  precoCentavos: number;
  custoCentavos: number;
  qtd: number;
  embalagemCentavos: number;
  mais450: boolean;
  campanhaPct: number;
}
export const SHOPEE_PADRAO: EstadoShopee = { precoCentavos: 0, custoCentavos: 0, qtd: 1, embalagemCentavos: 0, mais450: false, campanhaPct: 0 };

export const CHAVE_EMBALAGEM = 'vender.embalagem';
export interface EstadoEmbalagem {
  dims: number[];
  pesoG: number;
  qtd: number;
  tipo: TipoProduto;
  protecao: Nivel;
  modalidade: Modalidade;
}
export const EMBALAGEM_PADRAO: EstadoEmbalagem = { dims: [0, 0, 0], pesoG: 0, qtd: 1, tipo: 'flexivel', protecao: 'nenhuma', modalidade: 'correios' };

export function useEstadoSalvo<T extends object>(chave: string, padrao: T): [T | null, (parte: Partial<T>) => void] {
  const salvo = useLive(() => lerConfig<T | null>(chave, null), [chave]);
  const [estado, setEstado] = useState<T | null>(null);
  const pendente = useRef(false);

  useEffect(() => {
    if (salvo !== undefined && estado === null) setEstado({ ...padrao, ...(salvo ?? {}) });
  }, [salvo]);

  useEffect(() => {
    if (!estado || !pendente.current) return;
    const t = setTimeout(() => {
      pendente.current = false;
      void salvarConfig(chave, estado);
    }, 300);
    return () => clearTimeout(t);
  }, [estado]);

  const ultimo = useRef<T | null>(null);
  ultimo.current = estado;
  useEffect(
    () => () => {
      if (pendente.current && ultimo.current) void salvarConfig(chave, ultimo.current);
    },
    []
  );

  const mudar = (parte: Partial<T>) => {
    pendente.current = true;
    setEstado((a) => (a ? { ...a, ...parte } : a));
  };
  return [estado, mudar];
}
