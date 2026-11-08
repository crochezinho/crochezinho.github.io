import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarNovelo, normalizarProjeto } from './migracao.ts';
import { base64ParaTexto, mesclarPacotes, mesclarTabela, textoParaBase64, validarPacote, type Pacote } from './sync.ts';

type R = { id: string; atualizadoEm: number; nome?: string; excluidoEm?: number | null };
const pacote = (p: Partial<Pacote<R, R, R>>): Pacote<R, R, R> => ({
  app: 'crochezinho',
  versao: 1,
  geradoEm: 0,
  projetos: [],
  sessoes: [],
  novelos: [],
  config: [],
  ...p
});

test('vence a edição mais recente, nos dois sentidos', () => {
  const local: R[] = [
    { id: 'a', atualizadoEm: 10, nome: 'local novo' },
    { id: 'b', atualizadoEm: 5, nome: 'local velho' },
    { id: 'c', atualizadoEm: 7, nome: 'só local' }
  ];
  const remoto: R[] = [
    { id: 'a', atualizadoEm: 8, nome: 'remoto velho' },
    { id: 'b', atualizadoEm: 9, nome: 'remoto novo' },
    { id: 'd', atualizadoEm: 3, nome: 'só remoto' }
  ];
  const m = mesclarTabela(local, remoto, (x) => x.id, (x) => x.atualizadoEm);
  const nomes = Object.fromEntries(m.resultado.map((r) => [r.id, r.nome]));
  assert.deepEqual(nomes, { a: 'local novo', b: 'remoto novo', c: 'só local', d: 'só remoto' });
  assert.deepEqual(m.paraLocal.map((r) => r.id).sort(), ['b', 'd']);
  assert.equal(m.remotoMudou, true);
});

test('exclusão mais recente não ressuscita', () => {
  const m = mesclarTabela(
    [{ id: 'a', atualizadoEm: 5, excluidoEm: null } as R],
    [{ id: 'a', atualizadoEm: 9, excluidoEm: 9 } as R],
    (x) => x.id,
    (x) => x.atualizadoEm
  );
  assert.equal(m.resultado[0].excluidoEm, 9);
  assert.equal(m.paraLocal.length, 1);
  assert.equal(m.remotoMudou, false);
});

test('iguais: nada a fazer', () => {
  const x = [{ id: 'a', atualizadoEm: 5 }];
  const m = mesclarTabela(x, [...x], (r) => r.id, (r) => r.atualizadoEm);
  assert.equal(m.paraLocal.length, 0);
  assert.equal(m.remotoMudou, false);
});

test('pacotes: remoto vazio, config filtrada e só chaves sincronizadas', () => {
  const local = pacote({
    projetos: [{ id: 'p', atualizadoEm: 1 }],
    config: [
      { chave: 'nome', valor: 'Bruna', atualizadoEm: 4 },
      { chave: 'sync.token', valor: 'segredo', atualizadoEm: 4 },
      { chave: 'valorHoraCentavos', valor: 800, atualizadoEm: 2 }
    ]
  });
  const remoto = pacote({ config: [{ chave: 'valorHoraCentavos', valor: 1200, atualizadoEm: 3 }] });
  const m = mesclarPacotes(local, remoto, 99);
  assert.equal(m.remotoMudou, true);
  assert.deepEqual(m.pacote.config.map((c) => c.chave).sort(), ['nome', 'valorHoraCentavos']);
  assert.equal(m.pacote.config.find((c) => c.chave === 'valorHoraCentavos')!.valor, 1200);
  assert.deepEqual(m.paraLocal.config.map((c) => c.chave), ['valorHoraCentavos']);
  assert.ok(!JSON.stringify(m.pacote).includes('segredo'), 'o token nunca vai para o pacote');
  assert.equal(mesclarPacotes(local, null, 1).remotoMudou, true);
});

test('validação do pacote', () => {
  assert.throws(() => validarPacote({ app: 'outro' }), /não é um backup/);
  assert.throws(() => validarPacote({ ...pacote({}), versao: 99 }), /versão mais nova/);
  assert.throws(() => validarPacote({ ...pacote({}), novelos: 'x' }), /corrompido/);
  assert.throws(() => validarPacote(pacote({ projetos: [{ id: 1 } as unknown as R] })), /corrompido/);
  assert.ok(validarPacote(pacote({})));
});

test('base64 com acentos ida e volta', () => {
  const t = JSON.stringify({ cor: 'Sálvia', nome: 'Coração de crochê ✿' });
  assert.equal(base64ParaTexto(textoParaBase64(t)), t);
});

test('migração v1 → v2 de novelos e projetos', () => {
  const v1 = { id: 'n', atualizadoEm: 1, cor: 'Rosa', linha: 'Amigurumi', familia: 'Rosa', fibra: 'Algodão', metros: 200, capaCor: '#C98B86' };
  const v2 = normalizarNovelo(v1) as Record<string, unknown>;
  assert.equal(v2.tipo, 'Amigurumi');
  assert.equal(v2.textura, 'liso');
  assert.deepEqual(['linha', 'familia', 'fibra', 'metros'].filter((k) => k in v2), []);
  assert.deepEqual(normalizarNovelo(v2), v2, 'idempotente');
  assert.equal((normalizarNovelo({ tipo: 'Chenille', linha: 'X', textura: 'felpudo' }) as { tipo: string }).tipo, 'Chenille');
  assert.equal((normalizarProjeto({ id: 'p' }) as { quantidade: number }).quantidade, 1);
  assert.equal((normalizarProjeto({ quantidade: 5 }) as { quantidade: number }).quantidade, 5);
  assert.equal((normalizarProjeto({ quantidade: 0 }) as { quantidade: number }).quantidade, 1);
});
