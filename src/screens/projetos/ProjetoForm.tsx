import { useEffect, useRef, useState } from 'preact/hooks';
import { AGULHAS, TIPOS } from '../../app/constantes.ts';
import { CampoInteiro } from '../../components/Campos.tsx';
import { SeletorCapa } from '../../components/SeletorCapa.tsx';
import { useDadosCrono } from '../../app/dados.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { toast } from '../../components/toast.tsx';
import { CAPA_PADRAO, criarProjeto, editarProjeto, type CamposProjeto } from '../../db/repo.ts';

export function ProjetoForm({ id }: { id: string | null }) {
  const dados = useDadosCrono();
  const projeto = id ? dados?.projetos.find((p) => p.id === id) : undefined;
  const [campos, setCampos] = useState<CamposProjeto>({ nome: '', tipo: TIPOS[0], agulha: '', capaCor: CAPA_PADRAO, quantidade: 1 });
  const [carregado, setCarregado] = useState(!id);
  const nomeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (projeto && !carregado) {
      setCampos({ nome: projeto.nome, tipo: projeto.tipo, agulha: projeto.agulha, capaCor: projeto.capaCor, quantidade: projeto.quantidade ?? 1 });
      setCarregado(true);
    }
  }, [projeto, carregado]);

  useEffect(() => {
    if (!id) setTimeout(() => nomeRef.current?.focus(), 80);
  }, [id]);

  if (id && !carregado) {
    return <main class="tela">{dados && !projeto && <p class="texto-apagado">Projeto não encontrado.</p>}</main>;
  }

  const mudar = (parte: Partial<CamposProjeto>) => setCampos((c) => ({ ...c, ...parte }));
  const agulhaOutra = campos.agulha !== '' && !AGULHAS.includes(campos.agulha);

  const salvar = async (e: Event) => {
    e.preventDefault();
    if (id) {
      await editarProjeto(id, campos);
      toast('Projeto atualizado');
      voltar(href.projeto(id));
    } else {
      const novoId = await criarProjeto(campos.nome, campos);
      toast('Projeto criado');
      ir(href.projeto(novoId), true);
    }
  };

  return (
    <main class="tela tela-sem-abas anim-tela">
      <header class="cabecalho-voltar">
        <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(id ? href.projeto(id) : href.projetos)}>
          <Icone nome="voltar" />
        </button>
        <h1>{id ? 'Editar projeto' : 'Novo projeto'}</h1>
      </header>

      <form onSubmit={salvar}>
        <label class="rotulo" for="pf-nome">
          Como vai se chamar?
        </label>
        <input
          id="pf-nome"
          ref={nomeRef}
          class="campo"
          value={campos.nome}
          onInput={(e) => mudar({ nome: e.currentTarget.value })}
          placeholder="ex: Coelha Lavanda"
          autocomplete="off"
        />

        <p class="rotulo">Tipo</p>
        <div class="chips" role="radiogroup" aria-label="Tipo">
          {TIPOS.map((t) => (
            <button type="button" key={t} role="radio" aria-checked={campos.tipo === t} class={'chip' + (campos.tipo === t ? ' ativo' : '')} onClick={() => mudar({ tipo: t })}>
              {t}
            </button>
          ))}
        </div>

        <label class="rotulo" for="pf-qtd">
          Peças iguais
        </label>
        <CampoInteiro id="pf-qtd" valor={campos.quantidade} aoMudar={(q) => mudar({ quantidade: Math.max(1, q) })} rotulo="Peças iguais" sufixo="peças" max={9999} vazioQuandoZero={false} />
        <p class="texto-apagado">Ex.: 10 chaveiros iguais. Na calculadora, fios e outros custos são por peça.</p>

        <p class="rotulo">Agulha</p>
        <div class="chips" role="radiogroup" aria-label="Agulha">
          {AGULHAS.map((a) => (
            <button
              type="button"
              key={a}
              role="radio"
              aria-checked={campos.agulha === a}
              class={'chip' + (campos.agulha === a ? ' ativo' : '')}
              onClick={() => mudar({ agulha: campos.agulha === a ? '' : a })}
            >
              {a}
            </button>
          ))}
        </div>
        <input
          class="campo"
          style={{ marginTop: 10 }}
          value={agulhaOutra ? campos.agulha : ''}
          onInput={(e) => mudar({ agulha: e.currentTarget.value })}
          placeholder="outro tamanho (ex: 6 mm)"
          aria-label="Outro tamanho de agulha"
        />

        <p class="rotulo">Capa</p>
        <SeletorCapa cor={campos.capaCor} aoMudarCor={(c) => mudar({ capaCor: c })} />

        <button type="submit" class="botao primario largo" style={{ marginTop: 28 }}>
          {id ? 'Salvar alterações' : 'Criar projeto'}
        </button>
      </form>
    </main>
  );
}
