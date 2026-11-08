import { useEffect, useState } from 'preact/hooks';

export interface ErroApp {
  mensagem: string;
  detalhe: string;
  quando: number;
}

let ultimo: ErroApp | null = null;
const ouvintes = new Set<(e: ErroApp | null) => void>();

export function reportarErro(erro: unknown, onde = ''): void {
  const e = erro instanceof Error ? erro : new Error(String(erro));
  ultimo = {
    mensagem: (onde ? `${onde}: ` : '') + (e.message || e.name || 'erro desconhecido'),
    detalhe: e.stack ?? '',
    quando: Date.now()
  };
  console.error('[crochezinho]', onde, erro);
  ouvintes.forEach((f) => f(ultimo));
}

export function limparErro(): void {
  ultimo = null;
  ouvintes.forEach((f) => f(null));
}

export function useErro(): ErroApp | null {
  const [e, setE] = useState(ultimo);
  useEffect(() => {
    ouvintes.add(setE);
    return () => void ouvintes.delete(setE);
  }, []);
  return e;
}

export function ultimoErro(): ErroApp | null {
  return ultimo;
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (ev) => reportarErro(ev.error ?? ev.message, 'erro'));
  window.addEventListener('unhandledrejection', (ev) => reportarErro(ev.reason, 'falha'));
}

export async function textoDiagnostico(): Promise<string> {
  const linhas: string[] = [];
  linhas.push(`Crochezinho ${__VERSAO__}`);
  linhas.push(`Navegador: ${navigator.userAgent}`);
  linhas.push(`Instalado: ${window.matchMedia?.('(display-mode: standalone)').matches ? 'sim' : 'não'}`);
  linhas.push(`Online: ${navigator.onLine ? 'sim' : 'não'}`);
  linhas.push(`crypto.randomUUID: ${typeof crypto?.randomUUID === 'function' ? 'sim' : 'não'}`);
  linhas.push(`IndexedDB: ${await testarIndexedDB()}`);
  try {
    const est = await navigator.storage?.estimate?.();
    if (est) linhas.push(`Armazenamento: ${Math.round((est.usage ?? 0) / 1024)} KB usados de ${Math.round((est.quota ?? 0) / 1048576)} MB`);
    linhas.push(`Armazenamento protegido: ${(await navigator.storage?.persisted?.()) ? 'sim' : 'não'}`);
  } catch {
    linhas.push('Armazenamento: indisponível');
  }
  linhas.push(`Service worker: ${navigator.serviceWorker?.controller ? 'ativo' : 'inativo'}`);
  if (ultimo) linhas.push(`Último erro: ${ultimo.mensagem}`, ultimo.detalhe.split('\n').slice(0, 6).join('\n'));
  return linhas.join('\n');
}

function testarIndexedDB(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const nome = 'crochezinho-teste';
      const req = indexedDB.open(nome, 1);
      const limite = setTimeout(() => resolve('não respondeu (bloqueado?)'), 3000);
      req.onupgradeneeded = () => req.result.createObjectStore('t');
      req.onsuccess = () => {
        clearTimeout(limite);
        try {
          const tx = req.result.transaction('t', 'readwrite');
          tx.objectStore('t').put(1, 'k');
          tx.oncomplete = () => {
            req.result.close();
            indexedDB.deleteDatabase(nome);
            resolve('ok (lê e grava)');
          };
          tx.onerror = () => resolve(`erro ao gravar: ${tx.error?.message}`);
        } catch (e) {
          resolve(`erro ao gravar: ${(e as Error).message}`);
        }
      };
      req.onerror = () => {
        clearTimeout(limite);
        resolve(`erro ao abrir: ${req.error?.message}`);
      };
    } catch (e) {
      resolve(`indisponível: ${(e as Error).message}`);
    }
  });
}
