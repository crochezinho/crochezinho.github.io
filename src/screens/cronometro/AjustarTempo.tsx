import { useState } from 'preact/hooks';
import { deInputLocal, diaCurto, hora, paraInputLocal } from '../../app/datas.ts';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { ajustarTempo, editarSessao, excluirSessao, restaurarSessao } from '../../db/repo.ts';
import type { Sessao } from '../../db/types.ts';
import { duracao, formatarTotal, hmParaMs, totalDoProjeto } from '../../domain/tempo.ts';

const MAX_SESSOES = 15;

export function AjustarTempo(props: Parameters<typeof AjustarTempoAberto>[0]) {
  return props.aberta ? <AjustarTempoAberto {...props} /> : null;
}

function AjustarTempoAberto({
  aberta,
  aoFechar,
  projetoId,
  sessoes,
  agora
}: {
  aberta: boolean;
  aoFechar: () => void;
  projetoId: string;
  sessoes: Sessao[];
  agora: number;
}) {
  const [horas, setHoras] = useState('');
  const [minutos, setMinutos] = useState('');
  const [editando, setEditando] = useState<string | null>(null);

  const doProjeto = sessoes
    .filter((s) => s.projetoId === projetoId)
    .sort((a, b) => b.inicio - a.inicio)
    .slice(0, MAX_SESSOES);

  const quantidade = hmParaMs(Number(horas) || 0, Number(minutos) || 0);
  const total = totalDoProjeto(sessoes, projetoId, agora);
  const tiraDemais = quantidade > total;

  const aplicar = async (sinal: 1 | -1) => {
    const id = await ajustarTempo(projetoId, sinal * quantidade);
    if (!id) return;
    setHoras('');
    setMinutos('');
    toast(`${sinal > 0 ? 'Somado' : 'Tirado'} ${formatarTotal(quantidade)}`, {
      rotulo: 'Desfazer',
      fazer: () => void excluirSessao(id)
    });
  };

  const excluir = async (s: Sessao) => {
    await excluirSessao(s.id);
    setEditando(null);
    toast(s.ajuste ? 'Ajuste removido' : 'Sessão excluída', { rotulo: 'Desfazer', fazer: () => void restaurarSessao(s.id) });
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Ajustar tempo" subtitulo="Some ou tire tempo, ou corrija uma sessão.">
      <div class="ajuste-caixa">
        <div class="ajuste-campos">
          <label class="campo-unidade">
            <input
              class="campo"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={horas}
              onInput={(e) => setHoras(e.currentTarget.value.replace(/\D/g, '').slice(0, 3))}
              aria-label="Horas"
            />
            <span>h</span>
          </label>
          <label class="campo-unidade">
            <input
              class="campo"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="0"
              value={minutos}
              onInput={(e) => setMinutos(e.currentTarget.value.replace(/\D/g, '').slice(0, 3))}
              aria-label="Minutos"
            />
            <span>min</span>
          </label>
        </div>
        <div class="ajuste-botoes">
          <button class="botao" disabled={!quantidade || tiraDemais} onClick={() => void aplicar(-1)}>
            − Tirar
          </button>
          <button class="botao primario" disabled={!quantidade} onClick={() => void aplicar(1)}>
            + Somar
          </button>
        </div>
        {tiraDemais && total > 0 && <p class="texto-apagado">O projeto tem {formatarTotal(total)}: dá para tirar até isso.</p>}
      </div>

      <h3 class="secao-titulo">Sessões</h3>
      {doProjeto.length === 0 && <p class="texto-apagado">Nenhuma sessão ainda.</p>}
      <ul class="lista-sessoes">
        {doProjeto.map((s) =>
          editando === s.id ? (
            <EditarSessao key={s.id} sessao={s} agora={agora} aoFechar={() => setEditando(null)} aoExcluir={() => void excluir(s)} />
          ) : (
            <li key={s.id} class="sessao" onClick={() => setEditando(s.id)} role="button" tabIndex={0}>
              <span class="sessao-dia">{diaCurto(s.inicio)}</span>
              <span class="sessao-horas">
                {s.ajuste
                  ? duracao(s, agora) >= 0
                    ? 'ajuste: somado'
                    : 'ajuste: tirado'
                  : `${hora(s.inicio)} – ${s.fim === null ? 'agora' : hora(s.fim)}`}
                {s.editada && <em> · corrigida</em>}
              </span>
              <span class="sessao-duracao">
                {s.ajuste && duracao(s, agora) < 0 ? '−' : ''}
                {formatarTotal(Math.abs(duracao(s, agora)))}
              </span>
            </li>
          )
        )}
      </ul>
    </Sheet>
  );
}

function EditarSessao({
  sessao,
  agora,
  aoFechar,
  aoExcluir
}: {
  sessao: Sessao;
  agora: number;
  aoFechar: () => void;
  aoExcluir: () => void;
}) {
  const [inicio, setInicio] = useState(paraInputLocal(sessao.inicio));
  const [fim, setFim] = useState(sessao.fim === null ? '' : paraInputLocal(sessao.fim));
  const rodando = sessao.fim === null;

  const ini = deInputLocal(inicio);
  const fi = rodando ? null : deInputLocal(fim);
  const erro =
    ini === null
      ? 'Informe o início.'
      : ini > agora
        ? 'O início não pode ser no futuro.'
        : !rodando && fi === null
          ? 'Informe o fim.'
          : fi !== null && fi <= ini
            ? 'O fim precisa ser depois do início.'
            : fi !== null && fi > agora
              ? 'O fim não pode ser no futuro.'
              : null;

  const salvar = async () => {
    if (erro || ini === null) return;
    await editarSessao(sessao.id, ini, fi);
    toast('Sessão corrigida');
    aoFechar();
  };

  if (sessao.ajuste) {
    return (
      <li class="sessao editando">
        <p class="texto-apagado">Ajuste manual de {formatarTotal(Math.abs(duracao(sessao, agora)))}.</p>
        <div class="ajuste-botoes">
          <button class="botao perigo" onClick={aoExcluir}>
            Remover ajuste
          </button>
          <button class="botao" onClick={aoFechar}>
            Fechar
          </button>
        </div>
      </li>
    );
  }

  return (
    <li class="sessao editando">
      <label class="rotulo">Começou</label>
      <input type="datetime-local" class="campo" value={inicio} onInput={(e) => setInicio(e.currentTarget.value)} />
      {!rodando && (
        <>
          <label class="rotulo">Parou</label>
          <input type="datetime-local" class="campo" value={fim} onInput={(e) => setFim(e.currentTarget.value)} />
        </>
      )}
      {erro && <p class="erro">{erro}</p>}
      <div class="ajuste-botoes">
        <button class="botao perigo" onClick={aoExcluir}>
          Excluir
        </button>
        <button class="botao" onClick={aoFechar}>
          Cancelar
        </button>
        <button class="botao primario" disabled={!!erro} onClick={() => void salvar()}>
          Salvar
        </button>
      </div>
    </li>
  );
}
