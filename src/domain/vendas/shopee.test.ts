import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avisosShopee, calcShopee, degrausShopee, equilibrioShopee } from './shopee.ts';

const perto = (a: number, b: number, nome: string) => assert.ok(Math.abs(a - b) < 1e-9, `${nome}: esperado ${b}, obtido ${a}`);

test('Shopee CPF até 450 pedidos, sem campanha, 1 item', () => {
  const tabela = [
    [5.0, 1.0, 2.5, 3.5, 1.5],
    [30.0, 6.0, 4.5, 10.5, 19.5],
    [50.0, 10.0, 4.5, 14.5, 35.5],
    [79.99, 16.0, 4.5, 20.5, 59.49],
    [80.0, 11.2, 16.0, 27.2, 52.8],
    [150.0, 21.0, 20.0, 41.0, 109.0],
    [500.0, 70.0, 26.0, 96.0, 404.0]
  ];
  for (const [preco, com, fixa, total, recebe] of tabela) {
    const r = calcShopee({ preco }).item;
    perto(r.comissao, com, `${preco} comissão`);
    perto(r.taxaFixa, fixa, `${preco} taxa fixa`);
    perto(r.totalTaxas, total, `${preco} total`);
    perto(r.recebe, recebe, `${preco} recebe`);
  }
});

test('Shopee: +450 pedidos, quantidade, lucro e campanha', () => {
  perto(calcShopee({ preco: 50, mais450: true }).item.recebe, 32.5, '+450');
  perto(calcShopee({ preco: 30, qtd: 3 }).total.recebe, 58.5, '3 itens total');
  perto(calcShopee({ preco: 30, qtd: 3 }).item.recebe, 19.5, '3 itens por item');
  perto(calcShopee({ preco: 50, custo: 20, embalagem: 2 }).item.lucro!, 13.5, 'lucro');
  perto(calcShopee({ preco: 100, campanhaPct: 3 }).item.taxaCampanha, 3, 'campanha');
  assert.equal(calcShopee({ preco: 50 }).item.lucro, null);
});

test('Shopee: degraus e pontos de equilíbrio', () => {
  assert.deepEqual(degrausShopee(), [80, 100, 200]);
  perto(equilibrioShopee(80, {})!.preco, 87.78, 'eq 80');
  perto(equilibrioShopee(100, {})!.preco, 104.64, 'eq 100');
  perto(equilibrioShopee(200, {})!.preco, 206.96, 'eq 200');
  perto(equilibrioShopee(80, {})!.recebeAntes, 59.49, 'ref 79,99');
  perto(equilibrioShopee(100, {})!.recebeAntes, 69.99, 'ref 99,99');
  perto(equilibrioShopee(200, {})!.recebeAntes, 151.99, 'ref 199,99');
});

test('Shopee: avisos', () => {
  const p = { preco: 82 };
  assert.ok(avisosShopee(p, calcShopee(p)).some((a) => a.nivel === 'aviso' && a.texto.includes('87,78')), 'degrau de R$ 80');
  const barato = { preco: 10 };
  assert.ok(avisosShopee(barato, calcShopee(barato)).some((a) => a.texto.includes('Kit com 2')), 'kit');
  const prejuizo = { preco: 30, custo: 25 };
  assert.ok(avisosShopee(prejuizo, calcShopee(prejuizo)).some((a) => a.nivel === 'alerta'), 'prejuízo');
  const ok = { preco: 50, custo: 10 };
  assert.deepEqual(avisosShopee(ok, calcShopee(ok)), []);
});
