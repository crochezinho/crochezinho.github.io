import { useEffect, useState } from 'preact/hooks';
import { guardarFoto, obterFoto } from '../db/sync.ts';

const LADO_MAX = 1200;
const QUALIDADE = 0.82;

export async function reduzirFoto(arquivo: File): Promise<Blob> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const escala = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * escala));
    const h = Math.max(1, Math.round(img.naturalHeight * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não foi possível preparar a foto.');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', QUALIDADE));
    if (!blob) throw new Error('Não foi possível preparar a foto.');
    return blob;
  } catch (e) {
    throw e instanceof Error && e.message.startsWith('Não foi') ? e : new Error('Não deu para abrir essa imagem. Tente outra foto.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function adicionarFoto(arquivo: File): Promise<string> {
  return guardarFoto(await reduzirFoto(arquivo));
}

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
