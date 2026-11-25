import { useEffect, useState } from 'preact/hooks';
import { compartilharImagem, desenharOrcamento, nomeDoArquivo, type DadosOrcamento } from '../../app/orcamento.ts';
import { CampoDinheiro } from '../../components/Campos.tsx';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { lerConfig, salvarConfig } from '../../db/repo.ts';
import { brl } from '../../domain/preco.ts';

export const CHAVE_ASSINATURA = 'orcamento.assinatura';

type Inicial = Omit<DadosOrcamento, 'assinatura'>;
type Props = {
  aberta: boolean;
  aoFechar: () => void;
  inicial: Inicial;
  /** Chamado depois de compartilhar, com o valor e o frete que foram na imagem. */
  aoEnviar?: (valorCentavos: number, freteCentavos: number) => void;
};

export function OrcamentoSheet(props: Props) {
  const assinatura = useLive(async () => {
    const salva = await lerConfig<string | null>(CHAVE_ASSINATURA, null);
    return salva ?? (await lerConfig('nome', ''));
  });
  if (!props.aberta || assinatura === undefined) return null;
  return <OrcamentoAberto {...props} assinaturaInicial={assinatura} />;
}

function OrcamentoAberto({ aberta, aoFechar, inicial, aoEnviar, assinaturaInicial }: Props & { assinaturaInicial: string }) {
  const [d, setD] = useState<DadosOrcamento>({ ...inicial, assinatura: assinaturaInicial });
  const [imagem, setImagem] = useState<{ blob: Blob; url: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const mudar = (parte: Partial<DadosOrcamento>) => setD((a) => ({ ...a, ...parte }));

  useEffect(() => {
    let vivo = true;
    let url: string | null = null;
    const espera = setTimeout(() => {
      void desenharOrcamento(d)
        .then((blob) => {
          if (!vivo) return;
          url = URL.createObjectURL(blob);
          setImagem({ blob, url });
        })
        .catch(() => vivo && toast('Não foi possível gerar a imagem'));
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(espera);
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 2000);
    };
  }, [d]);

  const enviar = async () => {
    if (!imagem) return;
    setEnviando(true);
    try {
      if (d.assinatura !== assinaturaInicial) void salvarConfig(CHAVE_ASSINATURA, d.assinatura.trim());
      const r = await compartilharImagem(imagem.blob, nomeDoArquivo(d.titulo));
      if (r === 'cancelou') return;
      aoEnviar?.(d.valorCentavos, d.freteCentavos);
      if (r === 'baixou') toast('Imagem salva nos downloads');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Imagem do orçamento">
      <div class="previa-orcamento">{imagem ? <img src={imagem.url} alt="Prévia do orçamento" /> : <span>Montando a imagem…</span>}</div>

      <label class="rotulo" for="orc-titulo">
        Peça
      </label>
      <input id="orc-titulo" class="campo" value={d.titulo} onInput={(e) => mudar({ titulo: e.currentTarget.value })} placeholder="ex: Urso Theo" autocomplete="off" />

      <div class="grade-2">
        <div>
          <label class="rotulo" for="orc-valor">
            {d.quantidade > 1 ? `Valor das ${d.quantidade} peças` : 'Valor'}
          </label>
          <CampoDinheiro id="orc-valor" centavos={d.valorCentavos} aoMudar={(v) => mudar({ valorCentavos: v })} rotulo="Valor" />
        </div>
        <div>
          <label class="rotulo" for="orc-frete">
            Frete <span class="opcional">opcional</span>
          </label>
          <CampoDinheiro id="orc-frete" centavos={d.freteCentavos} aoMudar={(v) => mudar({ freteCentavos: v })} rotulo="Frete" />
        </div>
      </div>

      <label class="rotulo" for="orc-entrega">
        Entrega <span class="opcional">opcional</span>
      </label>
      <input id="orc-entrega" class="campo campo-data" type="date" value={d.entregaEm ?? ''} onInput={(e) => mudar({ entregaEm: e.currentTarget.value || null })} />

      <label class="rotulo" for="orc-assinatura">
        Assinatura <span class="opcional">opcional</span>
      </label>
      <input
        id="orc-assinatura"
        class="campo"
        value={d.assinatura}
        onInput={(e) => mudar({ assinatura: e.currentTarget.value })}
        placeholder="ex: Crochê da Ana"
        autocomplete="off"
      />

      <button class="botao primario largo" style={{ marginTop: 20 }} disabled={!imagem || enviando || d.valorCentavos <= 0} onClick={() => void enviar()}>
        <Icone nome="compartilhar" tamanho={20} />
        {d.valorCentavos > 0 ? `Compartilhar · ${brl(d.valorCentavos + d.freteCentavos)}` : 'Preencha o valor'}
      </button>
    </Sheet>
  );
}
