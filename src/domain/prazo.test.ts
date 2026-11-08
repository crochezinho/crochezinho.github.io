import { test } from 'node:test';
import assert from 'node:assert/strict';
import { descreverPrazo, diasAte, ordenarPorPrazo } from './prazo.ts';

const hoje = new Date(2026, 10, 8, 23, 30);

test('dias até a entrega', () => {
  assert.equal(diasAte('2026-11-08', hoje), 0);
  assert.equal(diasAte('2026-11-09', hoje), 1);
  assert.equal(diasAte('2026-11-06', hoje), -2);
  assert.equal(diasAte('2026-12-01', hoje), 23);
  assert.equal(diasAte('', hoje), null);
  assert.equal(diasAte(null, hoje), null);
  assert.equal(diasAte('8/11/2026', hoje), null);
});

test('texto e urgência do prazo', () => {
  assert.deepEqual(descreverPrazo('2026-11-07', hoje), { texto: 'atrasada 1 dia', nivel: 'atrasada' });
  assert.deepEqual(descreverPrazo('2026-11-05', hoje), { texto: 'atrasada 3 dias', nivel: 'atrasada' });
  assert.deepEqual(descreverPrazo('2026-11-08', hoje), { texto: 'entrega hoje', nivel: 'perto' });
  assert.deepEqual(descreverPrazo('2026-11-09', hoje), { texto: 'entrega amanhã', nivel: 'perto' });
  assert.deepEqual(descreverPrazo('2026-11-11', hoje), { texto: 'entrega em 3 dias', nivel: 'perto' });
  assert.deepEqual(descreverPrazo('2026-11-14', hoje), { texto: 'entrega em 6 dias', nivel: 'ok' });
  assert.deepEqual(descreverPrazo('2026-11-20', hoje), { texto: 'entrega 20 nov', nivel: 'ok' });
  assert.equal(descreverPrazo(null, hoje), null);
});

test('encomendas primeiro, pela entrega mais próxima', () => {
  const lista = [
    { id: 'a', entregaEm: null },
    { id: 'b', entregaEm: '2026-11-20' },
    { id: 'c' },
    { id: 'd', entregaEm: '2026-11-05' },
    { id: 'e', entregaEm: '2026-11-10' }
  ];
  assert.deepEqual(ordenarPorPrazo(lista).map((p) => p.id), ['d', 'e', 'b', 'a', 'c']);
});
