export function lerLink(texto: string): string {
  const t = texto.trim();
  if (!t) return '';
  const achado = t.match(/https?:\/\/\S+/i)?.[0] ?? (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t) ? `https://${t}` : '');
  if (!achado) return '';
  try {
    const u = new URL(achado.replace(/[),.;]+$/, ''));
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : '';
  } catch {
    return '';
  }
}

export function origemDoLink(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host === 'drive.google.com' || host === 'docs.google.com') return 'Google Drive';
    return host;
  } catch {
    return 'Link';
  }
}
