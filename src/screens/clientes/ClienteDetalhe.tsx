import { useState } from 'preact/hooks';
import { useClientes } from '../../app/clientes.ts';
import { diaCurto } from '../../app/datas.ts';
import { valorCombinado } from '../../app/financeiro.ts';
import { href, ir, voltar } from '../../app/router.ts';
import { Capa } from '../../components/Capa.tsx';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { salvarCliente } from '../../db/repo.ts';
import { FICHA_VAZIA, iniciais, type Ficha } from '../../domain/clientes.ts';
import { etapa, NOME_ETAPA } from '../../domain/encomendas.ts';
import { mesDe, nomeDoMes } from '../../domain/financeiro.ts';
import { diaDaEntrega } from '../../domain/prazo.ts';
import { brl } from '../../domain/preco.ts';

export function ClienteDetalhe({ chave }: { chave: string }) {
  const tudo = useClientes();
  const [editando, setEditando] = useState(false);
  if (!tudo) return <main class="tela" />;
  const cliente = tudo.clientes.find((c) => c.chave === chave);
  const ficha = tudo.fichas.get(chave) ?? FICHA_VAZIA;

  if (!cliente) {
    return (
      <main class="tela tela-sem-abas">
        <header class="cabecalho-voltar">
          <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(href.projetos)}>
            <Icone nome="voltar" />
          </button>
          <h1>Cliente</h1>
        </header>
        <p class="texto-apagado">Nenhuma encomenda com esse nome.</p>
      </main>
    );
  }

  const { comTempo } = tudo.dados;
  const temFicha = !!(ficha.contato || ficha.anotacoes);

  return (
    <main class="tela tela-sem-abas anim-tela cliente">
      <header class="cabecalho-voltar">
        <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(href.projetos)}>
          <Icone nome="voltar" />
        </button>
        <h1>{cliente.nome}</h1>
      </header>

      <section class="cliente-topo">
        <span class="avatar avatar-g" aria-hidden="true">
          {iniciais(cliente.nome)}
        </span>
        <div>
          <p class="cliente-resumo">
            {cliente.projetos.length === 1 ? '1 encomenda' : `${cliente.projetos.length} encomendas`}
            {cliente.emAberto > 0 && `, ${cliente.emAberto} em aberto`}
          </p>
          <p class="cliente-desde">cliente desde {nomeDoMes(mesDe(cliente.primeiraEm), true)}</p>
        </div>
      </section>

      {cliente.totalCentavos > 0 && (
        <div class="cartao-lista">
          <div class="linha-campo">
            <span class="linha-campo-texto">
              <strong>Já comprou</strong>
            </span>
            <span class="linha-valor">{brl(cliente.totalCentavos)}</span>
          </div>
        </div>
      )}

      <div class="secao-cabecalho">
        <h2 class="secao-titulo">Contato</h2>
        {temFicha && (
          <button class="link-pequeno" onClick={() => setEditando(true)}>
            editar
          </button>
        )}
      </div>
      {temFicha ? (
        <div class="ficha-cliente">
          {ficha.contato && <p class="ficha-texto">{ficha.contato}</p>}
          {ficha.anotacoes && (
            <>
              <p class="ficha-rotulo">Anotações</p>
              <p class="ficha-texto">{ficha.anotacoes}</p>
            </>
          )}
        </div>
      ) : (
        <button class="cartao-acao vazio-tracejado" onClick={() => setEditando(true)}>
          <span class="cartao-acao-icone">
            <Icone nome="mais" />
          </span>
          <span class="linha-projeto-texto">
            <strong>Anotar contato</strong>
          </span>
        </button>
      )}

      <h2 class="secao-titulo">Encomendas</h2>
      <ul class="lista">
        {cliente.projetos.map((p) => {
          const fase = etapa(p, comTempo);
          const quando =
            fase === 'entregue' && p.entregueEm
              ? `entregue ${diaCurto(p.entregueEm)}`
              : p.entregaEm
                ? `entrega ${diaDaEntrega(p.entregaEm)}`
                : `criada ${diaCurto(p.criadoEm)}`;
          const valor = valorCombinado(p);
          return (
            <li key={p.id} class="linha-projeto" onClick={() => ir(href.projeto(p.id))}>
              <Capa class="capa" cor={p.capaCor} fotoId={p.fotoId} />
              <span class="linha-projeto-texto">
                <strong>{p.nome}</strong>
                <small>{fase === 'entregue' ? quando : `${NOME_ETAPA[fase]} · ${quando}`}</small>
              </span>
              {valor > 0 && <span class="linha-valor">{brl(valor)}</span>}
            </li>
          );
        })}
      </ul>

      <button class="botao primario largo cliente-nova" onClick={() => ir(href.novaEncomendaPara(cliente.nome))}>
        Nova encomenda para {cliente.nome}
      </button>

      <FichaSheet aberta={editando} aoFechar={() => setEditando(false)} chave={chave} nome={cliente.nome} ficha={ficha} />
    </main>
  );
}

type PropsFicha = { aberta: boolean; aoFechar: () => void; chave: string; nome: string; ficha: Ficha };

function FichaSheet(props: PropsFicha) {
  return props.aberta ? <FichaAberta {...props} /> : null;
}

function FichaAberta({ aberta, aoFechar, chave, nome: nomeAtual, ficha }: PropsFicha) {
  const [nome, setNome] = useState(nomeAtual);
  const [f, setF] = useState(ficha);
  const trocouNome = !!nome.trim() && nome.trim() !== nomeAtual;

  const salvar = async (e: Event) => {
    e.preventDefault();
    const nova = await salvarCliente(chave, nome, f);
    aoFechar();
    if (nova !== chave) ir(href.cliente(nova), true);
    toast(trocouNome ? 'Nome trocado em todas as encomendas' : 'Contato salvo');
  };

  return (
    <Sheet aberta={aberta} aoFechar={aoFechar} titulo="Contato">
      <form onSubmit={salvar}>
        <label class="rotulo" for="cl-nome">
          Nome
        </label>
        <input id="cl-nome" class="campo" value={nome} onInput={(e) => setNome(e.currentTarget.value)} autocomplete="off" />

        <label class="rotulo" for="cl-contato">
          Contato <span class="opcional">opcional</span>
        </label>
        <textarea
          id="cl-contato"
          class="campo anotacoes"
          rows={2}
          value={f.contato}
          onInput={(e) => setF({ ...f, contato: e.currentTarget.value })}
          placeholder="(11) 99999-9999, @perfil, endereço…"
        />

        <label class="rotulo" for="cl-notas">
          Anotações <span class="opcional">opcional</span>
        </label>
        <textarea
          id="cl-notas"
          class="campo anotacoes"
          rows={3}
          value={f.anotacoes}
          onInput={(e) => setF({ ...f, anotacoes: e.currentTarget.value })}
          placeholder="Cores preferidas, tamanho, se é presente…"
        />

        <button type="submit" class="botao primario largo" style={{ marginTop: 18 }} disabled={!nome.trim()}>
          Salvar
        </button>
      </form>
    </Sheet>
  );
}
