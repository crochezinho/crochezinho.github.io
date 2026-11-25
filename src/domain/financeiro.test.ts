import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dividir, faltaReceber, materialDoProjeto, mesDe, mesVizinho, nomeDoMes, somar, taxasDaShopee, VENDA_VAZIA } from './financeiro.ts';

test('divide a venda em material, ganhos e lucro', () => {
  const d = dividir({ ...VENDA_VAZIA, valorCentavos: 12000, freteCentavos: 2200 }, { minutos: 180, valorHoraCentavos: 2500, materialCentavos: 1800, taxasCentavos: 999 });
  assert.equal(d.taxas, 0, 'taxa só conta na Shopee');
  assert.equal(d.recebido, 12000, 'o frete não entra');
  assert.equal(d.ganhos, 7500);
  assert.equal(d.lucro, 12000 - 1800 - 7500);
  assert.equal(d.horaReal, Math.round((12000 - 1800) / 3));
});

test('lucro negativo quando a encomenda não pagou as horas', () => {
  const d = dividir({ ...VENDA_VAZIA, valorCentavos: 8000 }, { minutos: 240, valorHoraCentavos: 2500, materialCentavos: 1000, taxasCentavos: 0 });
  assert.equal(d.lucro, 8000 - 1000 - 10000);
  assert.equal(d.horaReal, 1750);
});

test('na Shopee as taxas saem antes', () => {
  const d = dividir({ ...VENDA_VAZIA, canal: 'shopee', valorCentavos: 6812 }, { minutos: 60, valorHoraCentavos: 2000, materialCentavos: 1000, taxasCentavos: 1812 });
  assert.equal(d.recebido, 5000);
  assert.equal(d.lucro, 5000 - 1000 - 2000);
  assert.equal(d.horaReal, 4000);
});

test('sem tempo, não há valor por hora real', () => {
  assert.equal(dividir({ ...VENDA_VAZIA, valorCentavos: 100 }, { minutos: 0, valorHoraCentavos: 2000, materialCentavos: 0, taxasCentavos: 0 }).horaReal, null);
});

test('falta receber: valor + frete − sinal; na Shopee nada', () => {
  assert.equal(faltaReceber({ valorCentavos: 12000, freteCentavos: 2200, sinalCentavos: 6000, canal: 'direto' }), 8200);
  assert.equal(faltaReceber({ valorCentavos: 12000, freteCentavos: 0, sinalCentavos: 20000, canal: 'direto' }), 0);
  assert.equal(faltaReceber({ valorCentavos: 12000, freteCentavos: 2200, sinalCentavos: 0, canal: 'shopee' }), 0);
});

test('taxas da Shopee por peça, vezes a quantidade', () => {
  const uma = taxasDaShopee(6812, 1, {});
  assert.equal(uma, 6812 - 5000);
  assert.equal(taxasDaShopee(6812 * 2, 2, {}), uma * 2);
  assert.equal(taxasDaShopee(0, 1, {}), 0);
});

test('material: fios pesados do projeto + fio manual e outros custos do cálculo, vezes as peças', () => {
  const novelos = [{ id: 'n1', precoCentavos: 2000, gramatura: 100 }];
  const p = {
    quantidade: 2,
    fios: [{ noveloId: 'n1', gramas: 30 }, { noveloId: 'n1', gramas: 0, aPesar: true }],
    calculo: {
      fios: [
        { noveloId: 'n1', gramas: 50, precoPorGramaCentavos: 15 },
        { noveloId: null, gramas: 0, precoPorGramaCentavos: 0, valorCentavos: 300 }
      ],
      extras: [{ valorCentavos: 200 }]
    }
  };
  assert.equal(materialDoProjeto(p, novelos), (30 * 20 + 300 + 200) * 2);
  assert.equal(materialDoProjeto({ ...p, fios: [] }, novelos), (50 * 15 + 300 + 200) * 2, 'sem fios no projeto, usa os do cálculo');
  assert.equal(materialDoProjeto({ fios: [], calculo: null }, novelos), 0);
});

test('meses', () => {
  assert.equal(mesDe(new Date(2026, 10, 30, 23, 59).getTime()), '2026-11');
  assert.equal(mesVizinho('2026-01', -1), '2025-12');
  assert.equal(mesVizinho('2026-12', 1), '2027-01');
  assert.equal(nomeDoMes('2026-11'), 'novembro');
  assert.equal(nomeDoMes('2026-03', true), 'março de 2026');
});

test('soma o mês', () => {
  const f = { minutos: 60, valorHoraCentavos: 1000, materialCentavos: 500, taxasCentavos: 0 };
  const r = somar([dividir({ ...VENDA_VAZIA, valorCentavos: 3000 }, f), dividir({ ...VENDA_VAZIA, valorCentavos: 2000 }, f)]);
  assert.deepEqual(r, { entregas: 2, cobrado: 5000, taxas: 0, recebido: 5000, material: 1000, ganhos: 2000, lucro: 2000 });
});
