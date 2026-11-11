import type { ComponentChildren, JSX } from 'preact';
import { corValida, estiloCapa } from '../app/capa.ts';
import { useFotoUrl } from '../app/foto.ts';
import type { Textura } from '../db/types.ts';

export function Capa({
  cor,
  textura,
  fotoId,
  class: classe,
  tag = 'span',
  semFoto,
  children
}: {
  cor: string;
  textura?: Textura;
  fotoId?: string | null;
  class?: string;
  tag?: 'span' | 'div' | 'i';
  semFoto?: JSX.CSSProperties;
  children?: ComponentChildren;
}) {
  const url = useFotoUrl(fotoId);
  const style = url ? { background: `center / cover no-repeat url("${url}"), ${corValida(cor)}` } : (semFoto ?? estiloCapa(cor, textura));
  const Tag = tag;
  return (
    <Tag class={[classe, url && 'tem-foto'].filter(Boolean).join(' ') || undefined} style={style}>
      {children}
    </Tag>
  );
}
