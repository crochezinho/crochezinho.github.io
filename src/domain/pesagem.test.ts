import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chaveEmbalagem,
  contaDaEmbalagem,
  contaDasPesagens,
  descontarEmbalagem,
  estoqueDasPesagens,
  lerPesos,
  novelosDasPesagens,
  PESAGENS_VAZIAS,
  unidadesDasPesagens,
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

test('pesagens: fechado conta a gramatura; só o que foi pesado perde a embalagem', () => {
  assert.equal(estoqueDasPesagens({ fechados: 2, abertos: [40] }, 50, 15), 125);
  assert.equal(contaDasPesagens({ fechados: 2, abertos: [40] }, 50, 15), '2 fechados × 50 g + 40 g − 15 g');
  assert.equal(estoqueDasPesagens({ fechados: 0, abertos: [65, null, 0, 40] }, 50, 15), 75);
  assert.equal(contaDasPesagens({ fechados: 0, abertos: [65, 40] }, 50, 15), '105 g − 2 × 15 g');
  assert.equal(estoqueDasPesagens({ fechados: 0, abertos: [10] }, 50, 15), 0);
  assert.equal(estoqueDasPesagens({ fechados: 0, abertos: [65, 40] }, 50, 0), 105);
  assert.equal(contaDasPesagens({ fechados: 1, abertos: [] }, 50, 15), '1 fechado × 50 g');
  assert.equal(estoqueDasPesagens(PESAGENS_VAZIAS, 50, 15), 0);
});

test('pesagens viram novelos numerados: fechados primeiro, depois os abertos', () => {
  let n = 0;
  const us = unidadesDasPesagens({ fechados: 2, abertos: [40, null, 3] }, 50, 15, () => `u${++n}`);
  assert.deepEqual(us, [
    { id: 'u1', numero: 1, pesoG: 50, fechado: true },
    { id: 'u2', numero: 2, pesoG: 50, fechado: true },
    { id: 'u3', numero: 3, pesoG: 25, fechado: false }
  ]);
  assert.equal(novelosDasPesagens({ fechados: 2, abertos: [40, null] }), 3);
});

test('tipos dos novelos sem repetir grafias', () => {
  assert.deepEqual(tiposDosNovelos([{ tipo: 'Chenille' }, { tipo: 'chenille' }, { tipo: 'Chenille' }, { tipo: '' }, { tipo: 'Amigurumi' }]), [
    { tipo: 'Amigurumi', chave: 'embalagem.amigurumi' },
    { tipo: 'Chenille', chave: 'embalagem.chenille' }
  ]);
});
