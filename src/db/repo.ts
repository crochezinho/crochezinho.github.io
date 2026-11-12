import { db, novoId } from './db.ts';
import { fiosAoReabrir, fiosParaFazerDeNovo, trocarFiosDoEstoque, usadoNoFim } from '../domain/fios.ts';
import { ajustarFechados, devolverAsUnidades, maiorNumero, novaUnidade, pesarUnidade, somaUnidades, tirarDasUnidades, type Unidade } from '../domain/unidades.ts';
import { precoPorGrama } from '../domain/preco.ts';
import { chaveEmbalagem, lerPesos, type PesosEmbalagem } from '../domain/pesagem.ts';
import { PREFIXO_EMBALAGEM } from '../domain/sync.ts';
import type { Calculo, FioDescontado, FioUsado, Id, Novelo, Projeto, Rascunho, Sessao } from './types.ts';

const agora = () => Date.now();
const ativo = <T extends { excluidoEm: number | null }>(r: T) => !r.excluidoEm;

export type CamposProjeto = Pick<Projeto, 'nome' | 'tipo' | 'agulha' | 'capaCor' | 'quantidade' | 'cliente' | 'entregaEm' | 'fotoId'>;

export const CAPA_PADRAO = '#C98B86';

export async function criarProjeto(nome: string, campos: Partial<CamposProjeto & Pick<Projeto, 'anotacoes' | 'receitaUrl'>> = {}): Promise<Id> {
  const t = agora();
  const projeto: Projeto = {
    id: novoId(),
    tipo: 'Amigurumi',
    agulha: '',
    capaCor: CAPA_PADRAO,
    cliente: '',
    entregaEm: null,
    entregueEm: null,
    fotoId: null,
    anotacoes: '',
    receitaUrl: '',
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
    await db.projetos.update(id, {
      ...campos,
      nome: campos.nome.trim() || 'Projeto',
      cliente: campos.cliente.trim(),
      entregaEm: campos.entregaEm || null,
      quantidade,
      atualizadoEm: agora()
    });
    const r = await lerRascunho(id);
    if (r && (r.quantidade ?? 1) !== quantidade) await salvarRascunho(id, { ...r, quantidade });
  });
}

export async function salvarAnotacoes(id: Id, anotacoes: string): Promise<void> {
  await db.projetos.update(id, { anotacoes, atualizadoEm: agora() });
}

export async function salvarReceita(id: Id, receitaUrl: string): Promise<void> {
  await db.projetos.update(id, { receitaUrl, atualizadoEm: agora() });
}

export async function duplicarProjeto(id: Id, quantidade: number): Promise<Id> {
  const p = await db.projetos.get(id);
  if (!p) throw new Error('Projeto não encontrado.');
  const q = Math.max(1, Math.floor(quantidade) || 1);
  const novoProjetoId = await criarProjeto(p.nome, {
    tipo: p.tipo,
    agulha: p.agulha,
    capaCor: p.capaCor,
    fotoId: p.fotoId ?? null,
    anotacoes: p.anotacoes ?? '',
    receitaUrl: p.receitaUrl ?? '',
    quantidade: q
  });
  await db.projetos.update(novoProjetoId, { fios: p.fios.filter((f) => !f.aPesar).map((f) => ({ noveloId: f.noveloId, gramas: f.gramas })) });
  if (p.calculo) {
    const novelos = await db.novelos.toArray();
    const precoAtual = (nid: string) => {
      const n = novelos.find((x) => x.id === nid && !x.excluidoEm);
      return n ? precoPorGrama(n.precoCentavos, n.gramatura) : 0;
    };
    await salvarRascunho(novoProjetoId, {
      fios: fiosParaFazerDeNovo(p.calculo.fios, p.fios, precoAtual, novaChave),
      quantidade: q,
      minutos: 0,
      minutosDoCrono: true,
      valorHoraCentavos: p.calculo.valorHoraCentavos,
      extras: p.calculo.extras.map((e) => ({ ...e, chave: novaChave() })),
      margemPct: p.calculo.margemPct
    });
  }
  return novoProjetoId;
}

async function pausarSeRodando(projetoId: Id, t: number): Promise<void> {
  const abertas = (await db.sessoes.where('projetoId').equals(projetoId).toArray()).filter((s) => s.fim === null && ativo(s));
  for (const s of abertas) await db.sessoes.update(s.id, { fim: t, atualizadoEm: t });
}

