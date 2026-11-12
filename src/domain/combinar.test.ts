import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alternarSelecao, lerIds, mover } from './combinar.ts';

test('seleção marca, desmarca e para em 3', () => {
  assert.deepEqual(alternarSelecao([], 'a'), ['a']);
  assert.deepEqual(alternarSelecao(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(alternarSelecao(['a', 'b', 'c'], 'd'), ['a', 'b', 'c']);
  assert.deepEqual(alternarSelecao(['a', 'b', 'c'], 'b'), ['a', 'c']);
});

test('mover troca com o vizinho e ignora as pontas', () => {
  assert.deepEqual(mover(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']);
  assert.deepEqual(mover(['a', 'b', 'c'], 2, -1), ['a', 'c', 'b']);
  assert.deepEqual(mover(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c']);
  assert.deepEqual(mover(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c']);
});

test('ids da rota: sem vazios, sem repetidos, no máximo 3', () => {
  assert.deepEqual(lerIds(undefined), []);
  assert.deepEqual(lerIds('a,,b,a'), ['a', 'b']);
  assert.deepEqual(lerIds('a,b,c,d'), ['a', 'b', 'c']);
});
