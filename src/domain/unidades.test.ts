import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ajustarFechados, devolverAsUnidades, maiorNumero, novaUnidade, proximoNumero, pesarUnidade, somaUnidades, tirarDasUnidades, unidadesDoEstoque, type Unidade } from './unidades.ts';

const ids = () => {
  let n = 0;
  return () => `u${++n}`;
};

test('estoque antigo vira novelos: inteiros fechados + resto aberto', () => {
  const us = unidadesDoEstoque(240, 100, ids());
  assert.deepEqual(us, [
    { id: 'u1', numero: 1, pesoG: 100, fechado: true },
    { id: 'u2', numero: 2, pesoG: 100, fechado: true },
    { id: 'u3', numero: 3, pesoG: 40, fechado: false }
  ]);
  assert.equal(somaUnidades(us), 240);
  assert.deepEqual(unidadesDoEstoque(55, 0, ids()), [{ id: 'u1', numero: 1, pesoG: 55, fechado: false }]);
  assert.deepEqual(unidadesDoEstoque(0, 100, ids()), []);
});

test('números não se repetem quando um novelo acaba', () => {
  let us = unidadesDoEstoque(200, 100, ids());
  us = pesarUnidade(us, 'u1', 0);
  us = novaUnidade(us, 100, true, 'novo');
  assert.deepEqual(us.map((u) => u.numero), [2, 3]);
});

test('o número do último novelo que acabou não volta (piso guardado no cadastro)', () => {
  let us = unidadesDoEstoque(200, 100, ids());
  us = pesarUnidade(us, 'u2', 0);
  assert.equal(proximoNumero(us), 2);
  assert.equal(proximoNumero(us, 2), 3);
  assert.deepEqual(novaUnidade(us, 100, true, 'novo', 2).map((u) => u.numero), [1, 3]);
  assert.equal(maiorNumero(us, 2), 2);
});

test('pesar um novelo: abre, muda o peso; zero tira da lista', () => {
  const us = unidadesDoEstoque(200, 100, ids());
  assert.deepEqual(pesarUnidade(us, 'u2', 62)[1], { id: 'u2', numero: 2, pesoG: 62, fechado: false });
  assert.equal(pesarUnidade(us, 'u2', 0).length, 1);
});

test('tirar do estoque: primeiro o novelo escolhido, depois os abertos mais leves, por último os fechados', () => {
  const us: Unidade[] = [
    { id: 'a', numero: 1, pesoG: 50, fechado: true },
    { id: 'b', numero: 2, pesoG: 30, fechado: false },
    { id: 'c', numero: 3, pesoG: 10, fechado: false }
  ];
  const r1 = tirarDasUnidades(us, 25);
  assert.deepEqual(r1.retiradas.map((x) => [x.unidade.id, x.gramas]), [['c', 10], ['b', 15]]);
  assert.deepEqual(r1.unidades, [us[0], { id: 'b', numero: 2, pesoG: 15, fechado: false }]);
  const r2 = tirarDasUnidades(us, 20, 'a');
  assert.deepEqual(r2.unidades[0], { id: 'a', numero: 1, pesoG: 30, fechado: false });
  const r3 = tirarDasUnidades(us, 100);
  assert.equal(r3.faltou, 10);
  assert.deepEqual(r3.unidades, []);
});

test('devolver ao reabrir: o novelo que acabou volta com o mesmo número', () => {
  const us: Unidade[] = [
    { id: 'a', numero: 1, pesoG: 50, fechado: true },
    { id: 'b', numero: 2, pesoG: 30, fechado: false }
  ];
  const { unidades, retiradas } = tirarDasUnidades(us, 60, 'a');
  assert.deepEqual(devolverAsUnidades(unidades, retiradas), us);
});

test('gramatura mudou: fechados acompanham', () => {
  const us = ajustarFechados(unidadesDoEstoque(140, 100, ids()), 50);
  assert.deepEqual(us.map((u) => [u.pesoG, u.fechado]), [[50, true], [40, false]]);
});
