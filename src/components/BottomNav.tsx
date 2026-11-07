import { href, ir, type Aba } from '../app/router.ts';
import { Icone, type NomeIcone } from './Icone.tsx';

const abas: { nome: Aba; rotulo: string; icone: NomeIcone; destino: string }[] = [
  { nome: 'inicio', rotulo: 'Início', icone: 'inicio', destino: href.inicio },
  { nome: 'projetos', rotulo: 'Projetos', icone: 'projetos', destino: href.projetos },
  { nome: 'novelos', rotulo: 'Novelos', icone: 'novelos', destino: href.novelos },
  { nome: 'calcular', rotulo: 'Calcular', icone: 'calcular', destino: href.calcular }
];

export function BottomNav({ atual }: { atual: Aba }) {
  return (
    <nav class="nav">
      {abas.map((a) => (
        <button
          key={a.nome}
          class={'nav-item' + (a.nome === atual ? ' ativo' : '')}
          aria-current={a.nome === atual ? 'page' : undefined}
          onClick={() => a.nome !== atual && ir(a.destino, true)}
        >
          <Icone nome={a.icone} espessura={a.nome === atual ? 2.2 : 1.7} />
          <span>{a.rotulo}</span>
        </button>
      ))}
    </nav>
  );
}
