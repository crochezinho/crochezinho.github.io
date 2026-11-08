import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buscarProjetos } from './projetos.ts';

test('busca de projetos por nome, cliente ou tipo', () => {
  const lista = [
    { id: 1, nome: 'Coelha Lavanda', cliente: 'Júlia', tipo: 'Amigurumi' },
    { id: 2, nome: 'Bolsa praia', cliente: '', tipo: 'Acessório' },
    { id: 3, nome: 'Urso Théo', cliente: 'Ana', tipo: 'Amigurumi' }
  ];
  assert.deepEqual(buscarProjetos(lista, 'theo').map((p) => p.id), [3]);
  assert.deepEqual(buscarProjetos(lista, 'julia').map((p) => p.id), [1]);
  assert.deepEqual(buscarProjetos(lista, 'amigurumi ana').map((p) => p.id), [3]);
  assert.equal(buscarProjetos(lista, '  ').length, 3);
});
