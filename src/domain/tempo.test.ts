import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  duracao,
  formatarSessao,
  formatarTotal,
  hmParaMs,
  precisaConfirmar,
  totalDoProjeto,
  totalNoMes,
  type SessaoTempo
} from './tempo.ts';

const MIN = 60_000;
const s = (projetoId: string, inicio: number, fim: number | null, excluidoEm: number | null = null): SessaoTempo => ({
  projetoId,
  inicio,
  fim,
  excluidoEm
});

test('duração de sessão fechada e aberta', () => {
  assert.equal(duracao(s('a', 0, 10 * MIN), 999 * MIN), 10 * MIN);
  assert.equal(duracao(s('a', 0, null), 25 * MIN), 25 * MIN);
});

test('total do projeto soma só o projeto, ignora excluídas e inclui ajustes negativos', () => {
  const agora = 100 * MIN;
  const lista = [
    s('a', 0, 30 * MIN),
    s('a', 40 * MIN, null),
    s('b', 0, 50 * MIN),
    s('a', 0, 20 * MIN, 1),
    s('a', 80 * MIN, 70 * MIN)
  ];
  assert.equal(totalDoProjeto(lista, 'a', agora), 80 * MIN);
});

test('total do projeto nunca fica negativo', () => {
  assert.equal(totalDoProjeto([s('a', 50 * MIN, 0)], 'a', 0), 0);
});

test('total no mês considera só sessões iniciadas no mês corrente', () => {
  const agora = new Date(2026, 10, 15, 12).getTime();
  const outubro = new Date(2026, 9, 31, 22).getTime();
  const novembro = new Date(2026, 10, 2, 10).getTime();
  const lista = [s('a', outubro, outubro + 60 * MIN), s('a', novembro, novembro + 90 * MIN)];
  assert.equal(totalNoMes(lista, agora), 90 * MIN);
});

test('formatação do total', () => {
  assert.equal(formatarTotal(0), '0 min');
  assert.equal(formatarTotal(43 * MIN + 59_000), '43 min');
  assert.equal(formatarTotal(134 * MIN), '2h 14min');
  assert.equal(formatarTotal(60 * MIN), '1h 00min');
  assert.equal(formatarTotal(-5 * MIN), '0 min');
});

test('formatação da sessão', () => {
  assert.equal(formatarSessao(7_000), '0min 07s');
  assert.equal(formatarSessao(43 * MIN + 7_000), '43min 07s');
  assert.equal(formatarSessao(65 * MIN), '1h 05min');
});

test('h + min para ms', () => {
  assert.equal(hmParaMs(1, 30), 90 * MIN);
  assert.equal(hmParaMs(0, -15), -15 * MIN);
});

test('pergunta de sessão longa', () => {
  const h = 60 * MIN;
  assert.equal(precisaConfirmar(0, null, 2 * h), false);
  assert.equal(precisaConfirmar(0, null, 3 * h + 1), true);
  assert.equal(precisaConfirmar(0, 2 * h, 4 * h), false);
  assert.equal(precisaConfirmar(0, 2 * h, 5 * h + 1), true);
});
