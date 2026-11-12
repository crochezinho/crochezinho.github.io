import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDesconto, conferirEstoque, formatarEstoque } from './estoque.ts';

test('desconto do estoque ao concluir', () => {
  const itens = calcularDesconto(
    [
      { noveloId: 'a', gramas: 90 },
      { noveloId: 'b', gramas: 60 },
      { noveloId: 'a', gramas: 30 },
      { noveloId: 'x', gramas: 10 },
      { noveloId: 'b', gramas: 0 }
    ],
    [
      { id: 'a', estoqueG: 150 },
      { id: 'b', estoqueG: 40 }
    ]
  );
  assert.deepEqual(itens, [
    { noveloId: 'a', gramas: 120, antes: 150, depois: 30, faltou: 0 },
    { noveloId: 'b', gramas: 60, antes: 40, depois: 0, faltou: 20 }
  ]);
});

test('desconto com várias peças e fio manual', () => {
  const itens = calcularDesconto(
    [
      { noveloId: 'a', gramas: 30 },
      { noveloId: null, gramas: 0 }
    ],
    [{ id: 'a', estoqueG: 150 }],
    4
  );
  assert.deepEqual(itens, [{ noveloId: 'a', gramas: 120, antes: 150, depois: 30, faltou: 0 }]);
});

test('estoque sempre em gramas', () => {
  assert.equal(formatarEstoque(240), '240 g');
  assert.equal(formatarEstoque(100), '100 g');
  assert.equal(formatarEstoque(1240), '1.240 g');
  assert.equal(formatarEstoque(0), 'sem estoque');
  assert.equal(formatarEstoque(-5), 'sem estoque');
});

test('quanto fio preciso: por peça × peças contra o estoque', () => {
  const itens = conferirEstoque(
    [
      { noveloId: 'a', gramas: 40 },
      { noveloId: 'b', gramas: 15 },
      { noveloId: 'a', gramas: 10 },
      { noveloId: null, gramas: 0 },
      { noveloId: 'x', gramas: 5 }
    ],
    [
      { id: 'a', estoqueG: 240, gramatura: 100 },
      { id: 'b', estoqueG: 200, gramatura: 0 }
    ],
    6
  );
  assert.deepEqual(itens, [
    { noveloId: 'a', precisa: 300, tem: 240, falta: 60, novelosAComprar: 1 },
    { noveloId: 'b', precisa: 90, tem: 200, falta: 0, novelosAComprar: 0 }
  ]);
});
