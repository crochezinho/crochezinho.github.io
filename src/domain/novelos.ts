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

const igual = (a: string, b: string) => semAcento(a.trim()).replace(/\s+/g, ' ') === semAcento(b.trim()).replace(/\s+/g, ' ');

export function sugerirMarca(novelos: Pick<NoveloLista, 'tipo' | 'cor' | 'marca'>[], tipo: string, cor: string): string {
  if (!tipo.trim()) return '';
  const doTipo = novelos.filter((n) => n.marca.trim() && igual(n.tipo, tipo));
  const mesmo = cor.trim() ? doTipo.find((n) => igual(n.cor, cor)) : undefined;
  if (mesmo) return mesmo.marca.trim();
  const contagem = new Map<string, number>();
  for (const n of doTipo) contagem.set(n.marca.trim(), (contagem.get(n.marca.trim()) ?? 0) + 1);
  return [...contagem.entries()].sort((a, b) => b[1] - a[1] || comparar(a[0], b[0]))[0]?.[0] ?? '';
}

export function grafiaExistente(novelos: Pick<NoveloLista, 'tipo' | 'marca'>[], campo: 'tipo' | 'marca', valor: string): string {
  if (!valor.trim()) return '';
  const contagem = new Map<string, number>();
  for (const n of novelos) if (n[campo].trim() && igual(n[campo], valor)) contagem.set(n[campo].trim(), (contagem.get(n[campo].trim()) ?? 0) + 1);
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

export function noveloRepetido<T extends NoveloLista>(novelos: T[], tipo: string, cor: string, marca: string, excetoId: string | null = null): T | undefined {
  if (!cor.trim()) return undefined;
  return novelos.find((n) => n.id !== excetoId && igual(n.tipo, tipo) && igual(n.cor, cor) && igual(n.marca, marca));
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
  totalG: number;
}

const SEM = { marca: 'Sem marca', tipo: 'Sem tipo' } as const;

export function agrupar<T extends NoveloLista>(novelos: T[], por: Agrupamento, uso: Map<string, number> = new Map()): Grupo<T>[] {
  const usos = (n: T) => uso.get(n.id) ?? 0;
  const outro: Agrupamento = por === 'marca' ? 'tipo' : 'marca';
  const sem = SEM[por];
  const chave = (s: string) => semAcento(s.trim()).replace(/\s+/g, ' ');
  const grafias = new Map<string, Map<string, number>>();
  const contar = (s: string) => {
    const k = chave(s);
    const g = grafias.get(k) ?? new Map<string, number>();
    g.set(s.trim(), (g.get(s.trim()) ?? 0) + 1);
    grafias.set(k, g);
  };
  const exibir = (k: string) => [...(grafias.get(k) ?? new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1] || comparar(a[0], b[0]))[0]?.[0] ?? '';
  const mapa = new Map<string, Map<string, T[]>>();
  for (const n of novelos) {
    contar(n[por]);
    contar(n[outro]);
    const nome = chave(n[por]);
    const sub = chave(n[outro]);
    if (!mapa.has(nome)) mapa.set(nome, new Map());
    const subs = mapa.get(nome)!;
    if (!subs.has(sub)) subs.set(sub, []);
    subs.get(sub)!.push(n);
  }
  return [...mapa.entries()]
    .map(([k, subs]) => [k ? exibir(k) : sem, subs] as const)
    .sort(([a], [b]) => (a === sem ? 1 : b === sem ? -1 : comparar(a, b)))
    .map(([nome, subs]) => {
      const sub = [...subs.entries()]
        .map(([k, itens]) => [k ? exibir(k) : '', itens] as const)
        .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : comparar(a, b)))
        .map(([s, itens]) => ({ nome: s, itens: [...itens].sort((x, y) => usos(y) - usos(x) || comparar(x.cor, y.cor)) }));
      const totalG = sub.reduce((s, l) => s + l.itens.reduce((t, i) => t + Math.max(0, i.estoqueG), 0), 0);
      return { nome, sub, totalG };
    });
}
