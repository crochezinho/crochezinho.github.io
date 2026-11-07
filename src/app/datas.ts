const fmtDiaMes = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
const fmtDiaCurto = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const fmtHora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export const diaMes = (ms: number) => fmtDiaMes.format(ms);
export const diaCurto = (ms: number) => fmtDiaCurto.format(ms).replace(/\.| de /g, (m) => (m === '.' ? '' : ' '));
export const hora = (ms: number) => fmtHora.format(ms);

export function haQuanto(ms: number, agora: number = Date.now()): string {
  const min = Math.floor((agora - ms) / 60_000);
  if (min < 1) return 'agora mesmo';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.floor(h / 24);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
}

export function paraInputLocal(ms: number): string {
  const d = new Date(ms);
  return new Date(ms - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function deInputLocal(valor: string): number | null {
  if (!valor) return null;
  const ms = new Date(valor).getTime();
  return Number.isNaN(ms) ? null : ms;
}
