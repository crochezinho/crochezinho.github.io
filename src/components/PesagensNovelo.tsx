import { contaDasPesagens, estoqueDasPesagens, numeroG, type Pesagens } from '../domain/pesagem.ts';
import { formatarEstoque } from '../domain/estoque.ts';
import { CampoInteiro } from './Campos.tsx';
import { DescontoEmbalagem } from './DescontoEmbalagem.tsx';
import { Icone } from './Icone.tsx';

export function PesagensNovelo({
  tipo,
  gramatura,
  embalagemG,
  pesagens,
  aoMudar,
  comEmbalagem,
  aoLigar
}: {
  tipo: string;
  gramatura: number;
  embalagemG: number;
  pesagens: Pesagens;
  aoMudar: (p: Pesagens) => void;
  comEmbalagem: boolean;
  aoLigar: (v: boolean) => void;
}) {
  const emb = comEmbalagem && embalagemG > 0 ? embalagemG : 0;
  const total = estoqueDasPesagens(pesagens, gramatura, emb);
  const conta = contaDasPesagens(pesagens, gramatura, emb);
  const f = pesagens.fechados;
  const vazio = f === 0 && pesagens.abertos.length === 0;

  const mudarFechados = (n: number) => aoMudar({ ...pesagens, fechados: Math.max(0, Math.min(999, n)) });
  const novoAberto = () => {
    aoMudar({ ...pesagens, abertos: [...pesagens.abertos, null] });
    setTimeout(() => document.getElementById(`pesagem-${pesagens.abertos.length}`)?.focus(), 30);
  };

  return (
    <div class="pesagens">
      <div class="pesagem-grupo">
        <span class="pesagem-nome">
          Fechados
          <small>{gramatura > 0 ? `${f > 1 ? `#1 a #${f} · ` : f === 1 ? '#1 · ' : ''}${numeroG(gramatura)} g cada` : 'informe a gramatura'}</small>
        </span>
        <div class="stepper">
          <button type="button" aria-label="Menos um fechado" disabled={f <= 0} onClick={() => mudarFechados(f - 1)}>
            <Icone nome="menos" tamanho={18} />
          </button>
          <CampoInteiro valor={f} aoMudar={mudarFechados} rotulo="Novelos fechados" sufixo="" max={999} vazioQuandoZero={false} />
          <button type="button" aria-label="Mais um fechado" disabled={gramatura <= 0} onClick={() => mudarFechados(f + 1)}>
            <Icone nome="mais" tamanho={18} />
          </button>
        </div>
      </div>

      <div class="pesagem-grupo">
        <span class="pesagem-nome">
          Abertos
          <small>pese cada um na balança</small>
        </span>
        <button type="button" class="botao pesagem-mais" onClick={novoAberto}>
          <Icone nome="mais" tamanho={16} /> Aberto
        </button>
      </div>

      {pesagens.abertos.length > 0 && (
        <ul class="pesagens-lista">
          {pesagens.abertos.map((g, i) => (
            <li key={i}>
              <label class="pesagem-nome" for={`pesagem-${i}`}>
                #{f + i + 1}
                <small>aberto</small>
              </label>
              <CampoInteiro
                id={`pesagem-${i}`}
                permiteVazio
                valor={g}
                aoMudar={(v) => aoMudar({ ...pesagens, abertos: pesagens.abertos.map((x, j) => (j === i ? v : x)) })}
                rotulo={`Peso do novelo aberto #${f + i + 1} na balança`}
                sufixo="g"
                max={99999}
              />
              <button
                type="button"
                class="pesagem-tirar"
                aria-label={`Tirar o novelo #${f + i + 1}`}
                onClick={() => aoMudar({ ...pesagens, abertos: pesagens.abertos.filter((_, j) => j !== i) })}
              >
                <Icone nome="fechar" tamanho={18} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {pesagens.abertos.length > 0 && (
        <DescontoEmbalagem tipo={tipo} embalagemG={embalagemG} ligado={comEmbalagem} aoLigar={aoLigar} oQue="de cada novelo aberto" />
      )}

      {!vazio && (
        <div class="resumo-fio">
          <span>
            Em estoque
            {conta && <small class="resumo-conta">{conta}</small>}
          </span>
          <strong class="resumo-fio-valor">{formatarEstoque(total)}</strong>
        </div>
      )}
    </div>
  );
}
