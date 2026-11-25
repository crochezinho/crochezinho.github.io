import type { SessaoTempo } from './tempo.ts';
import { duracao } from './tempo.ts';

export const SEMANAS_POR_MES = 52 / 12;

export interface EntradaValorHora {
  /** Quanto ela quer tirar por mês, livre. */
  ganhoCentavos: number;
  /** MEI, internet, luz, ferramentas: o que se paga todo mês, vendendo ou não. */
  custosCentavos: number;
  /** Horas de agulha na mão por semana. */
  horasSemana: number;
}

export function horasNoMes(horasSemana: number): number {
  return Math.max(0, horasSemana) * SEMANAS_POR_MES;
}

export function valorPorHora(e: EntradaValorHora): number | null {
  const horas = horasNoMes(e.horasSemana);
  if (horas <= 0) return null;
  return Math.round((Math.max(0, e.ganhoCentavos) + Math.max(0, e.custosCentavos)) / horas);
}

/** Média de horas por semana no cronômetro, olhando as últimas `semanas` semanas. */
export function mediaSemanal(sessoes: SessaoTempo[], agora: number, semanas = 4): number {
  const ini = agora - semanas * 7 * 86_400_000;
  let ms = 0;
  for (const s of sessoes) if (!s.excluidoEm && s.inicio >= ini) ms += Math.max(0, duracao(s, agora));
  return ms / 3_600_000 / semanas;
}