export async function concluirProjeto(id: Id, descontar: boolean, sobras: Record<number, number> = {}): Promise<void> {
  await db.transaction('rw', [db.projetos, db.novelos, db.sessoes, db.config], async () => {
    const t = agora();
    const p = await db.projetos.get(id);
    if (!p || p.status === 'concluido') return;
    await pausarSeRodando(id, t);
    const q = Math.max(1, p.quantidade ?? 1);
    const novelos = new Map((await db.novelos.toArray()).filter(ativo).map((n) => [n.id, n]));
    const antesDe = new Map([...novelos.values()].map((n) => [n.id, { unidades: n.unidades, ultimoNumero: n.ultimoNumero }]));
    const mudados = new Set<string>();
    const descontado: FioDescontado[] = [];

    const fios = p.fios.map((f, i) => {
      if (!f.aPesar) return f;
      const n = novelos.get(f.noveloId);
      if (!n) return { noveloId: f.noveloId, gramas: 0 };
      const sobra = sobras[i];
      if (sobra === undefined) return f;
      const u = n.unidades.find((x) => x.id === f.unidadeId);
      const antes = f.antesG ?? u?.pesoG ?? 0;
      const resto = Math.max(0, sobra);
      if (descontar && u) {
        const tirado = Math.max(0, u.pesoG - resto);
        n.unidades = pesarUnidade(n.unidades, u.id, Math.min(u.pesoG, resto));
        if (tirado > 0) descontado.push({ noveloId: n.id, gramas: tirado, unidade: u });
        mudados.add(n.id);
      } else if (descontar && !u && resto > 0) {
        const a = antesDe.get(n.id)!;
        n.unidades = novaUnidade(n.unidades, resto, false, novoId(), maiorNumero([...a.unidades, ...n.unidades], a.ultimoNumero));
        descontado.push({ noveloId: n.id, gramas: 0, unidade: n.unidades[n.unidades.length - 1], criada: true });
        mudados.add(n.id);
      }
      return { ...f, aPesar: false, gramas: usadoNoFim(antes, sobra, q) };
    });

    if (descontar) {
      for (const f of p.fios) {
        if (f.aPesar || f.gramas <= 0) continue;
        const n = novelos.get(f.noveloId);
        if (!n) continue;
        const r = tirarDasUnidades(n.unidades, f.gramas * q, f.unidadeId);
        n.unidades = r.unidades;
        for (const x of r.retiradas) descontado.push({ noveloId: n.id, gramas: x.gramas, unidade: x.unidade });
        mudados.add(n.id);
      }
    }
    for (const nid of mudados) {
      await db.novelos.update(nid, { ...camposDasUnidades(antesDe.get(nid)!, novelos.get(nid)!.unidades), atualizadoEm: t });
    }
    await db.projetos.update(id, { status: 'concluido', concluidoEm: t, descontado, fios, fiosAntesDeConcluir: p.fios, atualizadoEm: t });
    if (fios.some((f, i) => f !== p.fios[i])) await levarFiosAoCalculo(id, fios);
  });
}

export async function reabrirProjeto(id: Id, devolver: boolean): Promise<void> {
  await db.transaction('rw', [db.projetos, db.novelos, db.config], async () => {
    const t = agora();
    const p = await db.projetos.get(id);
    if (!p || p.status !== 'concluido') return;
    if (devolver) {
      const porNovelo = new Map<string, FioDescontado[]>();
      for (const d of p.descontado ?? []) porNovelo.set(d.noveloId, [...(porNovelo.get(d.noveloId) ?? []), d]);
      for (const [nid, ds] of porNovelo) {
        const n = await db.novelos.get(nid);
        if (!n || n.excluidoEm) continue;
        let piso = maiorNumero(n.unidades, n.ultimoNumero);
        const retiradas = ds
          .filter((d) => !d.criada)
          .map((d) => ({
            gramas: d.gramas,
            unidade: d.unidade ?? { id: novoId(), numero: ++piso, pesoG: d.gramas, fechado: false }
          }));
        const criadas = new Set(ds.filter((d) => d.criada && d.unidade).map((d) => d.unidade!.id));
        const unidades = devolverAsUnidades(n.unidades, retiradas).filter((u) => !criadas.has(u.id));
        await db.novelos.update(nid, { ...camposDasUnidades({ ...n, ultimoNumero: piso }, unidades), atualizadoEm: t });
      }
    }
    const fios = fiosAoReabrir(p);
    await db.projetos.update(id, { status: 'fazendo', concluidoEm: null, entregueEm: null, descontado: [], fios, fiosAntesDeConcluir: [], atualizadoEm: t });
    if (fios !== p.fios) await levarFiosAoCalculo(id, fios);
  });
}

function camposDasUnidades(n: Pick<Novelo, 'unidades' | 'ultimoNumero'>, unidades: Unidade[]): Pick<Novelo, 'unidades' | 'estoqueG' | 'ultimoNumero'> {
  return { unidades, estoqueG: somaUnidades(unidades), ultimoNumero: maiorNumero([...n.unidades, ...unidades], n.ultimoNumero) };
}

