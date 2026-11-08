import { db, novoId } from './db.ts';
import { calcularDesconto } from '../domain/estoque.ts';
import type { Calculo, FioUsado, Id, Novelo, Projeto, Rascunho, Sessao } from './types.ts';

const agora = () => Date.now();
const ativo = <T extends { excluidoEm: number | null }>(r: T) => !r.excluidoEm;

export type CamposProjeto = Pick<Projeto, 'nome' | 'tipo' | 'agulha' | 'capaCor' | 'quantidade'>;

export const CAPA_PADRAO = '#C98B86';

export async function criarProjeto(nome: string, campos: Partial<CamposProjeto> = {}): Promise<Id> {
  const t = agora();
  const projeto: Projeto = {
    id: novoId(),
    tipo: 'Amigurumi',
    agulha: '',
    capaCor: CAPA_PADRAO,
    ...campos,
    quantidade: Math.max(1, Math.floor(campos.quantidade ?? 1) || 1),
    nome: nome.trim() || 'Novo projeto',
    status: 'fazendo',
    fios: [],
    calculo: null,
    precoCentavos: null,
    criadoEm: t,
    concluidoEm: null,
    descontado: [],
    atualizadoEm: t,
    excluidoEm: null
  };
  await db.projetos.add(projeto);
  return projeto.id;
}

export async function listarProjetos(): Promise<Projeto[]> {
  const todos = await db.projetos.toArray();
  return todos.filter(ativo).sort((a, b) => b.criadoEm - a.criadoEm);
}

export async function editarProjeto(id: Id, campos: CamposProjeto): Promise<void> {
  const quantidade = Math.max(1, Math.floor(campos.quantidade) || 1);
  await db.transaction('rw', db.projetos, db.config, async () => {
    await db.projetos.update(id, { ...campos, nome: campos.nome.trim() || 'Projeto', quantidade, atualizadoEm: agora() });
    const r = await lerRascunho(id);
    if (r && (r.quantidade ?? 1) !== quantidade) await salvarRascunho(id, { ...r, quantidade });
  });
}

async function pausarSeRodando(projetoId: Id, t: number): Promise<void> {
  const abertas = (await db.sessoes.where('projetoId').equals(projetoId).toArray()).filter((s) => s.fim === null && ativo(s));
  for (const s of abertas) await db.sessoes.update(s.id, { fim: t, atualizadoEm: t });
}

export async function concluirProjeto(id: Id, descontar: boolean): Promise<void> {
  await db.transaction('rw', db.projetos, db.novelos, db.sessoes, async () => {
    const t = agora();
    const p = await db.projetos.get(id);
    if (!p || p.status === 'concluido') return;
    await pausarSeRodando(id, t);
    const descontado: FioUsado[] = [];
    if (descontar) {
      const novelos = (await db.novelos.toArray()).filter(ativo);
      for (const item of calcularDesconto(p.fios, novelos, p.quantidade ?? 1)) {
        await db.novelos.update(item.noveloId, { estoqueG: item.depois, atualizadoEm: t });
        descontado.push({ noveloId: item.noveloId, gramas: item.antes - item.depois });
      }
    }
    await db.projetos.update(id, { status: 'concluido', concluidoEm: t, descontado, atualizadoEm: t });
  });
}

export async function reabrirProjeto(id: Id, devolver: boolean): Promise<void> {
  await db.transaction('rw', db.projetos, db.novelos, async () => {
    const t = agora();
    const p = await db.projetos.get(id);
    if (!p || p.status !== 'concluido') return;
    if (devolver) {
      for (const d of p.descontado ?? []) {
        const n = await db.novelos.get(d.noveloId);
        if (n && !n.excluidoEm) await db.novelos.update(n.id, { estoqueG: n.estoqueG + d.gramas, atualizadoEm: t });
      }
    }
    await db.projetos.update(id, { status: 'fazendo', concluidoEm: null, descontado: [], atualizadoEm: t });
  });
}

export async function excluirProjeto(id: Id): Promise<void> {
  await db.transaction('rw', db.projetos, db.sessoes, async () => {
    const t = agora();
    await pausarSeRodando(id, t);
    await db.projetos.update(id, { excluidoEm: t, atualizadoEm: t });
  });
}

