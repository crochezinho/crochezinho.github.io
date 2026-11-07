import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agruparPorCor, agruparPorMarca, estaAcabando, filtrar, novelosInteiros, type NoveloLista } from './novelos.ts';

const n = (id: string, cor: string, marca: string, linha: string, familia: string, gramatura: number, estoqueG: number): NoveloLista => ({
  id,
  cor,
  marca,
  linha,
  familia,
  fibra: '100% Algodão',
  gramatura,
  estoqueG
});

const lista = [
  n('1', 'Rosa Chá', 'Círculo', 'Amigurumi', 'Rosa', 75, 40),
  n('2', 'Sálvia', 'Pingouin', 'Algodão', 'Verde', 100, 500),
  n('3', 'Mel', 'Círculo', 'Algodão', 'Amarelo', 100, 200),
  n('4', 'Terracota', 'Círculo', 'Algodão', 'Terracota', 100, 340),
  n('5', 'Avulso', '', '', '', 50, 50)
];

test('acabando = menos de um novelo inteiro', () => {
  assert.equal(estaAcabando({ estoqueG: 40, gramatura: 75 }), true);
  assert.equal(estaAcabando({ estoqueG: 75, gramatura: 75 }), false);
  assert.equal(estaAcabando({ estoqueG: 0, gramatura: 0 }), true);
  assert.equal(novelosInteiros({ estoqueG: 340, gramatura: 100 }), 3);
});

test('busca ignora acentos e combina termos', () => {
  assert.deepEqual(filtrar(lista, 'salvia', false).map((x) => x.id), ['2']);
  assert.deepEqual(filtrar(lista, 'circulo algodao', false).map((x) => x.id), ['1', '3', '4']);
  assert.deepEqual(filtrar(lista, 'pingouin algodao', false).map((x) => x.id), ['2']);
  assert.deepEqual(filtrar(lista, '', true).map((x) => x.id), ['1']);
  assert.deepEqual(filtrar(lista, 'verde', false).map((x) => x.id), ['2']);
});

test('agrupa por marca e linha, "Sem marca" por último', () => {
  const g = agruparPorMarca(lista);
  assert.deepEqual(
    g.map((m) => [m.marca, m.linhas.map((l) => [l.linha, l.itens.map((i) => i.cor)]), m.totalInteiros]),
    [
      ['Círculo', [['Algodão', ['Mel', 'Terracota']], ['Amigurumi', ['Rosa Chá']]], 5],
      ['Pingouin', [['Algodão', ['Sálvia']]], 5],
      ['Sem marca', [['', ['Avulso']]], 1]
    ]
  );
});

test('agrupa por família de cor, "Outras" por último', () => {
  assert.deepEqual(
    agruparPorCor(lista).map((g) => g.familia),
    ['Amarelo', 'Rosa', 'Terracota', 'Verde', 'Outras']
  );
});
