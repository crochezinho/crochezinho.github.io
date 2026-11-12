import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENQUADRE_INICIAL, ampliar, arrastar, limitar, retangulo, tamanhoFinal } from './corte.ts';

const perto = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} ≠ ${b}`);

test('sem zoom, o maior corte 4:3 no meio da foto', () => {
  assert.deepEqual(retangulo(3000, 4000, ENQUADRE_INICIAL), { x: 0, y: 875, w: 3000, h: 2250 });
  assert.deepEqual(retangulo(4000, 2000, ENQUADRE_INICIAL), { x: 666.6666666666667, y: 0, w: 2666.6666666666665, h: 2000 });
});

test('zoom fica entre 1 e 4 e o corte não sai da foto', () => {
  assert.equal(limitar(1200, 900, { zoom: 0.3, cx: 0.5, cy: 0.5 }).zoom, 1);
  assert.equal(limitar(1200, 900, { zoom: 9, cx: 0.5, cy: 0.5 }).zoom, 4);
  const e = limitar(1200, 900, { zoom: 2, cx: 0, cy: 1 });
  perto(e.cx, 0.25);
  perto(e.cy, 0.75);
  const r = retangulo(1200, 900, e);
  perto(r.x, 0);
  perto(r.y + r.h, 900);
});

test('arrastar move a foto junto com o dedo', () => {
  const e = arrastar(3000, 4000, ENQUADRE_INICIAL, 0, 20, 300);
  perto(retangulo(3000, 4000, e).y, 675);
  perto(arrastar(3000, 4000, ENQUADRE_INICIAL, 50, 0, 300).cx, 0.5);
});

test('ampliar mantém o centro', () => {
  const e = ampliar(3000, 4000, { zoom: 1, cx: 0.5, cy: 0.4 }, 2);
  assert.equal(e.zoom, 2);
  perto(e.cy, 0.4);
  assert.deepEqual(retangulo(3000, 4000, e), { x: 750, y: 1037.5, w: 1500, h: 1125 });
});

test('tamanho final: até 1200 px de largura, sem aumentar foto pequena', () => {
  assert.deepEqual(tamanhoFinal({ x: 0, y: 0, w: 3000, h: 2250 }, 1200), { w: 1200, h: 900 });
  assert.deepEqual(tamanhoFinal({ x: 0, y: 0, w: 800, h: 600 }, 1200), { w: 800, h: 600 });
});