export async function restaurarProjeto(id: Id): Promise<void> {
  await db.projetos.update(id, { excluidoEm: null, atualizadoEm: agora() });
}

export async function listarSessoes(): Promise<Sessao[]> {
  return (await db.sessoes.toArray()).filter(ativo);
}

export async function sessaoAberta(): Promise<Sessao | undefined> {
  return (await listarSessoes()).find((s) => s.fim === null);
}

export async function iniciar(projetoId: Id): Promise<void> {
  await db.transaction('rw', db.sessoes, async () => {
    const t = agora();
    const abertas = (await db.sessoes.toArray()).filter((s) => s.fim === null && ativo(s));
    for (const s of abertas) {
      if (s.projetoId === projetoId) return;
      await db.sessoes.update(s.id, { fim: t, atualizadoEm: t });
    }
    await db.sessoes.add({
      id: novoId(),
      projetoId,
      inicio: t,
      fim: null,
      ajuste: false,
      editada: false,
      atualizadoEm: t,
      excluidoEm: null
    });
  });
}

export async function pausar(fim: number = agora()): Promise<void> {
  const s = await sessaoAberta();
  if (!s) return;
  await db.sessoes.update(s.id, { fim: Math.max(s.inicio, fim), atualizadoEm: agora() });
}

export async function ajustarTempo(projetoId: Id, ms: number): Promise<Id | null> {
  if (!ms) return null;
  const t = agora();
  const id = novoId();
  await db.sessoes.add({
    id,
    projetoId,
    inicio: t,
    fim: t + ms,
    ajuste: true,
    editada: false,
    atualizadoEm: t,
    excluidoEm: null
  });
  return id;
}

export async function editarSessao(id: Id, inicio: number, fim: number | null): Promise<void> {
  await db.sessoes.update(id, { inicio, fim, editada: true, atualizadoEm: agora() });
}

export async function excluirSessao(id: Id): Promise<void> {
  const t = agora();
  await db.sessoes.update(id, { excluidoEm: t, atualizadoEm: t });
}

export async function restaurarSessao(id: Id): Promise<void> {
  await db.sessoes.update(id, { excluidoEm: null, atualizadoEm: agora() });
}

export async function lerConfig<T>(chave: string, padrao: T): Promise<T> {
  const c = await db.config.get(chave);
  return c ? (c.valor as T) : padrao;
}

export async function salvarConfig(chave: string, valor: unknown): Promise<void> {
  await db.config.put({ chave, valor, atualizadoEm: agora() });
}

export async function apagarConfig(chave: string): Promise<void> {
  await db.config.delete(chave);
}

export const PADRAO_VALOR_HORA = 800;
export const PADRAO_MARGEM = 40;

export interface PadroesCalculo {
  valorHoraCentavos: number;
  margemPct: number;
}

export async function lerPadroesCalculo(): Promise<PadroesCalculo> {
  return {
    valorHoraCentavos: await lerConfig('valorHoraCentavos', PADRAO_VALOR_HORA),
    margemPct: await lerConfig('margemPct', PADRAO_MARGEM)
  };
}

export async function listarNovelos(): Promise<Novelo[]> {
  const todos = await db.novelos.toArray();
  return todos.filter(ativo).sort((a, b) => a.marca.localeCompare(b.marca, 'pt-BR') || a.cor.localeCompare(b.cor, 'pt-BR'));
}

export type NovoNovelo = Pick<Novelo, 'cor' | 'marca' | 'tipo' | 'gramatura' | 'precoCentavos' | 'estoqueG' | 'capaCor' | 'textura'> &
  Partial<Pick<Novelo, 'lote' | 'agulha'>>;

export async function criarNovelo(n: NovoNovelo): Promise<Id> {
  const t = agora();
  const novelo: Novelo = {
    id: novoId(),
    lote: '',
    agulha: '',
    ...n,
    cor: n.cor.trim() || 'Novelo',
    marca: n.marca.trim(),
    tipo: n.tipo.trim(),
    atualizadoEm: t,
    excluidoEm: null
  };
  await db.novelos.add(novelo);
  return novelo.id;
}

