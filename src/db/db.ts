import Dexie, { type EntityTable } from 'dexie';
import type { Config, Novelo, Projeto, Sessao } from './types';

export class CrochezinhoDB extends Dexie {
  projetos!: EntityTable<Projeto, 'id'>;
  sessoes!: EntityTable<Sessao, 'id'>;
  novelos!: EntityTable<Novelo, 'id'>;
  config!: EntityTable<Config, 'chave'>;

  constructor() {
    super('crochezinho');
    this.version(1).stores({
      projetos: 'id, status, atualizadoEm',
      sessoes: 'id, projetoId, inicio, atualizadoEm',
      novelos: 'id, marca, atualizadoEm',
      config: 'chave'
    });
  }
}

export const db = new CrochezinhoDB();

export const novoId = (): string => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

export async function pedirArmazenamentoPersistente(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
