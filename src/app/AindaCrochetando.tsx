import { useState } from 'preact/hooks';
import { Sheet } from '../components/Sheet.tsx';
import { toast } from '../components/toast.tsx';
import { pausar } from '../db/repo.ts';
import { precisaConfirmar } from '../domain/tempo.ts';
import { deInputLocal, hora, paraInputLocal } from './datas.ts';
import { useDadosCrono } from './dados.ts';
import { useAgora } from './hooks.ts';

const CHAVE_SAIU = 'crono.saiuEm';
const CHAVE_CONFIRMOU = 'crono.confirmou';

const ler = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') gravar(CHAVE_SAIU, String(Date.now()));
  });
}

export function AindaCrochetando() {
  const dados = useDadosCrono();
  const aberta = dados?.aberta;
  const agora = useAgora(!!aberta, 30_000);
  const [confirmacao, setConfirmacao] = useState(() => ler(CHAVE_CONFIRMOU));

  const confirmou = (() => {
    const v = confirmacao;
    if (!v || !aberta) return null;
    const [id, ms] = v.split(':');
    return id === aberta.id ? Number(ms) : null;
  })();
  const mostrar = !!aberta && precisaConfirmar(aberta.inicio, confirmou, agora);

  if (!mostrar || !aberta || !dados) return null;
  const projeto = dados.projetos.find((p) => p.id === aberta.projetoId);

  const sim = () => {
    const v = `${aberta.id}:${Date.now()}`;
    gravar(CHAVE_CONFIRMOU, v);
    setConfirmacao(v);
  };

  return <Pergunta key={aberta.id} aberta={aberta} nomeProjeto={projeto?.nome} agora={agora} aoConfirmar={sim} />;
}

function Pergunta({
  aberta,
  nomeProjeto,
  agora,
  aoConfirmar: sim
}: {
  aberta: { inicio: number };
  nomeProjeto: string | undefined;
  agora: number;
  aoConfirmar: () => void;
}) {
  const [parou, setParou] = useState(() => {
    const saiu = Number(ler(CHAVE_SAIU));
    return paraInputLocal(saiu && saiu > aberta.inicio && saiu < agora ? saiu : agora);
  });
  const fim = deInputLocal(parou);
  const fimValido = fim !== null && fim > aberta.inicio && fim <= agora;
  const nao = async () => {
    if (!fimValido) return;
    await pausar(fim);
    toast(`Sessão encerrada às ${hora(fim)}`);
  };

  return (
    <Sheet aberta aoFechar={sim} titulo="Você ainda estava crochetando?" subtitulo={`O cronômetro de ${nomeProjeto ?? 'um projeto'} está rodando desde ${hora(aberta.inicio)}.`}>
      <button class="botao primario largo" onClick={sim}>
        Sim, continuar contando
      </button>
      <div class="caixa-parou">
        <label class="rotulo" for="parou-em">
          Não, parei em:
        </label>
        <input id="parou-em" type="datetime-local" class="campo" value={parou} onInput={(e) => setParou(e.currentTarget.value)} />
        {!fimValido && <p class="erro">Escolha um horário entre o início e agora.</p>}
        <button class="botao largo" disabled={!fimValido} onClick={() => void nao()}>
          Encerrar nesse horário
        </button>
      </div>
    </Sheet>
  );
}
