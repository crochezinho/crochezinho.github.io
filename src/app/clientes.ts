import { useDadosCrono } from './dados.ts';
import { valorCombinado } from './financeiro.ts';
import { useLive } from '../db/hooks.ts';
import { listarFichas } from '../db/repo.ts';
import { agruparClientes } from '../domain/clientes.ts';

export function useClientes() {
  const dados = useDadosCrono();
  const fichas = useLive(listarFichas);
  if (!dados || !fichas) return undefined;
  return { dados, fichas, clientes: agruparClientes(dados.projetos, valorCombinado) };
}