export type CamposNovelo = Omit<Novelo, 'id' | 'atualizadoEm' | 'excluidoEm' | 'estoqueG'>;

export async function editarNovelo(id: Id, campos: CamposNovelo): Promise<void> {
  await db.novelos.update(id, {
    ...campos,
    cor: campos.cor.trim() || 'Novelo',
    marca: campos.marca.trim(),
    tipo: campos.tipo.trim(),
    atualizadoEm: agora()
  });
}

export async function definirEstoque(id: Id, gramas: number): Promise<void> {
  await db.novelos.update(id, { estoqueG: Math.max(0, Math.round(gramas)), atualizadoEm: agora() });
}

export async function excluirNovelo(id: Id): Promise<void> {
  const t = agora();
  await db.novelos.update(id, { excluidoEm: t, atualizadoEm: t });
}

export async function restaurarNovelo(id: Id): Promise<void> {
  await db.novelos.update(id, { excluidoEm: null, atualizadoEm: agora() });
}

export interface Apagados {
  projetos: Id[];
  sessoes: Id[];
  novelos: Id[];
}

export async function apagarEmMassa(o: { projetos: boolean; novelos: boolean }): Promise<Apagados> {
  const r: Apagados = { projetos: [], sessoes: [], novelos: [] };
  await db.transaction('rw', db.projetos, db.sessoes, db.novelos, db.config, async () => {
    const t = agora();
    const marca = { excluidoEm: t, atualizadoEm: t };
    if (o.projetos) {
      for (const p of (await db.projetos.toArray()).filter(ativo)) {
        await db.projetos.update(p.id, marca);
        r.projetos.push(p.id);
      }
      for (const s of (await db.sessoes.toArray()).filter(ativo)) {
        await db.sessoes.update(s.id, { ...marca, fim: s.fim ?? t });
        r.sessoes.push(s.id);
      }
      const chaves = (await db.config.toArray()).map((c) => c.chave).filter((c) => c.startsWith('calc.rascunho:') && c !== 'calc.rascunho:avulso');
      await db.config.bulkDelete([...chaves, 'calc.contexto']);
    }
    if (o.novelos) {
      for (const n of (await db.novelos.toArray()).filter(ativo)) {
        await db.novelos.update(n.id, marca);
        r.novelos.push(n.id);
      }
    }
  });
  return r;
}

export async function restaurarApagados(a: Apagados): Promise<void> {
  await db.transaction('rw', db.projetos, db.sessoes, db.novelos, async () => {
    const volta = { excluidoEm: null, atualizadoEm: agora() };
    for (const id of a.projetos) await db.projetos.update(id, volta);
    for (const id of a.sessoes) await db.sessoes.update(id, volta);
    for (const id of a.novelos) await db.novelos.update(id, volta);
  });
}

const chaveRascunho = (projetoId: Id | null) => `calc.rascunho:${projetoId ?? 'avulso'}`;

export async function lerRascunho(projetoId: Id | null): Promise<Rascunho | null> {
  return lerConfig<Rascunho | null>(chaveRascunho(projetoId), null);
}

export async function salvarRascunho(projetoId: Id | null, r: Rascunho): Promise<void> {
  await salvarConfig(chaveRascunho(projetoId), r);
}

export async function descartarRascunho(projetoId: Id | null): Promise<void> {
  await apagarConfig(chaveRascunho(projetoId));
}

export async function salvarCalculoNoProjeto(projetoId: Id, calculo: Calculo, precoPorPecaCentavos: number): Promise<void> {
  await db.transaction('rw', db.projetos, db.config, async () => {
    const fios: FioUsado[] = [];
    for (const { noveloId, gramas } of calculo.fios) if (noveloId) fios.push({ noveloId, gramas });
    await db.projetos.update(projetoId, {
      calculo,
      precoCentavos: precoPorPecaCentavos,
      quantidade: Math.max(1, calculo.quantidade ?? 1),
      fios,
      atualizadoEm: agora()
    });
    await db.config.delete(chaveRascunho(projetoId));
  });
}
