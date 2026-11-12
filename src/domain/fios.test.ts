import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fiosAoReabrir, fiosParaFazerDeNovo, trocarFiosDoEstoque, unidadesEmUso, usadoNoFim } from './fios.ts';

test('fios do projeto vão para o cálculo sem perder os manuais nem o preço da época', () => {
  let n = 0;
  const chave = () => `nova${++n}`;
  const atuais = [
    { chave: 'a', noveloId: 'rosa', gramas: 40, precoPorGramaCentavos: 18 },
    { chave: 'm', noveloId: null, gramas: 0, precoPorGramaCentavos: 0, nome: 'Olhos', valorCentavos: 300 },
    { chave: 'b', noveloId: 'mel', gramas: 10, precoPorGramaCentavos: 20 }
  ];
  const novos = [
    { noveloId: 'rosa', gramas: 55 },
    { noveloId: 'azul', gramas: 12 }
  ];
  assert.deepEqual(trocarFiosDoEstoque(atuais, novos, () => 25, chave), [
    { chave: 'a', noveloId: 'rosa', gramas: 55, precoPorGramaCentavos: 18 },
    { chave: 'nova1', noveloId: 'azul', gramas: 12, precoPorGramaCentavos: 25 },
    { chave: 'm', noveloId: null, gramas: 0, precoPorGramaCentavos: 0, nome: 'Olhos', valorCentavos: 300 }
  ]);
});

test('mesmo novelo duas vezes: cada linha acha a sua', () => {
  const atuais = [
    { chave: 'x', noveloId: 'rosa', gramas: 10, precoPorGramaCentavos: 18 },
    { chave: 'y', noveloId: 'rosa', gramas: 30, precoPorGramaCentavos: 19 }
  ];
  const r = trocarFiosDoEstoque(atuais, [{ noveloId: 'rosa', gramas: 30 }, { noveloId: 'rosa', gramas: 10 }], () => 99, () => 'z');
  assert.deepEqual(r.map((f) => f.chave), ['y', 'x']);
});

test('novelos físicos em uso: só projetos em andamento', () => {
  const projetos = [
    { id: 'p1', nome: 'Urso', status: 'fazendo', fios: [{ unidadeId: 'u1', gramas: 20 }, { unidadeId: null, gramas: 5 }] },
    { id: 'p2', nome: 'Gato', status: 'concluido', fios: [{ unidadeId: 'u2', gramas: 10 }] },
    { id: 'p3', nome: 'Coelho', status: 'fazendo', fios: [{ unidadeId: 'u3', gramas: 0, aPesar: true }] }
  ];
  assert.deepEqual([...unidadesEmUso(projetos)], [
    ['u1', { projetoId: 'p1', projeto: 'Urso', aPesar: false, gramas: 20 }],
    ['u3', { projetoId: 'p3', projeto: 'Coelho', aPesar: true, gramas: 0 }]
  ]);
  assert.deepEqual([...unidadesEmUso(projetos, 'p1').keys()], ['u3']);
});

test('fazer de novo: fios do projeto, sem novelo físico nem "a pesar", com o preço atual', () => {
  let n = 0;
  const chave = () => `k${++n}`;
  const doCalculo = [
    { noveloId: 'rosa', gramas: 0, precoPorGramaCentavos: 18, unidadeId: 'u1', aPesar: true, antesG: 80 },
    { noveloId: null, gramas: 0, precoPorGramaCentavos: 0, nome: 'Olhos', valorCentavos: 300 }
  ];
  const doProjeto = [{ noveloId: 'rosa', gramas: 30, unidadeId: 'u1' }];
  assert.deepEqual(fiosParaFazerDeNovo(doCalculo, doProjeto, () => 25, chave), [
    { chave: 'k1', noveloId: 'rosa', gramas: 30, precoPorGramaCentavos: 25 },
    { chave: 'k2', noveloId: null, gramas: 0, precoPorGramaCentavos: 0, nome: 'Olhos', valorCentavos: 300 }
  ]);
  assert.equal(fiosParaFazerDeNovo(doCalculo, doProjeto, () => 0, chave)[0].precoPorGramaCentavos, 18);
});

test('reabrir: os fios voltam a ser os de antes de concluir', () => {
  const antes = [{ noveloId: 'rosa', gramas: 0, aPesar: true, antesG: 80 }];
  const depois = [{ noveloId: 'rosa', gramas: 30 }];
  assert.deepEqual(fiosAoReabrir({ fios: depois, fiosAntesDeConcluir: antes }), antes);
  assert.deepEqual(fiosAoReabrir({ fios: depois }), depois);
});

test('fio a pesar: usado = antes − sobra, por peça', () => {
  assert.equal(usadoNoFim(100, 40, 1), 60);
  assert.equal(usadoNoFim(100, 40, 3), 20);
  assert.equal(usadoNoFim(30, 50, 1), 0);
});
