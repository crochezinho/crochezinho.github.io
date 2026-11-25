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
import { naFila, paraEstaSemana } from '../../domain/encomendas.ts';
import { divisaoDe, entreguesNoMes, useBaseFinanceira } from '../../app/financeiro.ts';
import { mesDe, nomeDoMes, somar } from '../../domain/financeiro.ts';
import { brl } from '../../domain/preco.ts';
import type { Projeto, Sessao } from '../../db/types.ts';
import type { BaseFinanceira } from '../../db/repo.ts';

export function Inicio() {
  const dados = useDadosCrono();
  const nome = useLive(() => lerConfig('nome', ''));
  const seguranca = useLive(async () => ({
    conectado: !!(await lerConexao()),
    erro: await lerConfig<string | null>(CHAVES_SYNC.erro, null),
    backupEm: await lerConfig<number | null>(CHAVES_SYNC.backupEm, null)
  }));
  const agora = useAgora(!!dados?.aberta);
  const base = useBaseFinanceira();

  if (!dados) return null;
  const { projetos, sessoes, aberta, comTempo } = dados;
  const daVez = projetoDaVez(dados);
  const abertos = ordenarPorPrazo(projetos.filter((p) => p.status === 'fazendo'));
  const emAndamento = abertos.filter((p) => !naFila(p, comTempo));
  const fila = abertos.filter((p) => naFila(p, comTempo));
  const semana = paraEstaSemana(projetos, new Date(agora));
  const daSemana = new Set(semana.map((p) => p.id));
  const foraDaSemana = (p: Projeto) => !daSemana.has(p.id);
  const daVezNaFila = !!daVez && naFila(daVez, comTempo);
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

  const linha = (p: Projeto) => (
    <li key={p.id} class="linha-projeto" onClick={() => ir(href.projeto(p.id))}>
      <Capa class="capa" cor={p.capaCor} fotoId={p.fotoId} />
      <span class="linha-projeto-texto">
        <strong>{p.nome}</strong>
        <small>
          {[p.cliente && `para ${p.cliente}`, p.status === 'fazendo' && !naFila(p, comTempo) && formatarTotal(totalDoProjeto(sessoes, p.id, agora))]
            .filter(Boolean)
            .join(' · ')}
        </small>
        <SeloPrazo entregaEm={p.entregaEm} agora={agora} />
      </span>
      {p.status === 'concluido' ? (
        <span class="chip-status pronta">pronta</span>
      ) : (
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
      )}
    </li>
  );

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
          <p class="sobretitulo">{rodando(daVez.id) ? 'Em andamento' : daVezNaFila ? 'Na fila' : 'Pausado'}</p>
          <h2 class="cartao-crono-nome">{daVez.nome}</h2>
          <p class="cartao-crono-tempo">{formatarTotal(totalDoProjeto(sessoes, daVez.id, agora))}</p>
          {rodando(daVez.id) && aberta && <p class="cartao-crono-sub">esta sessão: {formatarSessao(duracao(aberta, agora))}</p>}
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
          <button class="botao primario" onClick={() => ir(href.novoProjeto)}>
            Novo projeto
          </button>
        </section>
      )}

      <div class={'stats' + (fila.length ? ' stats-3' : '')}>
        <div class="stat">
          <strong>{formatarTotal(totalNoMes(sessoes, agora))}</strong>
          <span>no mês</span>
        </div>
        <div class="stat">
          <strong>{emAndamento.length}</strong>
          <span>em andamento</span>
        </div>
        {fila.length > 0 && (
          <div class="stat">
            <strong>{fila.length}</strong>
            <span>na fila</span>
          </div>
        )}
      </div>

      {semana.length > 0 && (
        <section>
          <h2 class="secao-titulo">Para entregar esta semana</h2>
          <ul class="lista">{semana.map(linha)}</ul>
        </section>
      )}

      {base && <CartaoDoMes projetos={projetos} sessoes={sessoes} base={base} agora={agora} />}

      {emAndamento.some(foraDaSemana) && (
        <section>
          <h2 class="secao-titulo">Em andamento</h2>
          <ul class="lista">{emAndamento.filter(foraDaSemana).map(linha)}</ul>
        </section>
      )}

      {fila.some(foraDaSemana) && (
        <section>
          <h2 class="secao-titulo">Na fila</h2>
          <ul class="lista">{fila.filter(foraDaSemana).map(linha)}</ul>
        </section>
      )}
    </main>
  );
}

/** Aparece depois da primeira entrega: quanto separar de ganhos e de material neste mês. */
function CartaoDoMes({ projetos, sessoes, base, agora }: { projetos: Projeto[]; sessoes: Sessao[]; base: BaseFinanceira; agora: number }) {
  if (!projetos.some((p) => p.entregueEm)) return null;
  const mes = mesDe(agora);
  const r = somar(
    entreguesNoMes(projetos, mes)
      .map((p) => divisaoDe(p, sessoes, base, agora))
      .filter((d) => d.cobrado > 0)
  );
  return (
    <button class="cartao-acao cartao-mes" onClick={() => ir(href.financeiro())}>
      <span class="cartao-acao-icone">
        <Icone nome="dinheiro" />
      </span>
      <span class="linha-projeto-texto">
        {r.entregas > 0 ? (
          <>
            <strong>Ganhos de {nomeDoMes(mes)}: {brl(r.ganhos)}</strong>
            <small>
              {[r.material > 0 && `material ${brl(r.material)}`, r.entregas === 1 ? '1 entrega' : `${r.entregas} entregas`].filter(Boolean).join(' · ')}
            </small>
          </>
        ) : (
          <>
            <strong>Financeiro</strong>
            <small>nenhuma entrega em {nomeDoMes(mes)} ainda</small>
          </>
        )}
      </span>
      <Icone nome="seta" tamanho={18} />
    </button>
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
    if (velho)
      texto = seguranca.backupEm
        ? `Último backup ${haQuanto(seguranca.backupEm, agora)}. Que tal fazer outro?`
        : 'Seus dados só existem neste aparelho. Faça um backup ou ative a sincronização.';
  }
  if (!texto) return null;
  return (
    <button class="lembrete" onClick={() => ir(href.config)}>
      <span>{texto}</span>
      <Icone nome="seta" tamanho={18} />
    </button>
  );
}
