import { PREFIXO_CLIENTE } from './sync.ts';

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** "Ana  Júlia " e "ana julia" são a mesma cliente. */
export function chaveDoNome(nome: string): string {
  return semAcento(nome.trim()).replace(/\s+/g, ' ');
}

export const chaveDaFicha = (chave: string) => PREFIXO_CLIENTE + chave;

/** Contato e anotações. O resto (encomendas, quanto comprou) sai dos projetos. */
export interface Ficha {
  contato: string;
  anotacoes: string;
}

export const FICHA_VAZIA: Ficha = { contato: '', anotacoes: '' };

export function lerFichas(config: { chave: string; valor: unknown }[]): Map<string, Ficha> {
  const fichas = new Map<string, Ficha>();
  for (const c of config) {
    if (!c.chave.startsWith(PREFIXO_CLIENTE) || !c.valor || typeof c.valor !== 'object') continue;
    const v = c.valor as Partial<Ficha>;
    fichas.set(c.chave.slice(PREFIXO_CLIENTE.length), { contato: String(v.contato ?? ''), anotacoes: String(v.anotacoes ?? '') });
  }
  return fichas;
}

interface ProjetoDeCliente {
  cliente?: string;
  criadoEm: number;
  status: 'fazendo' | 'concluido';
  entregueEm?: number | null;
}

export interface Cliente<T> {
  chave: string;
  nome: string;
  projetos: T[];
  entregues: number;
  emAberto: number;
  /** Soma do valor das encomendas já entregues. */
  totalCentavos: number;
  primeiraEm: number;
  ultimaEm: number;
}

export function agruparClientes<T extends ProjetoDeCliente>(projetos: T[], valorDe: (p: T) => number): Cliente<T>[] {
  const grupos = new Map<string, T[]>();
  for (const p of projetos) {
    const chave = chaveDoNome(p.cliente ?? '');
    if (!chave) continue;
    grupos.set(chave, [...(grupos.get(chave) ?? []), p]);
  }
  return [...grupos.entries()]
    .map(([chave, lista]) => {
      const ordem = [...lista].sort((a, b) => b.criadoEm - a.criadoEm);
      const entregues = lista.filter((p) => p.entregueEm);
      return {
        chave,
        nome: ordem[0].cliente!.trim(),
        projetos: ordem,
        entregues: entregues.length,
        emAberto: lista.filter((p) => !p.entregueEm).length,
        totalCentavos: entregues.reduce((s, p) => s + Math.max(0, valorDe(p)), 0),
        primeiraEm: ordem[ordem.length - 1].criadoEm,
        ultimaEm: ordem[0].criadoEm
      };
    })
    .sort((a, b) => b.ultimaEm - a.ultimaEm);
}

export function buscarClientes<T>(clientes: Cliente<T>[], busca: string, fichas: Map<string, Ficha> = new Map()): Cliente<T>[] {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean);
  if (!termos.length) return clientes;
  return clientes.filter((c) => {
    const alvo = semAcento(`${c.nome} ${fichas.get(c.chave)?.contato ?? ''}`);
    return termos.every((t) => alvo.includes(t));
  });
}

/** Ao digitar "ana" num projeto novo, usa a grafia que já existe ("Ana"). */
export function grafiaDaCliente<T extends ProjetoDeCliente>(projetos: T[], nome: string): string {
  const chave = chaveDoNome(nome);
  if (!chave) return '';
  const igual = projetos.filter((p) => chaveDoNome(p.cliente ?? '') === chave).sort((a, b) => b.criadoEm - a.criadoEm)[0];
  return igual ? igual.cliente!.trim() : nome.trim();
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  const [a, b] = [partes[0], partes.length > 1 ? partes[partes.length - 1] : ''];
  return (a[0] + (b[0] ?? '')).toUpperCase();
}
