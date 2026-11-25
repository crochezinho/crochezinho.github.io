import { useState } from 'preact/hooks';
import { CampoDinheiro } from '../../components/Campos.tsx';
import { Interruptor } from '../../components/Interruptor.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { salvarVenda, type BaseFinanceira } from '../../db/repo.ts';
import type { Projeto } from '../../db/types.ts';
import { faltaReceber, taxasDaShopee, vendaDe, type Divisao, type Venda } from '../../domain/financeiro.ts';
import { brl } from '../../domain/preco.ts';
import { formatarTotal } from '../../domain/tempo.ts';

function Linha({ rotulo, detalhe, valor, classe }: { rotulo: string; detalhe?: string; valor: string; classe?: string }) {
  return (
    <div class={'linha-campo' + (classe ? ` ${classe}` : '')}>
      <span class="linha-campo-texto">
        <strong>{rotulo}</strong>
        {detalhe && <small>{detalhe}</small>}
      </span>
      <span class="linha-valor">{valor}</span>
    </div>
  );
}

/** Valor combinado de uma encomenda ainda não entregue. */
export function CartaoVenda({ venda, quantidade, regras }: { venda: Venda; quantidade: number; regras: BaseFinanceira['regras'] }) {
  if (venda.canal === 'shopee') {
    const taxas = taxasDaShopee(venda.valorCentavos, quantidade, regras);
    return (
      <div class="cartao-lista">
        <Linha rotulo="Na Shopee" detalhe={quantidade > 1 ? `${quantidade} peças` : undefined} valor={brl(venda.valorCentavos)} />
        <Linha rotulo="Taxas" valor={`− ${brl(taxas)}`} />
        <Linha rotulo="Você recebe" valor={brl(venda.valorCentavos - taxas)} classe="linha-total" />
      </div>
    );
  }
  const falta = faltaReceber(venda);
  return (
    <div class="cartao-lista">
      <Linha rotulo="Combinado" detalhe={quantidade > 1 ? `${quantidade} peças` : undefined} valor={brl(venda.valorCentavos)} />
      {venda.freteCentavos > 0 && <Linha rotulo="Frete" valor={brl(venda.freteCentavos)} />}
      {venda.sinalCentavos > 0 && <Linha rotulo="Sinal recebido" valor={`− ${brl(venda.sinalCentavos)}`} />}
      <Linha rotulo={falta > 0 ? 'Falta receber' : 'Já está tudo pago'} valor={falta > 0 ? brl(falta) : ''} classe="linha-total" />
    </div>
  );
}

/** Para onde foi o dinheiro de uma encomenda entregue. */
export function CartaoDivisao({ d }: { d: Divisao }) {
  return (
    <>
      <div class="cartao-lista">
        <Linha rotulo="Recebido" detalhe={d.taxas ? `${brl(d.cobrado)} menos ${brl(d.taxas)} de taxas da Shopee` : 'sem o frete'} valor={brl(d.recebido)} />
        <Linha rotulo="Material" detalhe="fios e outros custos" valor={brl(d.material)} classe="linha-guardar" />
        <Linha
          rotulo="Salário"
          detalhe={d.minutos > 0 ? `${formatarTotal(d.minutos * 60_000)} × ${brl(d.valorHora)}/h` : 'sem tempo no cronômetro'}
          valor={brl(d.salario)}
          classe="linha-guardar"
        />
        <Linha rotulo="Lucro" valor={brl(d.lucro)} classe={'linha-total' + (d.lucro < 0 ? ' negativo' : '')} />
      </div>
      {d.lucro < 0 && d.horaReal !== null && (
        <p class="nota-divisao">
          Esta encomenda rendeu {brl(Math.max(0, d.horaReal))} por hora, abaixo dos seus {brl(d.valorHora)}. Vale subir o preço da próxima.
        </p>
      )}
    </>
  );
}

type PropsVenda = { aberta: boolean; aoFechar: () => void; projeto: Projeto; regras: BaseFinanceira['regras'] };

export function VendaSheet(props: PropsVenda) {
  return props.aberta ? <VendaAberta {...props} /> : null;
}

function VendaAberta({ aberta, aoFechar, projeto, regras }: PropsVenda) {
  const [v, setV] = useState<Venda>(vendaDe(projeto));
  const mudar = (parte: Partial<Venda>) => setV((a) => ({ ...a, ...parte }));
  const q = Math.max(1, projeto.quantidade ?? 1);
  const calculado = (projeto.precoCentavos ?? 0) * q;
  const shopee = v.canal === 'shopee';
  const taxas = shopee ? taxasDaShopee(v.valorCentavos, q, regras) : 0;

  const salvar = async () => {
    await salvarVenda(projeto.id, v);
    aoFechar();
    toast('Valor anotado');
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Valor da encomenda">
      <label class="rotulo" for="vd-valor">
        {q > 1 ? `Valor das ${q} peças` : 'Valor combinado'}
      </label>
      <CampoDinheiro id="vd-valor" centavos={v.valorCentavos} aoMudar={(c) => mudar({ valorCentavos: c })} rotulo="Valor combinado" />
      {calculado > 0 && calculado !== v.valorCentavos ? (
        <button type="button" class="link-pequeno" onClick={() => mudar({ valorCentavos: calculado })}>
          usar o preço calculado ({brl(calculado)})
        </button>
      ) : (
        !shopee && <p class="dica-campo">Sem o frete.</p>
      )}

      <div class="interruptor-shopee">
        <Interruptor
          ligado={shopee}
          aoMudar={(s) => mudar({ canal: s ? 'shopee' : 'direto' })}
          rotulo="Venda pela Shopee"
          detalhe="As taxas saem do valor. Não tem frete nem sinal."
        />
      </div>

      {!shopee && (
        <div class="grade-2">
          <div>
            <label class="rotulo" for="vd-frete">
              Frete <span class="opcional">opcional</span>
            </label>
            <CampoDinheiro id="vd-frete" centavos={v.freteCentavos} aoMudar={(c) => mudar({ freteCentavos: c })} rotulo="Frete" />
          </div>
          <div>
            <label class="rotulo" for="vd-sinal">
              Sinal recebido <span class="opcional">opcional</span>
            </label>
            <CampoDinheiro id="vd-sinal" centavos={v.sinalCentavos} aoMudar={(c) => mudar({ sinalCentavos: c })} rotulo="Sinal recebido" />
          </div>
        </div>
      )}

      <div class="resumo-hora">
        <span>{shopee ? `Você recebe, depois de ${brl(taxas)} de taxas` : v.freteCentavos > 0 || v.sinalCentavos > 0 ? 'Falta receber, com o frete e sem o sinal' : 'Falta receber'}</span>
        <strong>{shopee ? brl(v.valorCentavos - taxas) : brl(faltaReceber(v))}</strong>
      </div>
      {v.sinalCentavos > 0 && <p class="dica-campo">O sinal não entra no salário agora. A encomenda inteira conta no mês em que for entregue.</p>}

      <button class="botao primario largo" style={{ marginTop: 16 }} onClick={() => void salvar()}>
        Salvar
      </button>
    </Sheet>
  );
}
