import { brl } from '../domain/preco.ts';

export type Formato = 'quadrado' | 'vertical' | 'stories';
export const FORMATOS: Record<Formato, { nome: string; largura: number; altura: number }> = {
  quadrado: { nome: 'Quadrado', largura: 1080, altura: 1080 },
  vertical: { nome: 'Vertical', largura: 1080, altura: 1350 },
  stories: { nome: 'Stories', largura: 1080, altura: 1920 }
};

export type Tema = 'rosa' | 'salvia' | 'lavanda' | 'mel' | 'branco' | 'cacau';
interface Cores {
  nome: string;
  fundo: string;
  cartao: string;
  texto: string;
  texto2: string;
  destaque: string;
  linha: string;
}
export const TEMAS: Record<Tema, Cores> = {
  rosa: { nome: 'Rosa', fundo: '#f8efe8', cartao: '#ffffff', texto: '#43352f', texto2: '#7a6657', destaque: '#a8645c', linha: '#f0e2d6' },
  salvia: { nome: 'Sálvia', fundo: '#edf1e6', cartao: '#ffffff', texto: '#33402a', texto2: '#5f6b55', destaque: '#5f7a45', linha: '#e1e8d8' },
  lavanda: { nome: 'Lavanda', fundo: '#f1ebf4', cartao: '#ffffff', texto: '#3d3344', texto2: '#6c5f74', destaque: '#7c5a8e', linha: '#e8def0' },
  mel: { nome: 'Mel', fundo: '#fbf0dc', cartao: '#ffffff', texto: '#45361f', texto2: '#7a6545', destaque: '#a5762a', linha: '#f2e3c5' },
  branco: { nome: 'Branco', fundo: '#ffffff', cartao: '#f7f2ee', texto: '#2f2724', texto2: '#6f625a', destaque: '#2f2724', linha: '#e9e0d8' },
  cacau: { nome: 'Cacau', fundo: '#3e322a', cartao: '#54453b', texto: '#f4ebe1', texto2: '#cbb9a8', destaque: '#e8b4ad', linha: '#6a584c' }
};

export interface ItemOrcamento {
  nome: string;
  valorCentavos: number;
}

export interface DadosOrcamento {
  titulo: string;
  itens: ItemOrcamento[];
  freteCentavos: number;
  descontoCentavos: number;
  entregaEm: string | null;
  observacoes: string;
  assinatura: string;
  formato: Formato;
  tema: Tema;
  foto: Blob | null;
}

export const somaDosItens = (d: Pick<DadosOrcamento, 'itens'>) => d.itens.reduce((s, i) => s + Math.max(0, i.valorCentavos), 0);
export const totalDoOrcamento = (d: Pick<DadosOrcamento, 'itens' | 'freteCentavos' | 'descontoCentavos'>) =>
  Math.max(0, somaDosItens(d) + d.freteCentavos - d.descontoCentavos);

const TITULO = 'Fredoka, Nunito, sans-serif';
const TEXTO = 'Nunito, sans-serif';
const L = 1080;
const M = 80;
const LARGURA = L - 2 * M;

const fmtEntrega = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' });
export function entregaPorExtenso(data: string): string {
  const [a, m, d] = data.split('-').map(Number);
  return fmtEntrega.format(new Date(a, m - 1, d));
}

async function carregarFontes(): Promise<void> {
  if (!document.fonts) return;
  await Promise.all(['600 80px Fredoka', '500 34px Fredoka', '400 40px Nunito', '700 40px Nunito'].map((f) => document.fonts.load(f).catch(() => [])));
}

