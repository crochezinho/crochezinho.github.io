import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ehEncomenda, etapa, separarEncomendas } from './encomendas.ts';

type P = { id: string; status: 'fazendo' | 'concluido'; cliente?: string; entregaEm?: string | null; entregueEm?: number | null; concluidoEm: number | null };
const p = (id: string, o: Partial<P>): P => ({ id, status: 'fazendo', cliente: '', entregaEm: null, entregueEm: null, concluidoEm: null, ...o });

test('é encomenda quando tem cliente ou data de entrega', () => {
  assert.equal(ehEncomenda({ cliente: 'Ana', entregaEm: null }), true);
  assert.equal(ehEncomenda({ cliente: '', entregaEm: '2026-11-20' }), true);
  assert.equal(ehEncomenda({ cliente: '  ', entregaEm: null }), false);
  assert.equal(ehEncomenda({}), false);
});

test('etapas: fazendo → pronta (concluído) → entregue', () => {
  assert.equal(etapa({ status: 'fazendo', entregueEm: null }), 'fazendo');
  assert.equal(etapa({ status: 'concluido', entregueEm: null }), 'pronta');
  assert.equal(etapa({ status: 'concluido', entregueEm: 5 }), 'entregue');
});

test('separa encomendas por etapa e ordena', () => {
  const lista = [
    p('sem', {}),
    p('f1', { cliente: 'Ana', entregaEm: '2026-11-20' }),
    p('f2', { entregaEm: '2026-11-10' }),
    p('f3', { cliente: 'Bia' }),
    p('p1', { cliente: 'Cris', status: 'concluido', concluidoEm: 1, entregaEm: '2026-11-15' }),
    p('e1', { cliente: 'Duda', status: 'concluido', concluidoEm: 1, entregueEm: 100 }),
    p('e2', { cliente: 'Eva', status: 'concluido', concluidoEm: 1, entregueEm: 200 })
  ];
  const s = separarEncomendas(lista);
  assert.deepEqual(s.fazendo.map((x) => x.id), ['f2', 'f1', 'f3']);
  assert.deepEqual(s.pronta.map((x) => x.id), ['p1']);
  assert.deepEqual(s.entregue.map((x) => x.id), ['e2', 'e1']);
});
