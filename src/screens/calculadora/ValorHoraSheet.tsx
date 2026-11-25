import { useState } from 'preact/hooks';
import { CampoDecimal, CampoDinheiro } from '../../components/Campos.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { useLive } from '../../db/hooks.ts';
import { lerConfig, salvarConfig } from '../../db/repo.ts';
import type { Sessao } from '../../db/types.ts';
import { brl } from '../../domain/preco.ts';
import { horasNoMes, mediaSemanal, valorPorHora, type EntradaValorHora } from '../../domain/valorHora.ts';

export const CHAVE_CONTA_HORA = 'valorHora.conta';
const CONTA_PADRAO: EntradaValorHora = { ganhoCentavos: 0, custosCentavos: 0, horasSemana: 0 };

const horasTexto = (h: number) => h.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

type Props = { aberta: boolean; aoFechar: () => void; sessoes: Sessao[]; agora: number; aoUsar: (centavos: number) => void };

export function ValorHoraSheet(props: Props) {
  const salvo = useLive(() => lerConfig<EntradaValorHora | null>(CHAVE_CONTA_HORA, null));
  if (!props.aberta || salvo === undefined) return null;
  return <ValorHoraAberta {...props} inicial={{ ...CONTA_PADRAO, ...(salvo ?? {}) }} />;
}

function ValorHoraAberta({ aberta, aoFechar, sessoes, agora, aoUsar, inicial }: Props & { inicial: EntradaValorHora }) {
  const [e, setE] = useState(inicial);
  const mudar = (parte: Partial<EntradaValorHora>) => setE((a) => ({ ...a, ...parte }));
  const media = Math.round(mediaSemanal(sessoes, agora) * 2) / 2;
  const valor = valorPorHora(e);
  const horasMes = horasNoMes(e.horasSemana);

  const usar = () => {
    if (!valor) return;
    void salvarConfig(CHAVE_CONTA_HORA, e);
    aoUsar(valor);
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Meu valor por hora">
      <label class="rotulo" for="vh-ganho">
        Quanto você quer tirar por mês
      </label>
      <CampoDinheiro id="vh-ganho" centavos={e.ganhoCentavos} aoMudar={(v) => mudar({ ganhoCentavos: v })} rotulo="Quanto você quer tirar por mês" />

      <label class="rotulo" for="vh-custos">
        Contas fixas do mês <span class="opcional">opcional</span>
      </label>
      <CampoDinheiro id="vh-custos" centavos={e.custosCentavos} aoMudar={(v) => mudar({ custosCentavos: v })} rotulo="Contas fixas do mês" />

      <label class="rotulo" for="vh-horas">
        Horas de crochê por semana
      </label>
      <CampoDecimal id="vh-horas" valor={e.horasSemana} aoMudar={(v) => mudar({ horasSemana: v })} rotulo="Horas de crochê por semana" sufixo="h" />
      {media > 0 && media !== e.horasSemana && (
        <button type="button" class="link-pequeno" onClick={() => mudar({ horasSemana: media })}>
          usar a média do cronômetro ({horasTexto(media)} h por semana)
        </button>
      )}

      <div class="resumo-hora">
        <span>
          {valor
            ? `${brl(e.ganhoCentavos + e.custosCentavos)} por mês ÷ ${horasTexto(horasMes)} h de crochê`
            : ''}
        </span>
        <strong>{valor ? `${brl(valor)}/h` : '—'}</strong>
      </div>

      <button class="botao primario largo" disabled={!valor} onClick={usar}>
        {valor ? `Usar ${brl(valor)} por hora` : 'Usar este valor'}
      </button>
    </Sheet>
  );
}
