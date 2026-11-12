import { useEffect, useRef, useState } from 'preact/hooks';
import { abrirImagem, girarImagem, recortarImagem } from '../app/foto.ts';
import { ENQUADRE_INICIAL, PROPORCAO, ZOOM_MAX, ampliar, arrastar, limitar, retangulo, type Enquadre } from '../domain/corte.ts';
import { Icone } from './Icone.tsx';

type Ponto = { x: number; y: number };
const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

export function EditorFoto({ foto, aoCancelar, aoPronto }: { foto: Blob; aoCancelar: () => void; aoPronto: (recorte: Blob) => Promise<void> | void }) {
  const [img, setImg] = useState<HTMLCanvasElement | null>(null);
  const [erro, setErro] = useState('');
  const [enq, setEnq] = useState<Enquadre>(ENQUADRE_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [largura, setLargura] = useState(0);
  const moldura = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const toques = useRef(new Map<number, Ponto>());
  const pinca = useRef<number | null>(null);

  useEffect(() => {
    let vivo = true;
    abrirImagem(foto)
      .then((c) => vivo && setImg(c))
      .catch((e: Error) => vivo && setErro(e.message));
    return () => {
      vivo = false;
    };
  }, [foto]);

  useEffect(() => {
    const m = moldura.current;
    if (!m) return;
    const medir = () => setLargura(m.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(m);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoCancelar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aoCancelar]);

  useEffect(() => {
    const antes = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = antes;
    };
  }, []);

  useEffect(() => {
    const c = tela.current;
    if (!c || !img || !largura) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.round(largura * dpr);
    const h = Math.round(w / PROPORCAO);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const r = retangulo(img.width, img.height, enq);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, w, h);
  }, [img, enq, largura]);

  const aoTocar = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    toques.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...toques.current.values()];
    pinca.current = pts.length === 2 ? distancia(pts[0], pts[1]) : null;
  };

  const aoMover = (e: PointerEvent) => {
    const antes = toques.current.get(e.pointerId);
    if (!antes || !img) return;
    const agora = { x: e.clientX, y: e.clientY };
    toques.current.set(e.pointerId, agora);
    const pts = [...toques.current.values()];
    if (pts.length === 1) {
      setEnq((atual) => arrastar(img.width, img.height, atual, agora.x - antes.x, agora.y - antes.y, largura));
    } else if (pts.length === 2) {
      const d = distancia(pts[0], pts[1]);
      if (pinca.current) {
        const fator = d / pinca.current;
        setEnq((atual) => ampliar(img.width, img.height, atual, fator));
      }
      pinca.current = d;
    }
  };

  const aoSoltar = (e: PointerEvent) => {
    toques.current.delete(e.pointerId);
    if (toques.current.size < 2) pinca.current = null;
  };

  const aoRolar = (e: WheelEvent) => {
    if (!img) return;
    e.preventDefault();
    setEnq((atual) => ampliar(img.width, img.height, atual, e.deltaY < 0 ? 1.08 : 1 / 1.08));
  };

  const girar = () => {
    if (!img) return;
    setImg(girarImagem(img));
    setEnq(ENQUADRE_INICIAL);
  };

  const usar = async () => {
    if (!img) return;
    setSalvando(true);
    try {
      await aoPronto(await recortarImagem(img, retangulo(img.width, img.height, enq)));
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  };

  return (
    <div class="editor-foto" role="dialog" aria-modal="true" aria-label="Ajustar foto">
      <p class="editor-foto-titulo">Ajustar foto</p>
      <div class="editor-foto-area">
        <div
          ref={moldura}
          class="editor-moldura"
          onPointerDown={aoTocar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          onWheel={aoRolar}
        >
          {img ? <canvas ref={tela} aria-label="Prévia do corte" /> : <p class="editor-aviso">{erro || 'Abrindo foto…'}</p>}
        </div>
        <p class="editor-dica">Arraste para posicionar · dois dedos para aproximar</p>
        {img && erro && <p class="editor-aviso">{erro}</p>}
      </div>

      <div class="editor-controles">
        <label class="editor-zoom">
          <span>Zoom</span>
          <input
            type="range"
            min={1}
            max={ZOOM_MAX}
            step={0.01}
            value={enq.zoom}
            disabled={!img}
            aria-label="Zoom"
            onInput={(e) => img && setEnq(limitar(img.width, img.height, { ...enq, zoom: Number(e.currentTarget.value) }))}
          />
        </label>
        <button type="button" class="editor-girar" aria-label="Girar 90°" disabled={!img} onClick={girar}>
          <Icone nome="girar" tamanho={22} />
        </button>
      </div>

      <div class="editor-acoes">
        <button type="button" class="botao" onClick={aoCancelar} disabled={salvando}>
          Cancelar
        </button>
        <button type="button" class="botao primario" onClick={() => void usar()} disabled={!img || salvando}>
          {salvando ? 'Salvando…' : 'Usar foto'}
        </button>
      </div>
    </div>
  );
}
