import { test } from 'node:test';
import assert from 'node:assert/strict';
import { brl, calcular, composicao, custoDoFio, gramasUsadas, precoPorGrama, textoParaCentavos } from './preco.ts';

test('preço por grama e custo do fio', () => {
  const ppg = precoPorGrama(1800, 75);
  assert.equal(ppg, 24);
  assert.equal(custoDoFio({ gramas: 120, precoPorGramaCentavos: ppg }), 2880);
  assert.equal(precoPorGrama(1000, 0), 0);
});

test('cálculo do protótipo v3: 135,38', () => {
  const r = calcular({
    fios: [
      { gramas: 120, precoPorGramaCentavos: precoPorGrama(1800, 75) },
      { gramas: 60, precoPorGramaCentavos: precoPorGrama(1650, 100) }
    ],
    minutos: 360,
    valorHoraCentavos: 800,
    extrasCentavos: [400, 600],
    margemPct: 40
  });
  assert.deepEqual(r, { fios: 3870, trabalho: 4800, outros: 1000, lucro: 3868, total: 13538, porPeca: 13538, quantidade: 1 });
});

test('sem arredondamento comercial e sem valores negativos', () => {
  const r = calcular({ fios: [], minutos: 134, valorHoraCentavos: 1000, extrasCentavos: [-500], margemPct: 0 });
  assert.equal(r.trabalho, 2233);
  assert.equal(r.total, 2233);
  assert.equal(r.outros, 0);
});

test('várias peças: fios e outros por peça, tempo total', () => {
  const r = calcular({
    fios: [{ gramas: 10, precoPorGramaCentavos: 24 }],
    minutos: 90,
    valorHoraCentavos: 800,
    extrasCentavos: [100],
    margemPct: 50,
    quantidade: 3
  });
  assert.deepEqual(r, { fios: 720, trabalho: 1200, outros: 300, lucro: 1110, total: 3330, porPeca: 1110, quantidade: 3 });
  assert.equal(calcular({ fios: [], minutos: 0, valorHoraCentavos: 0, extrasCentavos: [], margemPct: 0, quantidade: 0 }).quantidade, 1);
});

test('fio com valor manual', () => {
  assert.equal(custoDoFio({ gramas: 0, precoPorGramaCentavos: 0, valorCentavos: 1250 }), 1250);
  assert.equal(custoDoFio({ gramas: 50, precoPorGramaCentavos: 24, valorCentavos: 0 }), 0);
  assert.equal(custoDoFio({ gramas: 0, precoPorGramaCentavos: 0, valorCentavos: -5 }), 0);
});

test('gramas usadas pelo que sobrou', () => {
  assert.equal(gramasUsadas(100, 40), 60);
  assert.equal(gramasUsadas(100, 120), 0);
});

test('composição soma 1', () => {
  const c = composicao({ fios: 3870, trabalho: 4800, outros: 1000, lucro: 3868, total: 13538 });
  assert.ok(Math.abs(c.fios + c.trabalho + c.outros + c.lucro - 1) < 1e-9);
  assert.deepEqual(composicao({ fios: 0, trabalho: 0, outros: 0, lucro: 0, total: 0 }), { fios: 0, trabalho: 0, outros: 0, lucro: 0 });
});

test('dinheiro: formatar e ler', () => {
  assert.equal(brl(13538), 'R$ 135,38');
  assert.equal(brl(123456), 'R$ 1.234,56');
  assert.equal(textoParaCentavos('135,38'), 13538);
  assert.equal(textoParaCentavos('18'), 1800);
  assert.equal(textoParaCentavos('1.234,5'), 123450);
  assert.equal(textoParaCentavos('0,5'), 50);
  assert.equal(textoParaCentavos(''), 0);
  assert.equal(textoParaCentavos('abc'), 0);
});
