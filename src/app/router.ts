import { useEffect, useState } from 'preact/hooks';
import { lerIds } from '../domain/combinar.ts';

export type Rota =
  | { nome: 'inicio' }
  | { nome: 'projetos' }
  | { nome: 'projeto'; id: string }
  | { nome: 'projetoForm'; id: string | null }
  | { nome: 'novelos' }
  | { nome: 'novelo'; id: string }
  | { nome: 'noveloForm'; id: string | null }
  | { nome: 'combinar'; ids: string[] }
  | { nome: 'calcular'; projetoId: string | null }
  | { nome: 'crono'; projetoId: string | null }
  | { nome: 'dicasShopee' }
  | { nome: 'config' };

export const ABAS = ['inicio', 'projetos', 'novelos', 'calcular'] as const;
export type Aba = (typeof ABAS)[number];

export function lerRota(hash: string = location.hash): Rota {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  switch (partes[0]) {
    case 'projetos':
      if (partes[1] === 'novo') return { nome: 'projetoForm', id: null };
      if (partes[1] && partes[2] === 'editar') return { nome: 'projetoForm', id: partes[1] };
      if (partes[1]) return { nome: 'projeto', id: partes[1] };
      return { nome: 'projetos' };
    case 'novelos':
      if (partes[1] === 'novo') return { nome: 'noveloForm', id: null };
      if (partes[1] === 'combinar') return { nome: 'combinar', ids: lerIds(partes[2]) };
      if (partes[1] && partes[2] === 'editar') return { nome: 'noveloForm', id: partes[1] };
      if (partes[1]) return { nome: 'novelo', id: partes[1] };
      return { nome: 'novelos' };
    case 'calcular':
      return { nome: 'calcular', projetoId: partes[1] ?? null };
    case 'crono':
      return { nome: 'crono', projetoId: partes[1] ?? null };
    case 'dicas':
      return { nome: 'dicasShopee' };
    case 'config':
      return { nome: 'config' };
    default:
      return { nome: 'inicio' };
  }
}

export const href = {
  inicio: '#/',
  projetos: '#/projetos',
  projeto: (id: string) => `#/projetos/${id}`,
  novoProjeto: '#/projetos/novo',
  editarProjeto: (id: string) => `#/projetos/${id}/editar`,
  novelos: '#/novelos',
  novelo: (id: string) => `#/novelos/${id}`,
  novoNovelo: '#/novelos/novo',
  editarNovelo: (id: string) => `#/novelos/${id}/editar`,
  combinar: (ids: string[]) => `#/novelos/combinar/${ids.map(encodeURIComponent).join(',')}`,
  calcular: '#/calcular',
  calcularPara: (projetoId: string) => `#/calcular/${projetoId}`,
  crono: (projetoId?: string) => (projetoId ? `#/crono/${projetoId}` : '#/crono'),
  dicasShopee: '#/dicas/shopee',
  config: '#/config'
};

type Estado = { d?: number; folha?: number } | null;
const estado = (): Estado => history.state as Estado;
const profundidade = (): number => estado()?.d ?? 0;
const avisar = () => window.dispatchEvent(new Event('rota'));

let voltasPendentes = 0;
let fila: (() => void)[] = [];
let seqFolha = 0;
const noHistorico = new Set<number>();
const canceladas = new Set<number>();

function tirarDoTopo(id: number): void {
  noHistorico.delete(id);
  voltasPendentes++;
  history.back();
}

function quandoLivre(acao: () => void): void {
  if (voltasPendentes > 0) fila.push(acao);
  else acao();
}

function depoisDasFolhas(acao: () => void): boolean {
  if (voltasPendentes > 0) {
    fila.push(acao);
    return true;
  }
  const topo = estado()?.folha;
  if (topo === undefined) return false;
  tirarDoTopo(topo);
  fila.push(acao);
  return true;
}

if (typeof window !== 'undefined') {
  if (estado()?.folha !== undefined) history.replaceState({ d: profundidade() }, '');
  window.addEventListener('popstate', () => {
    if (voltasPendentes === 0) return;
    voltasPendentes--;
    if (voltasPendentes === 0) {
      const acoes = fila;
      fila = [];
      acoes.forEach((a) => a());
    }
  });
}

export function abrirFolha(): number {
  const id = ++seqFolha;
  quandoLivre(() => {
    if (canceladas.delete(id)) return;
    history.pushState({ d: profundidade(), folha: id }, '');
    noHistorico.add(id);
  });
  return id;
}

export function fecharFolha(id: number): void {
  if (!noHistorico.has(id)) {
    if (id > 0 && voltasPendentes > 0) canceladas.add(id);
    return;
  }
  if (estado()?.folha === id) tirarDoTopo(id);
  else noHistorico.delete(id);
}

export function folhaAberta(id: number): boolean {
  if (!noHistorico.has(id)) return !canceladas.has(id);
  if (estado()?.folha === id) return true;
  noHistorico.delete(id);
  return false;
}

export function ir(destino: string, substituir = false): void {
  if (depoisDasFolhas(() => ir(destino, substituir))) return;
  if (substituir) history.replaceState({ d: profundidade() }, '', destino);
  else history.pushState({ d: profundidade() + 1 }, '', destino);
  avisar();
}

export function voltar(padrao: string = href.inicio): void {
  if (depoisDasFolhas(() => voltar(padrao))) return;
  if (profundidade() > 0) history.back();
  else ir(padrao, true);
}

export function useRota(): Rota {
  const [rota, setRota] = useState(lerRota());
  useEffect(() => {
    const aoMudar = () => setRota(lerRota());
    window.addEventListener('rota', aoMudar);
    window.addEventListener('popstate', aoMudar);
    window.addEventListener('hashchange', aoMudar);
    return () => {
      window.removeEventListener('rota', aoMudar);
      window.removeEventListener('popstate', aoMudar);
      window.removeEventListener('hashchange', aoMudar);
    };
  }, []);
  return rota;
}
