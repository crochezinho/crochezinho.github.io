import { obterFoto } from '../db/sync.ts';
import { brl } from '../domain/preco.ts';

export interface DadosOrcamento {
  titulo: string;
  quantidade: number;
  valorCentavos: number;
  freteCentavos: number;
  entregaEm: string | null;
  assinatura: string;
  fotoId: string | null;
}

const COR = {
  fundo: '#f8efe8',
  cartao: '#ffffff',
  texto: '#43352f',
  texto2: '#7a6657',
  rosa: '#a8645c',
  linha: '#f0e2d6'
};
const TITULO = 'Fredoka, Nunito, sans-serif';
const TEXTO = 'Nunito, sans-serif';

const L = 1080;
const M = 72;

const fmtEntrega = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
export function entregaPorExtenso(data: string): string {
  const [a, m, d] = data.split('-').map(Number);
  return fmtEntrega.format(new Date(a, m - 1, d));
}

async function carregarFontes(): Promise<void> {
  if (!document.fonts) return;
  await Promise.all(
    [`600 80px Fredoka`, `500 34px Fredoka`, `400 40px Nunito`, `700 40px Nunito`, `800 30px Nunito`].map((f) => document.fonts.load(f).catch(() => []))
  );
}

async function carregarFoto(id: string | null): Promise<ImageBitmap | HTMLImageElement | null> {
  if (!id) return null;
  const blob = await obterFoto(id).catch(() => null);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    return null;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function arredondado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, maxLinhas: number): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const tentativa = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(tentativa).width <= largura || !atual) atual = tentativa;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  if (linhas.length > maxLinhas) {
    const cortadas = linhas.slice(0, maxLinhas);
    let ultima = cortadas[maxLinhas - 1];
    while (ultima && ctx.measureText(`${ultima}…`).width > largura) ultima = ultima.slice(0, -1);
    cortadas[maxLinhas - 1] = `${ultima.trimEnd()}…`;
    return cortadas;
  }
  return linhas;
}

/** Desenha numa tela alta e depois recorta na altura que o conteúdo ocupou. */
export async function desenharOrcamento(d: DadosOrcamento): Promise<Blob> {
  await carregarFontes();
  const foto = await carregarFoto(d.fotoId);
  const rascunho = document.createElement('canvas');
  rascunho.width = L;
  rascunho.height = 2600;
  const ctx = rascunho.getContext('2d')!;
  ctx.fillStyle = COR.fundo;
  ctx.fillRect(0, 0, L, rascunho.height);
  ctx.textBaseline = 'alphabetic';
  const largura = L - 2 * M;
  let y = M;

  if (foto) {
    const h = Math.round((largura * 3) / 4);
    const w0 = foto.width;
    const h0 = foto.height;
    const escala = Math.max(largura / w0, h / h0);
    const sw = largura / escala;
    const sh = h / escala;
    ctx.save();
    arredondado(ctx, M, y, largura, h, 44);
    ctx.clip();
    ctx.drawImage(foto, (w0 - sw) / 2, (h0 - sh) / 2, sw, sh, M, y, largura, h);
    ctx.restore();
    y += h + 64;
  } else {
    y += 24;
  }

  ctx.fillStyle = COR.rosa;
  ctx.font = `800 30px ${TEXTO}`;
  ctx.letterSpacing = '4px';
  ctx.fillText('ORÇAMENTO', M, y + 30);
  ctx.letterSpacing = '0px';
  y += 30 + 30;

  ctx.fillStyle = COR.texto;
  ctx.font = `600 80px ${TITULO}`;
  for (const linha of quebrar(ctx, d.titulo.trim() || 'Peça de crochê', largura, 2)) {
    y += 84;
    ctx.fillText(linha, M, y);
  }
  y += 56;

  const q = Math.max(1, d.quantidade);
  const nomeDoValor = q > 1 ? `${q} peças` : 'Peça';
  // Sem frete, o total é o próprio valor: uma linha só, para não repetir o número.
  const linhas: [string, number][] = d.freteCentavos > 0 ? [[nomeDoValor, d.valorCentavos], ['Frete', d.freteCentavos]] : [];
  const total = d.valorCentavos + d.freteCentavos;
  const pad = 52;
  const alturaLinha = 72;
  const alturaCartao = pad + linhas.length * alturaLinha + (linhas.length ? 36 : 0) + 110 + pad - 20;

  ctx.save();
  ctx.shadowColor = 'rgba(150, 110, 100, 0.18)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = COR.cartao;
  arredondado(ctx, M, y, largura, alturaCartao, 44);
  ctx.fill();
  ctx.restore();

  const xi = M + pad;
  const xf = M + largura - pad;
  let yc = y + pad;
  for (const [rotulo, valor] of linhas) {
    yc += 48;
    ctx.textAlign = 'left';
    ctx.fillStyle = COR.texto2;
    ctx.font = `400 40px ${TEXTO}`;
    ctx.fillText(rotulo, xi, yc);
    ctx.textAlign = 'right';
    ctx.fillStyle = COR.texto;
    ctx.font = `700 40px ${TEXTO}`;
    ctx.fillText(brl(valor), xf, yc);
    yc += alturaLinha - 48;
  }
  if (linhas.length) {
    yc += 12;
    ctx.fillStyle = COR.linha;
    ctx.fillRect(xi, yc, xf - xi, 3);
    yc += 24;
  }
  yc += 76;
  ctx.textAlign = 'left';
  ctx.fillStyle = COR.texto;
  ctx.font = `700 44px ${TEXTO}`;
  ctx.fillText(linhas.length ? 'Total' : nomeDoValor === 'Peça' ? 'Valor' : nomeDoValor, xi, yc);
  ctx.textAlign = 'right';
  ctx.fillStyle = COR.rosa;
  ctx.font = `600 80px ${TITULO}`;
  ctx.fillText(brl(total), xf, yc + 4);
  ctx.textAlign = 'left';
  y += alturaCartao;

  if (d.entregaEm) {
    y += 76;
    ctx.fillStyle = COR.texto;
    ctx.font = `700 40px ${TEXTO}`;
    ctx.fillText(`Entrega até ${entregaPorExtenso(d.entregaEm)}`, M, y);
  }

  if (d.assinatura.trim()) {
    y += 104;
    ctx.fillStyle = COR.rosa;
    ctx.font = `500 38px ${TITULO}`;
    ctx.textAlign = 'center';
    ctx.fillText(quebrar(ctx, d.assinatura.trim(), largura, 1)[0], L / 2, y);
    ctx.textAlign = 'left';
  }
  y += M;

  const final = document.createElement('canvas');
  final.width = L;
  final.height = Math.max(y, 800);
  const fctx = final.getContext('2d')!;
  fctx.fillStyle = COR.fundo;
  fctx.fillRect(0, 0, L, final.height);
  fctx.drawImage(rascunho, 0, 0);
  return new Promise((ok, erro) => final.toBlob((b) => (b ? ok(b) : erro(new Error('Não foi possível gerar a imagem.'))), 'image/png'));
}

export type ResultadoEnvio = 'compartilhou' | 'baixou' | 'cancelou';

/** Abre a folha de compartilhar do celular; onde não existe (computador), baixa o arquivo. */
export async function compartilharImagem(blob: Blob, nomeArquivo: string): Promise<ResultadoEnvio> {
  const arquivo = new File([blob], nomeArquivo, { type: 'image/png' });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo] });
      return 'compartilhou';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelou';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'baixou';
}

export function nomeDoArquivo(titulo: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `orcamento-${base || 'croche'}.png`;
}