export async function marcarEntregue(id: Id, entregue: boolean): Promise<void> {
  const t = agora();
  await db.projetos.update(id, { entregueEm: entregue ? t : null, atualizadoEm: t });
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

export async function listarPesosEmbalagem(): Promise<PesosEmbalagem> {
  return lerPesos(await db.config.where('chave').startsWith(PREFIXO_EMBALAGEM).toArray());
}

export async function salvarPesoEmbalagem(tipo: string, gramas: number): Promise<void> {
  if (!tipo.trim()) return;
  await salvarConfig(chaveEmbalagem(tipo), Math.max(0, gramas));
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

export type NovoNovelo = Pick<Novelo, 'cor' | 'marca' | 'tipo' | 'gramatura' | 'precoCentavos' | 'unidades' | 'capaCor' | 'textura'> &
  Partial<Pick<Novelo, 'lote' | 'agulha' | 'fotoId'>>;

export async function criarNovelo(n: NovoNovelo): Promise<Id> {
  const t = agora();
  const novelo: Novelo = {
    id: novoId(),
    fotoId: null,
    lote: '',
    agulha: '',
    ...n,
    estoqueG: somaUnidades(n.unidades),
    ultimoNumero: maiorNumero(n.unidades),
    cor: n.cor.trim() || 'Novelo',
    marca: n.marca.trim(),
    tipo: n.tipo.trim(),
    atualizadoEm: t,
    excluidoEm: null
  };
  await db.novelos.add(novelo);
  return novelo.id;
}

export type CamposNovelo = Omit<Novelo, 'id' | 'atualizadoEm' | 'excluidoEm' | 'estoqueG' | 'unidades'>;

export async function lerNovelo(id: Id): Promise<Novelo | undefined> {
  return db.novelos.get(id);
}

export async function editarNovelo(id: Id, campos: CamposNovelo): Promise<void> {
  await db.transaction('rw', db.novelos, async () => {
    const atual = await db.novelos.get(id);
    if (!atual) return;
    const unidades = atual.gramatura !== campos.gramatura ? ajustarFechados(atual.unidades, campos.gramatura) : atual.unidades;
    await db.novelos.update(id, {
      ...campos,
      unidades,
      estoqueG: somaUnidades(unidades),
      cor: campos.cor.trim() || 'Novelo',
      marca: campos.marca.trim(),
      tipo: campos.tipo.trim(),
      atualizadoEm: agora()
    });
  });
}

export async function mudarUnidades(id: Id, mudar: (us: Unidade[], piso: number) => Unidade[]): Promise<Unidade[] | null> {
  return db.transaction('rw', db.novelos, async () => {
    const n = await db.novelos.get(id);
    if (!n) return null;
    const unidades = mudar(n.unidades, maiorNumero(n.unidades, n.ultimoNumero));
    await db.novelos.update(id, { ...camposDasUnidades(n, unidades), atualizadoEm: agora() });
    return n.unidades;
  });
}

export const definirUnidades = (id: Id, unidades: Unidade[]) => mudarUnidades(id, () => unidades);

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

const novaChave = () => Math.random().toString(36).slice(2, 10);

export function rascunhoDoCalculo(c: Calculo, projeto?: Pick<Projeto, 'quantidade'>): Rascunho {
  return {
    fios: c.fios.map((f) => ({ chave: novaChave(), ...f })),
    quantidade: projeto?.quantidade ?? c.quantidade ?? 1,
    minutos: c.minutos,
    minutosDoCrono: false,
    valorHoraCentavos: c.valorHoraCentavos,
    extras: c.extras.map((e) => ({ chave: novaChave(), ...e })),
    margemPct: c.margemPct
  };
}

export async function salvarFiosDoProjeto(id: Id, fios: FioUsado[]): Promise<void> {
  await db.transaction('rw', db.projetos, db.novelos, db.config, async () => {
    const p = await db.projetos.get(id);
    if (!p) return;
    await db.projetos.update(id, { fios, atualizadoEm: agora() });
    await levarFiosAoCalculo(id, fios);
  });
}

async function levarFiosAoCalculo(id: Id, fios: FioUsado[]): Promise<void> {
  const p = await db.projetos.get(id);
  if (!p) return;
  const base = (await lerRascunho(id)) ?? (p.calculo ? rascunhoDoCalculo(p.calculo, p) : null);
  if (!base) return;
  const novelos = await db.novelos.toArray();
  const preco = (nid: string) => {
    const n = novelos.find((x) => x.id === nid);
    return n ? precoPorGrama(n.precoCentavos, n.gramatura) : 0;
  };
  await salvarRascunho(id, { ...base, fios: trocarFiosDoEstoque(base.fios, fios, preco, novaChave) });
}

export async function salvarCalculoNoProjeto(projetoId: Id, calculo: Calculo, precoPorPecaCentavos: number): Promise<void> {
  await db.transaction('rw', db.projetos, db.config, async () => {
    const p = await db.projetos.get(projetoId);
    if (!p) return;
    const fios: FioUsado[] = [];
    for (const { noveloId, gramas, unidadeId, aPesar, antesG } of calculo.fios) {
      if (!noveloId) continue;
      fios.push(aPesar ? { noveloId, gramas: 0, unidadeId: unidadeId ?? null, aPesar: true, antesG } : unidadeId ? { noveloId, gramas, unidadeId } : { noveloId, gramas });
    }
    const concluido = p.status === 'concluido';
    await db.projetos.update(projetoId, {
      calculo,
      precoCentavos: precoPorPecaCentavos,
      ...(concluido ? {} : { quantidade: Math.max(1, calculo.quantidade ?? 1), fios }),
      atualizadoEm: agora()
    });
    await db.config.delete(chaveRascunho(projetoId));
  });
}
