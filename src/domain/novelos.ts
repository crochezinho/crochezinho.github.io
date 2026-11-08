export interface NoveloLista {
  id: string;
  cor: string;
  marca: string;
  tipo: string;
  gramatura: number;
  estoqueG: number;
}

export function nomeDoNovelo(n: Pick<NoveloLista, 'tipo' | 'cor'>): string {
  return [n.tipo.trim(), n.cor.trim()].filter(Boolean).join(' ') || 'Novelo';
}

export function novelosInteiros(n: Pick<NoveloLista, 'estoqueG' | 'gramatura'>): number {
  return n.gramatura > 0 ? Math.floor(Math.max(0, n.estoqueG) / n.gramatura) : 0;
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtrar<T extends NoveloLista>(novelos: T[], busca: string): T[] {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean);
  return novelos.filter((n) => {
    if (!termos.length) return true;
    const alvo = semAcento(`${n.cor} ${n.marca} ${n.tipo}`);
    return termos.every((t) => alvo.includes(t));
  });
}

const comparar = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });

export function contarUso(projetos: { fios: { noveloId: string }[] }[]): Map<string, number> {
  const uso = new Map<string, number>();
  for (const p of projetos) for (const id of new Set(p.fios.map((f) => f.noveloId))) uso.set(id, (uso.get(id) ?? 0) + 1);
  return uso;
}

export type Agrupamento = 'marca' | 'tipo';

export interface Grupo<T> {
  nome: string;
  sub: { nome: string; itens: T[] }[];
  totalInteiros: number;
}

const SEM = { marca: 'Sem marca', tipo: 'Sem tipo' } as const;

export function agrupar<T extends NoveloLista>(novelos: T[], por: Agrupamento, uso: Map<string, number> = new Map()): Grupo<T>[] {
  const usos = (n: T) => uso.get(n.id) ?? 0;
  const outro: Agrupamento = por === 'marca' ? 'tipo' : 'marca';
  const sem = SEM[por];
  const mapa = new Map<string, Map<string, T[]>>();
  for (const n of novelos) {
    const nome = n[por].trim() || sem;
    const sub = n[outro].trim();
    if (!mapa.has(nome)) mapa.set(nome, new Map());
    const subs = mapa.get(nome)!;
    if (!subs.has(sub)) subs.set(sub, []);
    subs.get(sub)!.push(n);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => (a === sem ? 1 : b === sem ? -1 : comparar(a, b)))
    .map(([nome, subs]) => {
      const sub = [...subs.entries()]
        .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : comparar(a, b)))
        .map(([s, itens]) => ({ nome: s, itens: [...itens].sort((x, y) => usos(y) - usos(x) || comparar(x.cor, y.cor)) }));
      const totalInteiros = sub.reduce((s, l) => s + l.itens.reduce((t, i) => t + novelosInteiros(i), 0), 0);
      return { nome, sub, totalInteiros };
    });
}
