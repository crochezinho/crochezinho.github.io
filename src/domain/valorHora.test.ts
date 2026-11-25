import { test } from 'node:test';
import assert from 'node:assert/strict';
import { horasNoMes, mediaSemanal, valorPorHora } from './valorHora.ts';

test('valor por hora = (ganho + custos) ÷ horas do mês', () => {
  assert.equal(Math.round(horasNoMes(20) * 100) / 100, 86.67);
  assert.equal(valorPorHora({ ganhoCentavos: 200_000, custosCentavos: 16_000, horasSemana: 20 }), 2492);
  assert.equal(valorPorHora({ ganhoCentavos: 200_000, custosCentavos: 0, horasSemana: 0 }), null);
});

test('média semanal do cronômetro nas últimas 4 semanas', () => {
  const H = 3_600_000;
  const agora = 100 * 24 * H;
  const s = (inicio: number, horas: number, excluidoEm: number | null = null) => ({ projetoId: 'p', inicio, fim: inicio + horas * H, excluidoEm });
  const sessoes = [s(agora - 2 * 24 * H, 6), s(agora - 20 * 24 * H, 10), s(agora - 40 * 24 * H, 50), s(agora - H, 2, 1)];
  assert.equal(mediaSemanal(sessoes, agora), 4);
});
