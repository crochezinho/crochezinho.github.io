import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ehEncomenda, etapa, naFila, paraEstaSemana, projetosComTempo, separarEncomendas } from './encomendas.ts';

type P = { id: string; status: 'fazendo' | 'concluido'; cliente?: string; entregaEm?: string | null; entregueEm?: number | null; concluidoEm: number | null };
const p = (id: string, o: Partial<P>): P => ({ id, status: 'fazendo', cliente: '', entregaEm: null, entregueEm: null, concluidoEm: null, ...o });

test('é encomenda quando tem cliente ou data de entrega', () => {
  assert.equal(ehEncomenda({ cliente: 'Ana', entregaEm: null }), true);
  assert.equal(ehEncomenda({ cliente: '', entregaEm: '2026-11-20' }), true);
  assert.equal(ehEncomenda({ cliente: '  ', entregaEm: null }), false);
  assert.equal(ehEncomenda({}), false);
});

test('etapas: na fila → fazendo (tem tempo) → pronta (concluído) → entregue', () => {
  const comTempo = projetosComTempo([{ projetoId: 'b' }]);
  assert.equal(etapa({ id: 'a', status: 'fazendo', entregueEm: null }, comTempo), 'fila');
  assert.equal(etapa({ id: 'b', status: 'fazendo', entregueEm: null }, comTempo), 'fazendo');
  assert.equal(etapa({ id: 'a', status: 'concluido', entregueEm: null }, comTempo), 'pronta');
  assert.equal(etapa({ id: 'a', status: 'concluido', entregueEm: 5 }, comTempo), 'entregue');
  assert.equal(naFila({ id: 'a', status: 'fazendo' }, comTempo), true);
  assert.equal(naFila({ id: 'b', status: 'fazendo' }, comTempo), false);
  assert.equal(naFila({ id: 'a', status: 'concluido' }, comTempo), false);
});

test('separa encomendas por etapa e ordena', () => {
  const lista = [
    p('sem', {}),
    p('f1', { cliente: 'Ana', entregaEm: '2026-11-20' }),
    p('f2', { entregaEm: '2026-11-10' }),
    p('f3', { cliente: 'Bia' }),
    p('q1', { cliente: 'Gabi', entregaEm: '2026-12-01' }),
    p('q2', { cliente: 'Lia', entregaEm: '2026-11-25' }),
    p('p1', { cliente: 'Cris', status: 'concluido', concluidoEm: 1, entregaEm: '2026-11-15' }),
    p('e1', { cliente: 'Duda', status: 'concluido', concluidoEm: 1, entregueEm: 100 }),
    p('e2', { cliente: 'Eva', status: 'concluido', concluidoEm: 1, entregueEm: 200 })
  ];
  const s = separarEncomendas(lista, projetosComTempo(['f1', 'f2', 'f3', 'sem'].map((projetoId) => ({ projetoId }))));
  assert.deepEqual(s.fila.map((x) => x.id), ['q2', 'q1']);
  assert.deepEqual(s.fazendo.map((x) => x.id), ['f2', 'f1', 'f3']);
  assert.deepEqual(s.pronta.map((x) => x.id), ['p1']);
  assert.deepEqual(s.entregue.map((x) => x.id), ['e2', 'e1']);
});

test('esta semana: entregas até domingo, com as atrasadas e sem as já entregues', () => {
  const quarta = new Date(2026, 10, 25); // quarta, 25/11
  const lista = [
    p('atrasada', { entregaEm: '2026-11-20' }),
    p('domingo', { entregaEm: '2026-11-29', status: 'concluido', concluidoEm: 1 }),
    p('segunda', { entregaEm: '2026-11-30' }),
    p('entregue', { entregaEm: '2026-11-26', status: 'concluido', concluidoEm: 1, entregueEm: 2 }),
    p('sem data', { cliente: 'Ana' })
  ];
  assert.deepEqual(paraEstaSemana(lista, quarta).map((x) => x.id), ['atrasada', 'domingo']);
  const domingo = new Date(2026, 10, 29);
  assert.deepEqual(paraEstaSemana(lista, domingo).map((x) => x.id), ['atrasada', 'domingo']);
});
