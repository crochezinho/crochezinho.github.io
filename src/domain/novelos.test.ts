import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agrupar, contarUso, filtrar, grafiaExistente, nomeDoNovelo, noveloRepetido, novelosInteiros, sugerirMarca, type NoveloLista } from './novelos.ts';

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
    agrupar(lista, 'marca').map((g) => [g.nome, g.sub.map((s) => [s.nome, s.itens.map((i) => i.cor)]), g.totalG]),
    [
      ['Círculo', [['Amigurumi', ['Rosa Chá']], ['Chenille', ['Mel', 'Terracota']]], 580],
      ['Pingouin', [['Chenille', ['Sálvia']]], 500],
      ['Sem marca', [['', ['Avulso']]], 50]
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

test('sugere a marca do mesmo novelo, senão a mais usada no tipo', () => {
  assert.equal(sugerirMarca(lista, 'chenille', 'Sálvia'), 'Pingouin');
  assert.equal(sugerirMarca(lista, 'Chenille', 'Lilás'), 'Círculo');
  assert.equal(sugerirMarca(lista, 'Chenille', ''), 'Círculo');
  assert.equal(sugerirMarca(lista, 'Barbante', 'Cru'), '');
  assert.equal(sugerirMarca(lista, '', 'Mel'), '');
});

test('usa a grafia que já existe', () => {
  assert.equal(grafiaExistente(lista, 'tipo', 'chenille '), 'Chenille');
  assert.equal(grafiaExistente(lista, 'marca', 'circulo'), 'Círculo');
  assert.equal(grafiaExistente(lista, 'tipo', 'Barbante'), '');
});

test('acha novelo repetido (tipo + cor + marca)', () => {
  assert.equal(noveloRepetido(lista, 'chenille', 'mel', 'circulo')?.id, '3');
  assert.equal(noveloRepetido(lista, 'Chenille', 'Mel', 'Pingouin'), undefined);
  assert.equal(noveloRepetido(lista, 'Chenille', 'Mel', 'Círculo', '3'), undefined);
  assert.equal(noveloRepetido(lista, '', 'Avulso', '')?.id, '5');
});

test('agrupa sem ligar para maiúsculas e acentos; mostra a grafia mais usada', () => {
  const grafias = [...lista, n('6', 'Azul', 'circulo', 'chenille ', 100, 100)];
  assert.deepEqual(
    agrupar(grafias, 'tipo').map((g) => [g.nome, g.sub.map((s) => [s.nome, s.itens.length]), g.totalG]),
    [
      ['Amigurumi', [['Círculo', 1]], 40],
      ['Chenille', [['Círculo', 3], ['Pingouin', 1]], 1140],
      ['Sem tipo', [['', 1]], 50]
    ]
  );
});

test('dentro do subgrupo, os mais usados primeiro', () => {
  const uso = contarUso([
    { fios: [{ noveloId: '4' }, { noveloId: '4' }] },
    { fios: [{ noveloId: '4' }, { noveloId: '3' }] }
  ]);
  assert.deepEqual([...uso.entries()].sort(), [['3', 1], ['4', 2]]);
  const chenille = agrupar(lista, 'tipo', uso).find((g) => g.nome === 'Chenille')!;
  assert.deepEqual(chenille.sub[0].itens.map((i) => i.cor), ['Terracota', 'Mel']);
});
