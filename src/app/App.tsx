import { BottomNav } from '../components/BottomNav.tsx';
import { ErroNaTela } from '../components/ErroNaTela.tsx';
import { Toast } from '../components/toast.tsx';
import { Calculadora } from '../screens/calculadora/Calculadora.tsx';
import { Configuracoes } from '../screens/config/Configuracoes.tsx';
import { Cronometro } from '../screens/cronometro/Cronometro.tsx';
import { Inicio } from '../screens/inicio/Inicio.tsx';
import { NoveloDetalhe } from '../screens/novelos/NoveloDetalhe.tsx';
import { NoveloForm } from '../screens/novelos/NoveloForm.tsx';
import { Novelos } from '../screens/novelos/Novelos.tsx';
import { ProjetoDetalhe } from '../screens/projetos/ProjetoDetalhe.tsx';
import { ProjetoForm } from '../screens/projetos/ProjetoForm.tsx';
import { Projetos } from '../screens/projetos/Projetos.tsx';
import { AindaCrochetando } from './AindaCrochetando.tsx';
import { SyncAutomatico } from './SyncAutomatico.tsx';
import { ABAS, useRota, type Aba } from './router.ts';

export function App() {
  const rota = useRota();
  const escuro = rota.nome === 'crono';

  return (
    <div class={'app' + (escuro ? ' app-escuro' : '')}>
      {rota.nome === 'inicio' && <Inicio />}
      {rota.nome === 'projetos' && <Projetos />}
      {rota.nome === 'projeto' && <ProjetoDetalhe key={rota.id} id={rota.id} />}
      {rota.nome === 'projetoForm' && <ProjetoForm key={rota.id ?? 'novo'} id={rota.id} />}
      {rota.nome === 'novelos' && <Novelos />}
      {rota.nome === 'novelo' && <NoveloDetalhe key={rota.id} id={rota.id} />}
      {rota.nome === 'noveloForm' && <NoveloForm key={rota.id ?? 'novo'} id={rota.id} />}
      {rota.nome === 'calcular' && <Calculadora projetoIdRota={rota.projetoId} />}
      {rota.nome === 'crono' && <Cronometro key={rota.projetoId ?? ''} projetoId={rota.projetoId} />}
      {rota.nome === 'config' && <Configuracoes />}

      {(ABAS as readonly string[]).includes(rota.nome) && <BottomNav atual={rota.nome as Aba} />}
      <AindaCrochetando />
      <SyncAutomatico />
      <ErroNaTela />
      <Toast />
    </div>
  );
}
