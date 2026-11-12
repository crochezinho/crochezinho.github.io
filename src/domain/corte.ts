export const PROPORCAO = 4 / 3;
export const ZOOM_MAX = 4;

export interface Enquadre {
  zoom: number;
  cx: number;
  cy: number;
}

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ENQUADRE_INICIAL: Enquadre = { zoom: 1, cx: 0.5, cy: 0.5 };

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function tamanhoDoCorte(w: number, h: number, zoom: number): { cw: number; ch: number } {
  const larga = w / h > PROPORCAO;
  const cw = (larga ? h * PROPORCAO : w) / zoom;
  return { cw, ch: cw / PROPORCAO };
}

export function limitar(w: number, h: number, e: Enquadre): Enquadre {
  const zoom = entre(Number.isFinite(e.zoom) ? e.zoom : 1, 1, ZOOM_MAX);
  const { cw, ch } = tamanhoDoCorte(w, h, zoom);
  const mx = cw / 2 / w;
  const my = ch / 2 / h;
  return { zoom, cx: entre(e.cx, mx, 1 - mx), cy: entre(e.cy, my, 1 - my) };
}

export function retangulo(w: number, h: number, e: Enquadre): Retangulo {
  const l = limitar(w, h, e);
  const { cw, ch } = tamanhoDoCorte(w, h, l.zoom);
  return { x: l.cx * w - cw / 2, y: l.cy * h - ch / 2, w: cw, h: ch };
}

export function arrastar(w: number, h: number, e: Enquadre, dx: number, dy: number, larguraTela: number): Enquadre {
  const k = retangulo(w, h, e).w / Math.max(1, larguraTela);
  return limitar(w, h, { ...e, cx: e.cx - (dx * k) / w, cy: e.cy - (dy * k) / h });
}

export function ampliar(w: number, h: number, e: Enquadre, fator: number): Enquadre {
  return limitar(w, h, { ...e, zoom: e.zoom * fator });
}

export function tamanhoFinal(corte: Retangulo, ladoMax: number): { w: number; h: number } {
  const w = Math.max(1, Math.round(Math.min(ladoMax, corte.w)));
  return { w, h: Math.max(1, Math.round(w / PROPORCAO)) };
}
