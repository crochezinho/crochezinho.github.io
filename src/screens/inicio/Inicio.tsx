import { useDadosCrono, projetoDaVez } from '../../app/dados.ts';
import { Capa } from '../../components/Capa.tsx';
import { diaMes, haQuanto } from '../../app/datas.ts';
import { useAgora } from '../../app/hooks.ts';
import { href, ir } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { SeloPrazo } from '../../components/SeloPrazo.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { iniciar, lerConfig, pausar } from '../../db/repo.ts';
import { CHAVES_SYNC, lerConexao } from '../../db/sync.ts';
import { duracao, formatarSessao, formatarTotal, totalDoProjeto, totalNoMes } from '../../domain/tempo.ts';
import { ordenarPorPrazo } from '../../domain/prazo.ts';

export function Inicio() {
  const dados = useDadosCrono();
  const nome = useLive(() => lerConfig('nome', ''));
  const seguranca = useLive(async () => ({
    conectado: !!(await lerConexao()),
    erro: await lerConfig<string | null>(CHAVES_SYNC.erro, null),
    backupEm: await lerConfig<number | null>(CHAVES_SYNC.backupEm, null)
  }));
  const agora = useAgora(!!dados?.aberta);

  if (!dados) return null;
  const { projetos, sessoes, aberta } = dados;
  const daVez = projetoDaVez(dados);
  const emAndamento = ordenarPorPrazo(projetos.filter((p) => p.status === 'fazendo'));
  const rodando = (id: string) => aberta?.projetoId === id;

  const alternar = async (id: string) => {
    if (rodando(id)) {
      await pausar();
      return;
    }
    const anterior = aberta && projetos.find((p) => p.id === aberta.projetoId);
    await iniciar(id);
    if (anterior) toast(`${anterior.nome} pausado`);
  };

  return (
    <main class="tela anim-tela">
      <header class="cabecalho-inicio">
        <div>
          <p class="data">{diaMes(agora)}</p>
          <h1 class="titulo-grande">{nome ? `Oi, ${nome}` : 'Oi!'}</h1>
        </div>
        <button class="botao-voltar" aria-label="Configurações" onClick={() => ir(href.config)}>
          <Icone nome="engrenagem" />
        </button>
      </header>

      <Lembrete seguranca={seguranca} temDados={projetos.length > 0} agora={agora} />

      {daVez ? (
        <section class="cartao-crono" onClick={() => ir(href.crono(daVez.id))} role="button" tabIndex={0}>
          <p class="sobretitulo">{rodando(daVez.id) ? 'Em andamento' : 'Pausado'}</p>
          <h2 class="cartao-crono-nome">{daVez.nome}</h2>
          <p class="cartao-crono-tempo">{formatarTotal(totalDoProjeto(sessoes, daVez.id, agora))}</p>
          <p class="cartao-crono-sub">
            {rodando(daVez.id) && aberta ? `esta sessão: ${formatarSessao(duracao(aberta, agora))}` : 'toque no ▶ para continuar'}
          </p>
          <button
            class="cartao-crono-botao"
            aria-label={rodando(daVez.id) ? 'Pausar' : 'Continuar'}
            onClick={(e) => {
              e.stopPropagation();
              void alternar(daVez.id);
            }}
          >
            <Icone nome={rodando(daVez.id) ? 'pause' : 'play'} tamanho={24} />
          </button>
        </section>
      ) : (
        <section class="cartao-vazio">
          <h2>Comece um projeto</h2>
          <p>Crie um projeto para cronometrar o tempo de crochê.</p>
          <button class="botao primario" onClick={() => ir(href.novoProjeto)}>
            Novo projeto
          </button>
        </section>
      )}

      <div class="stats">
        <div class="stat">
          <strong>{formatarTotal(totalNoMes(sessoes, agora))}</strong>
          <span>no mês</span>
        </div>
        <div class="stat">
          <strong>{emAndamento.length}</strong>
          <span>em andamento</span>
        </div>
      </div>

      {emAndamento.length > 0 && (
        <section>
          <h2 class="secao-titulo">Em andamento</h2>
          <ul class="lista">
            {emAndamento.map((p) => (
              <li key={p.id} class="linha-projeto" onClick={() => ir(href.projeto(p.id))}>
                <Capa class="capa" cor={p.capaCor} fotoId={p.fotoId} />
                <span class="linha-projeto-texto">
                  <strong>{p.nome}</strong>
                  <small>{[p.cliente && `para ${p.cliente}`, formatarTotal(totalDoProjeto(sessoes, p.id, agora))].filter(Boolean).join(' · ')}</small>
                  <SeloPrazo entregaEm={p.entregaEm} agora={agora} />
                </span>
                <button
                  class={'botao-redondo' + (rodando(p.id) ? ' rodando' : '')}
                  aria-label={rodando(p.id) ? `Pausar ${p.nome}` : `Começar ${p.nome}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    void alternar(p.id);
                  }}
                >
                  <Icone nome={rodando(p.id) ? 'pause' : 'play'} tamanho={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

const DIAS_SEM_BACKUP = 14;

function Lembrete({
  seguranca,
  temDados,
  agora
}: {
  seguranca: { conectado: boolean; erro: string | null; backupEm: number | null } | undefined;
  temDados: boolean;
  agora: number;
}) {
  if (!seguranca || !temDados) return null;
  let texto: string | null = null;
  if (seguranca.conectado && seguranca.erro) texto = `Não foi possível sincronizar: ${seguranca.erro}`;
  else if (!seguranca.conectado) {
    const velho = !seguranca.backupEm || agora - seguranca.backupEm > DIAS_SEM_BACKUP * 86_400_000;
    if (velho) texto = seguranca.backupEm ? `Último backup ${haQuanto(seguranca.backupEm, agora)}. Que tal fazer outro?` : 'Seus dados só existem neste aparelho. Faça um backup ou ative a sincronização.';
  }
  if (!texto) return null;
  return (
    <button class="lembrete" onClick={() => ir(href.config)}>
      <span>{texto}</span>
      <Icone nome="seta" tamanho={18} />
    </button>
  );
}
