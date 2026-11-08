const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function buscarProjetos<T extends { nome: string; cliente?: string; tipo: string }>(projetos: T[], busca: string): T[] {
  const termos = semAcento(busca).split(/\s+/).filter(Boolean);
  if (!termos.length) return projetos;
  return projetos.filter((p) => {
    const alvo = semAcento(`${p.nome} ${p.cliente ?? ''} ${p.tipo}`);
    return termos.every((t) => alvo.includes(t));
  });
}

export const BUSCA_A_PARTIR_DE = 6;