async function abrirFoto(blob: Blob | null): Promise<HTMLImageElement | null> {
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

/** Desenha a foto cobrindo o retângulo (corta o que sobra), com cantos arredondados. */
function cobrir(ctx: CanvasRenderingContext2D, foto: HTMLImageElement, x: number, y: number, w: number, h: number, raio: number) {
  const s = Math.max(w / foto.width, h / foto.height);
  const sw = w / s;
  const sh = h / s;
  ctx.save();
  arredondado(ctx, x, y, w, h, raio);
  ctx.clip();
  ctx.drawImage(foto, (foto.width - sw) / 2, (foto.height - sh) / 2, sw, sh, x, y, w, h);
  ctx.restore();
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, maxLinhas: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split('\n')) {
    let atual = '';
    for (const p of paragrafo.split(/\s+/).filter(Boolean)) {
      const tentativa = atual ? `${atual} ${p}` : p;
      if (ctx.measureText(tentativa).width <= largura || !atual) atual = tentativa;
      else {
        linhas.push(atual);
        atual = p;
      }
    }
    linhas.push(atual);
  }
  while (linhas.length && !linhas[linhas.length - 1]) linhas.pop();
  if (linhas.length <= maxLinhas) return linhas;
  const cortadas = linhas.slice(0, maxLinhas);
  let ultima = cortadas[maxLinhas - 1];
  while (ultima && ctx.measureText(`${ultima}…`).width > largura) ultima = ultima.slice(0, -1);
  cortadas[maxLinhas - 1] = `${ultima.trimEnd()}…`;
  return cortadas;
}

