import { useEffect, useState } from 'preact/hooks';
import { guardarFoto, obterFoto } from '../db/sync.ts';
import { tamanhoFinal, type Retangulo } from '../domain/corte.ts';

const LARGURA_MAX = 1200;
const QUALIDADE = 0.82;
const LADO_TRABALHO = 2400;

function novaTela(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível preparar a foto.');
  return [canvas, ctx];
}

export async function abrirImagem(foto: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(foto);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const escala = Math.min(1, LADO_TRABALHO / Math.max(img.naturalWidth, img.naturalHeight));
    const [canvas, ctx] = novaTela(Math.max(1, Math.round(img.naturalWidth * escala)), Math.max(1, Math.round(img.naturalHeight * escala)));
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } catch (e) {
    throw e instanceof Error && e.message.startsWith('Não foi') ? e : new Error('Não deu para abrir essa imagem. Tente outra foto.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function girarImagem(origem: HTMLCanvasElement): HTMLCanvasElement {
  const [canvas, ctx] = novaTela(origem.height, origem.width);
  ctx.translate(canvas.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(origem, 0, 0);
  return canvas;
}

export async function recortarImagem(origem: HTMLCanvasElement, corte: Retangulo): Promise<Blob> {
  const { w, h } = tamanhoFinal(corte, LARGURA_MAX);
  const [canvas, ctx] = novaTela(w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(origem, corte.x, corte.y, corte.w, corte.h, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', QUALIDADE));
  if (!blob) throw new Error('Não foi possível preparar a foto.');
  return blob;
}

export const salvarFoto = (foto: Blob): Promise<string> => guardarFoto(foto);

export const lerFoto = (id: string): Promise<Blob | null> => obterFoto(id);

const enderecos = new Map<string, Promise<string | null>>();

function carregar(id: string): Promise<string | null> {
  let p = enderecos.get(id);
  if (!p) {
    p = obterFoto(id)
      .then((blob) => (blob ? URL.createObjectURL(blob) : null))
      .catch(() => null)
      .then((url) => {
        if (!url) setTimeout(() => enderecos.delete(id), 30_000);
        return url;
      });
    enderecos.set(id, p);
  }
  return p;
}

export function useFotoUrl(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!id) return;
    let vivo = true;
    void carregar(id).then((u) => vivo && setUrl(u));
    return () => {
      vivo = false;
    };
  }, [id]);
  return url;
}
