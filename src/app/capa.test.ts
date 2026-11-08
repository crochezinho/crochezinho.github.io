import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETA, corValida, hexParaHsl, hslParaHex } from './capa.ts';

test('cor válida', () => {
  assert.equal(corValida('#3366aa'), '#3366aa');
  assert.equal(corValida('vermelho'), '#C98B86');
  assert.equal(corValida(undefined, '#000000'), '#000000');
});

test('hex ↔ hsl ida e volta', () => {
  assert.deepEqual(hexParaHsl('#FF0000'), { h: 0, s: 100, l: 50 });
  assert.deepEqual(hexParaHsl('#FFFFFF'), { h: 0, s: 0, l: 100 });
  assert.equal(hslParaHex({ h: 120, s: 100, l: 25 }), '#008000');
  assert.equal(hslParaHex({ h: 360, s: 100, l: 50 }), '#FF0000');
  for (const c of PALETA) {
    const volta = hslParaHex(hexParaHsl(c));
    for (let i = 1; i < 7; i += 2) assert.ok(Math.abs(parseInt(c.slice(i, i + 2), 16) - parseInt(volta.slice(i, i + 2), 16)) <= 2, `${c} → ${volta}`);
  }
});
