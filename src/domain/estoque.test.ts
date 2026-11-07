import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularDesconto, formatarEstoque } from './estoque.ts';

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

test('estoque em novelos + gramas', () => {
  assert.equal(formatarEstoque(240, 100), '2 novelos + 40 g');
  assert.equal(formatarEstoque(100, 100), '1 novelo');
  assert.equal(formatarEstoque(300, 100), '3 novelos');
  assert.equal(formatarEstoque(40, 100), '40 g');
  assert.equal(formatarEstoque(0, 100), 'sem estoque');
  assert.equal(formatarEstoque(55, 0), '55 g');
});
