import type { JSX } from 'preact';
import type { Textura } from '../db/types.ts';
import { BRILHO, FELPUDO } from './texturas.ts';

export const TEXTURAS: { valor: Textura; nome: string }[] = [
  { valor: 'liso', nome: 'Liso' },
  { valor: 'brilho', nome: 'Brilho' },
  { valor: 'felpudo', nome: 'Felpudo' }
];

export const PALETA = [
  '#F6C9D0', '#EFA3B2', '#E07A8F', '#C98B86', '#B5485F', '#8E2F45',
  '#F9D3B4', '#F2B07E', '#E5894F', '#F4DE8A', '#E6B86A', '#C99536',
  '#D6E8C3', '#B4D19A', '#9CAB8A', '#7FA68C', '#4F8A6B', '#2F5D4A',
  '#CFE6F2', '#A6CBE6', '#8FA9C4', '#5B8DC9', '#3A6297', '#24385E',
  '#E6D6F2', '#CDB4E6', '#B5A0C0', '#9874C2', '#6F4E99', '#4A2F6B',
  '#FFFFFF', '#F2E7DA', '#D9C7B3', '#A9A29C', '#8B6B5A', '#4A4340'
];

export function corValida(cor: string | undefined, padrao = '#C98B86'): string {
  return cor && /^#[0-9a-f]{6}$/i.test(cor) ? cor : padrao;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function hexParaHsl(hex: string): Hsl {
  const v = corValida(hex);
  const r = parseInt(v.slice(1, 3), 16) / 255;
  const g = parseInt(v.slice(3, 5), 16) / 255;
  const b = parseInt(v.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslParaHex({ h, s, l }: Hsl): string {
  const S = Math.min(100, Math.max(0, s)) / 100;
  const L = Math.min(100, Math.max(0, l)) / 100;
  const H = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((H / 60) % 2) - 1));
  const m = L - c / 2;
  const [r, g, b] = H < 60 ? [c, x, 0] : H < 120 ? [x, c, 0] : H < 180 ? [0, c, x] : H < 240 ? [0, x, c] : H < 300 ? [x, 0, c] : [c, 0, x];
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

const CAMADAS: Record<Textura, string> = {
  liso: '',
  brilho: `url("${BRILHO}") 0 0 / 64px 64px, `,
  felpudo: `url("${FELPUDO}") 0 0 / 68px 68px, `
};

export function estiloCapa(cor: string, textura: Textura = 'liso'): JSX.CSSProperties {
  return { background: `${CAMADAS[textura] ?? ''}${corValida(cor)}` };
}
