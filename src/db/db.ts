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

export const novoId = (): string => crypto.randomUUID();

export async function pedirArmazenamentoPersistente(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}
