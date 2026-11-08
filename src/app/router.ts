import { useEffect, useState } from 'preact/hooks';

export type Rota =
  | { nome: 'inicio' }
  | { nome: 'projetos' }
  | { nome: 'projeto'; id: string }
  | { nome: 'projetoForm'; id: string | null }
  | { nome: 'novelos' }
  | { nome: 'novelo'; id: string }
  | { nome: 'noveloForm'; id: string | null }
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
  calcular: '#/calcular',
  calcularPara: (projetoId: string) => `#/calcular/${projetoId}`,
  crono: (projetoId?: string) => (projetoId ? `#/crono/${projetoId}` : '#/crono'),
  dicasShopee: '#/dicas/shopee',
  config: '#/config'
};

const profundidade = (): number => (history.state as { d?: number } | null)?.d ?? 0;
const avisar = () => window.dispatchEvent(new Event('rota'));

export function ir(destino: string, substituir = false): void {
  if (substituir) history.replaceState({ d: profundidade() }, '', destino);
  else history.pushState({ d: profundidade() + 1 }, '', destino);
  avisar();
}

export function voltar(padrao: string = href.inicio): void {
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
