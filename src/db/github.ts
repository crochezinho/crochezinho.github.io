import { base64ParaTexto, textoParaBase64, validarPacote, type Pacote } from '../domain/sync.ts';

export interface ConexaoGitHub {
  repo: string;
  token: string;
}

export const ARQUIVO = 'dados.json';
const API = 'https://api.github.com';

export class ErroGitHub extends Error {
  constructor(
    mensagem: string,
    readonly status: number
  ) {
    super(mensagem);
  }
}

const cabecalhos = (token: string): HeadersInit => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
});

export function normalizarRepo(texto: string): string | null {
  const limpo = texto
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  return /^[\w.-]+\/[\w.-]+$/.test(limpo) ? limpo : null;
}

export const LIMITE_MS = 20_000;

async function chamar(c: ConexaoGitHub, caminho: string, init: RequestInit = {}): Promise<Response> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), LIMITE_MS);
  let resp: Response;
  try {
    resp = await fetch(`${API}/repos/${c.repo}${caminho}`, {
      ...init,
      headers: { ...cabecalhos(c.token), ...(init.headers ?? {}) },
      cache: 'no-store',
      signal: controle.signal
    });
  } catch {
    if (controle.signal.aborted) throw new ErroGitHub('O GitHub não respondeu a tempo. Confira a internet (Wi-Fi ou dados) e tente de novo.', 0);
    throw new ErroGitHub('Sem conexão com a internet.', 0);
  } finally {
    clearTimeout(relogio);
  }
  if (resp.status === 401) throw new ErroGitHub('Token inválido ou expirado. Gere um novo e conecte de novo.', 401);
  if (resp.status === 403)
    throw new ErroGitHub('O token não tem permissão neste repositório. Confira se ele dá acesso a este repositório com "Contents: Read and write".', 403);
  return resp;
}

export async function testarConexao(c: ConexaoGitHub): Promise<{ privado: boolean }> {
  const resp = await chamar(c, '');
  if (resp.status === 404) throw new ErroGitHub('Repositório não encontrado, ou o token não tem acesso a ele.', 404);
  if (!resp.ok) throw new ErroGitHub(`O GitHub respondeu com erro ${resp.status}.`, resp.status);
  const dados = (await resp.json()) as { private?: boolean };
  return { privado: !!dados.private };
}

export async function lerRemoto(c: ConexaoGitHub): Promise<{ pacote: Pacote | null; sha: string | null }> {
  const resp = await chamar(c, `/contents/${ARQUIVO}`);
  if (resp.status === 404) {
    await testarConexao(c);
    return { pacote: null, sha: null };
  }
  if (!resp.ok) throw new ErroGitHub(`O GitHub respondeu com erro ${resp.status}.`, resp.status);
  const dados = (await resp.json()) as { content?: string; sha: string };
  let conteudo = dados.content;
  if (!conteudo) {
    const blob = await chamar(c, `/git/blobs/${dados.sha}`);
    if (!blob.ok) throw new ErroGitHub(`O GitHub respondeu com erro ${blob.status}.`, blob.status);
    conteudo = ((await blob.json()) as { content?: string }).content;
    if (!conteudo) throw new ErroGitHub('O arquivo de dados ficou grande demais para a sincronização.', 413);
  }
  return { pacote: validarPacote(JSON.parse(base64ParaTexto(conteudo))), sha: dados.sha };
}

export async function gravarRemoto(c: ConexaoGitHub, pacote: Pacote, sha: string | null, aparelho: string): Promise<void> {
  const corpo = {
    message: `Sincronização (${aparelho})`,
    content: textoParaBase64(JSON.stringify(pacote)),
    ...(sha ? { sha } : {})
  };
  const resp = await chamar(c, `/contents/${ARQUIVO}`, { method: 'PUT', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json' } });
  if (resp.status === 409 || resp.status === 422) throw new ErroGitHub('Os dados mudaram em outro aparelho durante a sincronização.', 409);
  if (!resp.ok) throw new ErroGitHub(`O GitHub respondeu com erro ${resp.status}.`, resp.status);
}

const caminhoFoto = (id: string) => `/contents/fotos/${encodeURIComponent(id)}.jpg`;

async function blobParaBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function enviarFoto(c: ConexaoGitHub, id: string, blob: Blob, aparelho: string): Promise<void> {
  const corpo = { message: `Foto (${aparelho})`, content: await blobParaBase64(blob) };
  const resp = await chamar(c, caminhoFoto(id), { method: 'PUT', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json' } });
  if (resp.status === 422 || resp.status === 409) return;
  if (!resp.ok) throw new ErroGitHub(`O GitHub respondeu com erro ${resp.status} ao enviar uma foto.`, resp.status);
}

export async function baixarFoto(c: ConexaoGitHub, id: string): Promise<Blob | null> {
  const resp = await chamar(c, caminhoFoto(id), { headers: { Accept: 'application/vnd.github.raw' } });
  if (resp.status === 404) return null;
  if (!resp.ok) throw new ErroGitHub(`O GitHub respondeu com erro ${resp.status} ao baixar uma foto.`, resp.status);
  const b = await resp.blob();
  return b.type === 'image/jpeg' ? b : new Blob([b], { type: 'image/jpeg' });
}