function caber(ctx: CanvasRenderingContext2D, texto: string, largura: number): string {
  if (ctx.measureText(texto).width <= largura) return texto;
  let t = texto;
  while (t && ctx.measureText(`${t}…`).width > largura) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

/** O bloco de texto (título, valores, entrega, observações, assinatura), desenhado numa tela própria com a altura exata. */
const MINIATURA = 210;

function blocoDeTexto(d: DadosOrcamento, c: Cores, miniatura: HTMLImageElement | null = null): HTMLCanvasElement {
  const tela = document.createElement('canvas');
  tela.width = LARGURA;
  tela.height = 2400;
  const ctx = tela.getContext('2d')!;
  let y = 0;

  if (d.titulo.trim() || miniatura) {
    const x0 = miniatura ? MINIATURA + 36 : 0;
    ctx.fillStyle = c.texto;
    ctx.font = `600 76px ${TITULO}`;
    const linhas = d.titulo.trim() ? quebrar(ctx, d.titulo.trim(), LARGURA - x0, miniatura ? 3 : 2) : [];
    const alturaTitulo = linhas.length * 80;
    const alturaFaixa = miniatura ? Math.max(MINIATURA, alturaTitulo + 20) : alturaTitulo;
    if (miniatura) cobrir(ctx, miniatura, 0, y, MINIATURA, MINIATURA, 32);
    let yt = y + (alturaFaixa - alturaTitulo) / 2;
    for (const linha of linhas) {
      yt += 80;
      ctx.fillText(linha, x0, yt - 14);
    }
    y += alturaFaixa + 44;
  }

  const itens = d.itens.filter((i) => i.nome.trim() || i.valorCentavos > 0);
  const linhas: [string, string][] = itens.map((i) => [i.nome.trim() || 'Peça', brl(i.valorCentavos)]);
  if (d.freteCentavos > 0) linhas.push(['Frete', brl(d.freteCentavos)]);
  if (d.descontoCentavos > 0) linhas.push(['Desconto', `-${brl(d.descontoCentavos)}`]);
  const soUmValor = linhas.length <= 1;
  const rotuloTotal = soUmValor ? (itens[0]?.nome.trim() ?? '') || 'Valor' : 'Total';

  const pad = 48;
  const alturaLinha = 66;
  const alturaCartao = pad + (soUmValor ? 0 : linhas.length * alturaLinha + 30) + 96 + pad - 16;
  ctx.fillStyle = c.cartao;
  arredondado(ctx, 0, y, LARGURA, alturaCartao, 40);
  ctx.fill();

  const xi = pad;
  const xf = LARGURA - pad;
  let yc = y + pad;
  if (!soUmValor) {
    for (const [rotulo, valor] of linhas) {
      yc += 44;
      ctx.font = `700 38px ${TEXTO}`;
      const larguraValor = ctx.measureText(valor).width;
      ctx.textAlign = 'right';
      ctx.fillStyle = c.texto;
      ctx.fillText(valor, xf, yc);
      ctx.textAlign = 'left';
      ctx.fillStyle = c.texto2;
      ctx.font = `400 38px ${TEXTO}`;
      ctx.fillText(caber(ctx, rotulo, xf - xi - larguraValor - 32), xi, yc);
      yc += alturaLinha - 44;
    }
    yc += 10;
    ctx.fillStyle = c.linha;
    ctx.fillRect(xi, yc, xf - xi, 3);
    yc += 20;
  }
  yc += 72;
  ctx.font = `600 76px ${TITULO}`;
  const totalTexto = brl(totalDoOrcamento(d));
  const larguraTotal = ctx.measureText(totalTexto).width;
  ctx.textAlign = 'right';
  ctx.fillStyle = c.destaque;
  ctx.fillText(totalTexto, xf, yc + 4);
  ctx.textAlign = 'left';
  ctx.fillStyle = c.texto;
  ctx.font = `700 42px ${TEXTO}`;
  ctx.fillText(caber(ctx, rotuloTotal, xf - xi - larguraTotal - 32), xi, yc);
  y += alturaCartao;

  if (d.entregaEm) {
    y += 70;
    ctx.fillStyle = c.texto;
    ctx.font = `700 38px ${TEXTO}`;
    ctx.fillText(`Entrega até ${entregaPorExtenso(d.entregaEm)}`, 0, y);
  }

  if (d.observacoes.trim()) {
    y += d.entregaEm ? 22 : 40;
    ctx.fillStyle = c.texto2;
    ctx.font = `400 34px ${TEXTO}`;
    for (const linha of quebrar(ctx, d.observacoes.trim(), LARGURA, 8)) {
      y += 48;
      ctx.fillText(linha, 0, y);
    }
  }

  if (d.assinatura.trim()) {
    y += 90;
    ctx.fillStyle = c.destaque;
    ctx.font = `500 38px ${TITULO}`;
    ctx.textAlign = 'center';
    ctx.fillText(caber(ctx, d.assinatura.trim(), LARGURA), LARGURA / 2, y);
    ctx.textAlign = 'left';
  }
  y += 14;

  const final = document.createElement('canvas');
  final.width = LARGURA;
  final.height = Math.max(1, Math.ceil(y));
  final.getContext('2d')!.drawImage(tela, 0, 0);
  return final;
}

const FOTO_MINIMA = 300;
const ESPACO_FOTO = 56;

/**
 * Monta a imagem no tamanho do formato escolhido: a foto ocupa o espaço que sobra depois do texto,
 * e o conjunto fica centralizado. Se o texto não couber, ele é reduzido.
 */
export async function desenharOrcamento(d: DadosOrcamento): Promise<Blob> {
  await carregarFontes();
  const c = TEMAS[d.tema] ?? TEMAS.rosa;
  const { largura: W, altura: H } = FORMATOS[d.formato] ?? FORMATOS.vertical;
  const foto = await abrirFoto(d.foto);
  let texto = blocoDeTexto(d, c);

  const tela = document.createElement('canvas');
  tela.width = W;
  tela.height = H;
  const ctx = tela.getContext('2d')!;
  ctx.fillStyle = c.fundo;
  ctx.fillRect(0, 0, W, H);

  const espaco = H - 2 * M;
  const sobra = espaco - texto.height - ESPACO_FOTO;
  const alturaFoto = foto && sobra >= FOTO_MINIMA ? Math.min(sobra, LARGURA * 1.1) : 0;
  // Sem espaço para a foto grande, ela vai pequena ao lado do título.
  if (foto && !alturaFoto) texto = blocoDeTexto(d, c, foto);
  const escala = Math.min(1, espaco / texto.height);
  const alturaTexto = texto.height * escala;
  const total = alturaTexto + (alturaFoto ? alturaFoto + ESPACO_FOTO : 0);
  let y = M + (espaco - total) / 2;

  if (foto && alturaFoto) {
    cobrir(ctx, foto, M, y, LARGURA, alturaFoto, 44);
    y += alturaFoto + ESPACO_FOTO;
  }
  const larguraTexto = LARGURA * escala;
  ctx.drawImage(texto, M + (LARGURA - larguraTexto) / 2, y, larguraTexto, alturaTexto);

  return new Promise((ok, erro) => tela.toBlob((b) => (b ? ok(b) : erro(new Error('Não foi possível gerar a imagem.'))), 'image/png'));
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
  return `${base || 'orcamento'}.png`;
}
