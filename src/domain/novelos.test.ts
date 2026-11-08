import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agrupar, filtrar, nomeDoNovelo, novelosInteiros, type NoveloLista } from './novelos.ts';

const n = (id: string, cor: string, marca: string, tipo: string, gramatura: number, estoqueG: number): NoveloLista => ({
  id,
  cor,
  marca,
  tipo,
  gramatura,
  estoqueG
});

const lista = [
  n('1', 'Rosa Chá', 'Círculo', 'Amigurumi', 75, 40),
  n('2', 'Sálvia', 'Pingouin', 'Chenille', 100, 500),
  n('3', 'Mel', 'Círculo', 'Chenille', 100, 200),
  n('4', 'Terracota', 'Círculo', 'Chenille', 100, 340),
  n('5', 'Avulso', '', '', 50, 50)
];

test('novelos inteiros em estoque', () => {
  assert.equal(novelosInteiros({ estoqueG: 340, gramatura: 100 }), 3);
  assert.equal(novelosInteiros({ estoqueG: 40, gramatura: 0 }), 0);
});

test('nome por extenso = tipo + cor', () => {
  assert.equal(nomeDoNovelo({ tipo: 'Amigurumi', cor: 'Rosa Chá' }), 'Amigurumi Rosa Chá');
  assert.equal(nomeDoNovelo({ tipo: '', cor: 'Rosa Chá' }), 'Rosa Chá');
  assert.equal(nomeDoNovelo({ tipo: ' ', cor: '' }), 'Novelo');
});

test('busca ignora acentos e combina termos', () => {
  assert.deepEqual(filtrar(lista, 'salvia').map((x) => x.id), ['2']);
  assert.deepEqual(filtrar(lista, 'circulo chenille').map((x) => x.id), ['3', '4']);
  assert.deepEqual(filtrar(lista, 'amigurumi').map((x) => x.id), ['1']);
  assert.equal(filtrar(lista, '').length, 5);
});

test('agrupa por marca → tipo, "Sem marca" por último', () => {
  assert.deepEqual(
    agrupar(lista, 'marca').map((g) => [g.nome, g.sub.map((s) => [s.nome, s.itens.map((i) => i.cor)]), g.totalInteiros]),
    [
      ['Círculo', [['Amigurumi', ['Rosa Chá']], ['Chenille', ['Mel', 'Terracota']]], 5],
      ['Pingouin', [['Chenille', ['Sálvia']]], 5],
      ['Sem marca', [['', ['Avulso']]], 1]
    ]
  );
});

test('agrupa por tipo → marca, "Sem tipo" por último', () => {
  assert.deepEqual(
    agrupar(lista, 'tipo').map((g) => [g.nome, g.sub.map((s) => [s.nome, s.itens.map((i) => i.cor)])]),
    [
      ['Amigurumi', [['Círculo', ['Rosa Chá']]]],
      ['Chenille', [['Círculo', ['Mel', 'Terracota']], ['Pingouin', ['Sálvia']]]],
      ['Sem tipo', [['', ['Avulso']]]]
    ]
  );
});
