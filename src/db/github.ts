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

async function chamar(c: ConexaoGitHub, caminho: string, init: RequestInit = {}): Promise<Response> {
  let resp: Response;
  try {
    resp = await fetch(`${API}/repos/${c.repo}${caminho}`, { ...init, headers: { ...cabecalhos(c.token), ...(init.headers ?? {}) }, cache: 'no-store' });
  } catch {
    throw new ErroGitHub('Sem conexão com a internet.', 0);
  }
  if (resp.status === 401) throw new ErroGitHub('Token inválido ou expirado. Gere um novo e conecte de novo.', 401);
  if (resp.status === 403) throw new ErroGitHub('O token não tem permissão de escrita neste repositório (Contents: Read and write).', 403);
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
  if (!dados.content) throw new ErroGitHub('O arquivo de dados ficou grande demais para a sincronização.', 413);
  return { pacote: validarPacote(JSON.parse(base64ParaTexto(dados.content))), sha: dados.sha };
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
