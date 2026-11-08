import { useEffect, useRef, useState } from 'preact/hooks';
import { centavosParaTexto, textoParaCentavos } from '../domain/preco.ts';

export function CampoDinheiro({
  centavos,
  aoMudar,
  rotulo,
  id,
  compacto = false
}: {
  centavos: number;
  aoMudar: (c: number) => void;
  rotulo: string;
  id?: string;
  compacto?: boolean;
}) {
  const [texto, setTexto] = useState(centavos ? centavosParaTexto(centavos) : '');
  const focado = useRef(false);

  useEffect(() => {
    if (!focado.current) setTexto(centavos ? centavosParaTexto(centavos) : '');
  }, [centavos]);

  return (
    <label class={'campo-unidade prefixo' + (compacto ? ' compacto' : '')}>
      <span class="prefixo-texto">R$</span>
      <input
        id={id}
        class="campo"
        inputMode="decimal"
        placeholder="0,00"
        aria-label={rotulo}
        value={texto}
        onFocus={() => (focado.current = true)}
        onBlur={() => {
          focado.current = false;
          setTexto(centavos ? centavosParaTexto(centavos) : '');
        }}
        onInput={(e) => {
          const v = e.currentTarget.value.replace(/[^\d,.]/g, '');
          setTexto(v);
          aoMudar(textoParaCentavos(v));
        }}
      />
    </label>
  );
}

export function CampoInteiro({
  valor,
  aoMudar,
  rotulo,
  sufixo,
  max = 99999,
  id,
  vazioQuandoZero = true,
  minimo
}: {
  valor: number;
  aoMudar: (n: number) => void;
  rotulo: string;
  sufixo: string;
  max?: number;
  id?: string;
  vazioQuandoZero?: boolean;
  minimo?: number;
}) {
  const mostrarVazio = minimo !== undefined ? !valor : !valor && vazioQuandoZero;
  return (
    <label class="campo-unidade">
      <input
        id={id}
        class="campo"
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="0"
        aria-label={rotulo}
        value={mostrarVazio ? '' : String(valor)}
        onBlur={() => {
          if (minimo !== undefined && valor < minimo) aoMudar(minimo);
        }}
        onInput={(e) => {
          const digitos = e.currentTarget.value.replace(/\D/g, '').slice(0, 6);
          const n = Math.min(max, Number(digitos) || 0);
          e.currentTarget.value = digitos ? String(n) : '';
          aoMudar(n);
        }}
      />
      <span>{sufixo}</span>
    </label>
  );
}

export function lerDecimal(texto: string): number {
  const n = Number(texto.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function CampoDecimal({
  valor,
  aoMudar,
  rotulo,
  sufixo,
  id
}: {
  valor: number;
  aoMudar: (n: number) => void;
  rotulo: string;
  sufixo: string;
  id?: string;
}) {
  const formatar = (v: number) => (v ? String(v).replace('.', ',') : '');
  const [texto, setTexto] = useState(formatar(valor));
  const focado = useRef(false);
  useEffect(() => {
    if (!focado.current) setTexto(formatar(valor));
  }, [valor]);
  return (
    <label class="campo-unidade">
      <input
        id={id}
        class="campo"
        inputMode="decimal"
        placeholder="0"
        aria-label={rotulo}
        value={texto}
        onFocus={() => (focado.current = true)}
        onBlur={() => {
          focado.current = false;
          setTexto(formatar(valor));
        }}
        onInput={(e) => {
          const v = e.currentTarget.value.replace(/[^\d,.]/g, '').slice(0, 8);
          setTexto(v);
          aoMudar(lerDecimal(v));
        }}
      />
      <span>{sufixo}</span>
    </label>
  );
}
