import { contaDasPesagens, estoqueDasPesagens, numeroG } from '../domain/pesagem.ts';
import { formatarEstoque } from '../domain/estoque.ts';
import { CampoInteiro } from './Campos.tsx';
import { DescontoEmbalagem } from './DescontoEmbalagem.tsx';
import { Icone } from './Icone.tsx';

export function totalDasPesagens(pesos: number[], comEmbalagem: boolean, embalagemG: number): number {
  return estoqueDasPesagens(pesos, comEmbalagem ? embalagemG : 0);
}

export function PesagensNovelo({
  tipo,
  gramatura,
  embalagemG,
  pesos,
  aoMudar,
  comEmbalagem,
  aoLigar,
  rotuloTotal = 'Em estoque'
}: {
  tipo: string;
  gramatura: number;
  embalagemG: number;
  pesos: number[];
  aoMudar: (pesos: number[]) => void;
  comEmbalagem: boolean;
  aoLigar: (v: boolean) => void;
  rotuloTotal?: string;
}) {
  const desconta = comEmbalagem && embalagemG > 0;
  const emb = desconta ? embalagemG : 0;
  const total = estoqueDasPesagens(pesos, emb);
  const pesados = pesos.filter((p) => p > 0).length;
  const fechado = gramatura + emb;

  const adicionar = (peso = 0) => {
    aoMudar([...pesos, peso]);
    if (!peso) setTimeout(() => document.getElementById(`pesagem-${pesos.length}`)?.focus(), 30);
  };

  return (
    <div class="pesagens">
      <ul class="pesagens-lista">
        {pesos.map((p, i) => (
          <li key={i}>
            <label class="pesagem-nome" for={`pesagem-${i}`}>
              Novelo {i + 1}
            </label>
            <CampoInteiro
              id={`pesagem-${i}`}
              valor={p}
              aoMudar={(v) => aoMudar(pesos.map((x, j) => (j === i ? v : x)))}
              rotulo={`Peso do novelo ${i + 1}`}
              sufixo="g"
              max={99999}
            />
            {pesos.length > 1 ? (
              <button type="button" class="pesagem-tirar" aria-label={`Tirar o novelo ${i + 1}`} onClick={() => aoMudar(pesos.filter((_, j) => j !== i))}>
                <Icone nome="fechar" tamanho={18} />
              </button>
            ) : (
              <span class="pesagem-tirar" aria-hidden="true" />
            )}
          </li>
        ))}
      </ul>
      <div class="pesagens-acoes">
        <button type="button" class="botao" onClick={() => adicionar()}>
          <Icone nome="mais" tamanho={16} /> Outro novelo
        </button>
        {gramatura > 0 && (
          <button type="button" class="botao" onClick={() => adicionar(fechado)}>
            <Icone nome="mais" tamanho={16} /> Fechado ({numeroG(fechado)} g)
          </button>
        )}
      </div>

      <DescontoEmbalagem tipo={tipo} embalagemG={embalagemG} ligado={comEmbalagem} aoLigar={aoLigar} oQue="de cada novelo" />

      <div class="resumo-fio">
        <span>
          {rotuloTotal}
          {pesados > 0 && desconta && <small class="resumo-conta">{contaDasPesagens(pesos, emb)}</small>}
        </span>
        <strong class="resumo-fio-valor">{formatarEstoque(total)}</strong>
      </div>
    </div>
  );
}
