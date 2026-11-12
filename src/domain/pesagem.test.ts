import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chaveEmbalagem,
  contaDaEmbalagem,
  contaDasPesagens,
  descontarEmbalagem,
  estoqueDasPesagens,
  lerPesos,
  pesoDaEmbalagem,
  tiposDosNovelos
} from './pesagem.ts';

test('a chave ignora maiúsculas, acentos e espaços', () => {
  assert.equal(chaveEmbalagem(' Chenille '), 'embalagem.chenille');
  assert.equal(chaveEmbalagem('Balloon  Amigô'), 'embalagem.balloon amigo');
});

test('peso da embalagem pelo tipo do novelo', () => {
  const pesos = lerPesos([
    { chave: 'embalagem.chenille', valor: 5 },
    { chave: 'embalagem.amigurumi', valor: 0 },
    { chave: 'margemPct', valor: 40 }
  ]);
  assert.equal(pesoDaEmbalagem(pesos, 'Chenille'), 5);
  assert.equal(pesoDaEmbalagem(pesos, 'Amigurumi'), 0);
  assert.equal(pesoDaEmbalagem(pesos, ''), 0);
  assert.equal(pesos.size, 1);
});

test('desconta uma embalagem por novelo pesado', () => {
  assert.equal(descontarEmbalagem(312, 3, 5), 297);
  assert.equal(descontarEmbalagem(48, 1, 2.5), 46);
  assert.equal(descontarEmbalagem(3, 1, 5), 0);
  assert.equal(descontarEmbalagem(100, 0, 5), 100);
  assert.equal(contaDaEmbalagem(312, 3, 5), '312 g − 3 × 5 g');
  assert.equal(contaDaEmbalagem(48, 1, 2.5), '48 g − 2,5 g');
});

test('pesagens um por um: uma embalagem por novelo', () => {
  assert.equal(estoqueDasPesagens([65, 65, 40], 15), 125);
  assert.equal(contaDasPesagens([65, 65, 40], 15), '170 g − 3 × 15 g');
  assert.equal(estoqueDasPesagens([65, 0, 40], 15), 75);
  assert.equal(estoqueDasPesagens([10], 15), 0);
  assert.equal(estoqueDasPesagens([65, 40], 0), 105);
  assert.equal(contaDasPesagens([65, 40], 0), '105 g');
  assert.equal(estoqueDasPesagens([], 15), 0);
});

test('tipos dos novelos sem repetir grafias', () => {
  assert.deepEqual(tiposDosNovelos([{ tipo: 'Chenille' }, { tipo: 'chenille' }, { tipo: 'Chenille' }, { tipo: '' }, { tipo: 'Amigurumi' }]), [
    { tipo: 'Amigurumi', chave: 'embalagem.amigurumi' },
    { tipo: 'Chenille', chave: 'embalagem.chenille' }
  ]);
});
