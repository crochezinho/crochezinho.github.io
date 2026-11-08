import { limparErro, textoDiagnostico, useErro } from '../app/erros.ts';
import { toast } from './toast.tsx';

export function ErroNaTela() {
  const erro = useErro();
  if (!erro) return null;

  const copiar = async () => {
    const texto = await textoDiagnostico();
    try {
      await navigator.clipboard.writeText(texto);
      toast('Detalhes copiados');
    } catch {
      window.prompt('Copie o texto abaixo:', texto);
    }
  };

  return (
    <div class="erro-tela" role="alert">
      <p>
        <strong>Algo deu errado.</strong> {erro.mensagem}
      </p>
      <div class="erro-tela-acoes">
        <button onClick={() => void copiar()}>Copiar detalhes</button>
        <button onClick={limparErro}>Fechar</button>
      </div>
    </div>
  );
}
