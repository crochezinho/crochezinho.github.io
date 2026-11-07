export interface SessaoTempo {
  projetoId: string;
  inicio: number;
  fim: number | null;
  excluidoEm: number | null;
}

const MIN = 60_000;
const HORA = 60 * MIN;

export function duracao(s: SessaoTempo, agora: number): number {
  return (s.fim ?? agora) - s.inicio;
}

export function totalDoProjeto(sessoes: SessaoTempo[], projetoId: string, agora: number): number {
  let total = 0;
  for (const s of sessoes) {
    if (s.projetoId === projetoId && !s.excluidoEm) total += duracao(s, agora);
  }
  return Math.max(0, total);
}

export function totalNoMes(sessoes: SessaoTempo[], agora: number): number {
  const d = new Date(agora);
  const ini = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  let total = 0;
  for (const s of sessoes) {
    if (!s.excluidoEm && s.inicio >= ini && s.inicio < fim) total += duracao(s, agora);
  }
  return Math.max(0, total);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatarTotal(ms: number): string {
  const min = Math.floor(Math.max(0, ms) / MIN);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m} min` : `${h}h ${pad(m)}min`;
}

export function formatarSessao(ms: number): string {
  const seg = Math.floor(Math.max(0, ms) / 1000);
  if (seg < 3600) return `${Math.floor(seg / 60)}min ${pad(seg % 60)}s`;
  return formatarTotal(ms);
}

export function hmParaMs(horas: number, minutos: number): number {
  return Math.round(horas * HORA + minutos * MIN);
}

export const LIMITE_SESSAO_LONGA = 3 * HORA;

export function precisaConfirmar(inicio: number, confirmadoEm: number | null, agora: number): boolean {
  const base = Math.max(inicio, confirmadoEm ?? 0);
  return agora - base > LIMITE_SESSAO_LONGA;
}
