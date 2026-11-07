export interface NoveloLista {
  id: string;
  cor: string;
  familia: string;
  marca: string;
  linha: string;
  fibra: string;
  gramatura: number;
  estoqueG: number;
}

export function estaAcabando(n: Pick<NoveloLista, 'estoqueG' | 'gramatura'>): boolean {
  return n.gramatura > 0 ? n.estoqueG < n.gramatura : n.estoqueG <= 0;
}

export function novelosInteiros(n: Pick<NoveloLista, 'estoqueG' | 'gramatura'>): number {
  return n.gramatura > 0 ? Math.floor(Math.max(0, n.estoqueG) / n.gramatura) : 0;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrar<T extends NoveloLista>(novelos: T[], busca: string, soAcabando: boolean): T[] {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean);
  return novelos.filter((n) => {
    if (soAcabando && !estaAcabando(n)) return false;
    if (!termos.length) return true;
    const alvo = semAcento(`${n.cor} ${n.familia} ${n.marca} ${n.linha} ${n.fibra}`);
    return termos.every((t) => alvo.includes(t));
  });
}

const comparar = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });

export interface GrupoMarca<T> {
  marca: string;
  linhas: { linha: string; itens: T[] }[];
  totalInteiros: number;
}

export function agruparPorMarca<T extends NoveloLista>(novelos: T[]): GrupoMarca<T>[] {
  const mapa = new Map<string, Map<string, T[]>>();
  for (const n of novelos) {
    const marca = n.marca.trim() || 'Sem marca';
    const linha = n.linha.trim();
    if (!mapa.has(marca)) mapa.set(marca, new Map());
    const linhas = mapa.get(marca)!;
    if (!linhas.has(linha)) linhas.set(linha, []);
    linhas.get(linha)!.push(n);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => (a === 'Sem marca' ? 1 : b === 'Sem marca' ? -1 : comparar(a, b)))
    .map(([marca, linhas]) => {
      const lista = [...linhas.entries()]
        .sort(([a], [b]) => comparar(a, b))
        .map(([linha, itens]) => ({ linha, itens: [...itens].sort((x, y) => comparar(x.cor, y.cor)) }));
      const totalInteiros = lista.reduce((s, l) => s + l.itens.reduce((t, i) => t + novelosInteiros(i), 0), 0);
      return { marca, linhas: lista, totalInteiros };
    });
}

export interface GrupoCor<T> {
  familia: string;
  itens: T[];
}

export function agruparPorCor<T extends NoveloLista>(novelos: T[]): GrupoCor<T>[] {
  const mapa = new Map<string, T[]>();
  for (const n of novelos) {
    const f = n.familia.trim() || 'Outras';
    if (!mapa.has(f)) mapa.set(f, []);
    mapa.get(f)!.push(n);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => (a === 'Outras' ? 1 : b === 'Outras' ? -1 : comparar(a, b)))
    .map(([familia, itens]) => ({ familia, itens: [...itens].sort((x, y) => comparar(x.cor, y.cor)) }));
}
