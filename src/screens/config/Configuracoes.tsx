import { useEffect, useRef, useState } from 'preact/hooks';
import { haQuanto } from '../../app/datas.ts';
import { textoDiagnostico } from '../../app/erros.ts';
import { useInstalacao } from '../../app/instalacao.ts';
import { href, voltar } from '../../app/router.ts';
import { CampoDecimal, CampoDinheiro, CampoInteiro } from '../../components/Campos.tsx';
import { tiposDosNovelos } from '../../domain/pesagem.ts';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { toast } from '../../components/toast.tsx';
import { useLive } from '../../db/hooks.ts';
import { normalizarRepo, testarConexao } from '../../db/github.ts';
import {
  apagarEmMassa,
  lerConfig,
  lerPadroesCalculo,
  listarNovelos,
  listarPesosEmbalagem,
  listarProjetos,
  restaurarApagados,
  salvarConfig,
  salvarPesoEmbalagem
} from '../../db/repo.ts';
import { Interruptor } from '../../components/Interruptor.tsx';
import { CHAVES_SYNC, exportarBackup, importarBackup, lerConexao, salvarConexao, sincronizar } from '../../db/sync.ts';

const LINK_TOKEN = 'https://github.com/settings/personal-access-tokens/new';

export function Configuracoes() {
  const estado = useLive(async () => ({
    nome: await lerConfig('nome', ''),
    padroes: await lerPadroesCalculo(),
    conexao: await lerConexao(),
    ultimoSync: await lerConfig<number | null>(CHAVES_SYNC.ultimoEm, null),
    erroSync: await lerConfig<string | null>(CHAVES_SYNC.erro, null),
    backupEm: await lerConfig<number | null>(CHAVES_SYNC.backupEm, null)
  }));
  const [persistente, setPersistente] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersistente).catch(() => setPersistente(null));
  }, []);

  if (!estado) {
    return (
      <main class="tela tela-sem-abas config">
        <header class="cabecalho-voltar">
          <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(href.inicio)}>
            <Icone nome="voltar" />
          </button>
          <h1>Configurações</h1>
        </header>
        <h2 class="secao-titulo">Diagnóstico</h2>
        <Diagnostico />
      </main>
    );
  }

  return (
    <main class="tela tela-sem-abas anim-tela config">
      <header class="cabecalho-voltar">
        <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(href.inicio)}>
          <Icone nome="voltar" />
        </button>
        <h1>Configurações</h1>
      </header>

      <h2 class="secao-titulo">Você</h2>
      <CampoNome inicial={estado.nome} />

      <h2 class="secao-titulo">Calculadora</h2>
      <div class="cartao-lista">
        <div class="linha-campo">
          <div class="linha-campo-texto">
            <strong>Valor por hora</strong>
            <small>padrão dos novos cálculos</small>
          </div>
          <div class="campo-estreito">
            <CampoDinheiro centavos={estado.padroes.valorHoraCentavos} aoMudar={(v) => void salvarConfig('valorHoraCentavos', v)} rotulo="Valor por hora padrão" />
          </div>
        </div>
        <div class="linha-campo">
          <div class="linha-campo-texto">
            <strong>Margem de lucro</strong>
            <small>sobre fios + trabalho + outros</small>
          </div>
          <div class="campo-estreito">
            <CampoInteiro valor={estado.padroes.margemPct} aoMudar={(v) => void salvarConfig('margemPct', v)} rotulo="Margem padrão" sufixo="%" max={500} vazioQuandoZero={false} />
          </div>
        </div>
      </div>

      <h2 class="secao-titulo">Embalagens</h2>
      <Embalagens />

      <h2 class="secao-titulo">Sincronização</h2>
      {estado.conexao ? (
        <Conectado repo={estado.conexao.repo} ultimo={estado.ultimoSync} erro={estado.erroSync} />
      ) : (
        <Conectar />
      )}

      <h2 class="secao-titulo">Backup</h2>
      <Backup ultimo={estado.backupEm} />

      <Instalar />

      <h2 class="secao-titulo">Diagnóstico</h2>
      <Diagnostico />

      <h2 class="secao-titulo">Apagar dados</h2>
      <ApagarDados />

      <p class="rodape-config">
        Crochêzinho · versão {__VERSAO__}
        {persistente !== null && (
          <>
            <br />
            {persistente ? 'Dados protegidos contra limpeza automática do navegador.' : 'O navegador pode apagar os dados se faltar espaço — instale o app e mantenha um backup.'}
          </>
        )}
      </p>
    </main>
  );
}

function Embalagens() {
  const dados = useLive(async () => ({ novelos: await listarNovelos(), pesos: await listarPesosEmbalagem() }));
  if (!dados) return null;
  const tipos = tiposDosNovelos(dados.novelos);
  if (!tipos.length) {
    return <p class="texto-apagado">Quando você cadastrar novelos com tipo (Chenille, Amigurumi…), eles aparecem aqui para informar o peso da embalagem.</p>;
  }
  return (
    <>
      <p class="texto-apagado secao-ajuda">Peso de uma embalagem vazia (etiqueta, cone…). Quando você pesar novelos abertos com ela, o app desconta.</p>
      <div class="cartao-lista">
        {tipos.map(({ tipo, chave }) => (
          <div class="linha-campo" key={chave}>
            <div class="linha-campo-texto">
              <strong>{tipo}</strong>
              <small>{dados.pesos.get(chave) ? 'por novelo' : 'sem embalagem'}</small>
            </div>
            <div class="campo-estreito">
              <CampoDecimal valor={dados.pesos.get(chave) ?? 0} aoMudar={(g) => void salvarPesoEmbalagem(tipo, g)} rotulo={`Peso da embalagem de ${tipo}`} sufixo="g" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CampoNome({ inicial }: { inicial: string }) {
  const [nome, setNome] = useState(inicial);
  const salvar = (e: FocusEvent) => {
    const valor = (e.currentTarget as HTMLInputElement).value.trim();
    if (valor !== inicial) void salvarConfig('nome', valor);
  };
  return (
    <input
      class="campo"
      value={nome}
      placeholder="Seu nome"
      aria-label="Seu nome"
      autocomplete="given-name"
      onInput={(e) => setNome(e.currentTarget.value)}
      onBlur={salvar}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

function Conectar() {
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [testando, setTestando] = useState(false);

  const conectar = async (e: Event) => {
    e.preventDefault();
    const r = normalizarRepo(repo);
    if (!r) return setErro('Use o formato usuario/crochezinho-data.');
    if (!token.trim()) return setErro('Cole o token.');
    setErro(null);
    setTestando(true);
    try {
      const conexao = { repo: r, token: token.trim() };
      const { privado } = await testarConexao(conexao);
      if (!privado) {
        setErro('Esse repositório é público: seus dados ficariam visíveis para todo mundo. Deixe-o privado no GitHub e tente de novo.');
        return;
      }
      await salvarConexao(conexao);
      const res = await sincronizar();
      toast(res.ok === true ? 'Conectado e sincronizado' : 'Conectado, mas a sincronização falhou');
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setTestando(false);
    }
  };

  return (
    <form class="cartao-config" onSubmit={conectar}>
      <p class="texto-config">Mantém os dados iguais entre seus aparelhos, gravando um arquivo no seu repositório privado do GitHub. Sem isso, o app funciona normalmente só neste aparelho.</p>
      <details class="passos">
        <summary>Como criar o token</summary>
        <ol>
          <li>
            Abra{' '}
            <a href={LINK_TOKEN} target="_blank" rel="noopener noreferrer">
              github.com → novo token
            </a>{' '}
            (fine-grained).
          </li>
          <li>Repository access: <strong>Only select repositories</strong> → <strong>crochezinho-data</strong>.</li>
          <li>Permissions → Repository → <strong>Contents: Read and write</strong>.</li>
          <li>Gere, copie e cole abaixo. Faça isso uma vez em cada aparelho.</li>
        </ol>
      </details>
      <label class="rotulo" for="gh-repo">
        Repositório
      </label>
      <input id="gh-repo" class="campo" value={repo} onInput={(e) => setRepo(e.currentTarget.value)} placeholder="seu-usuario/crochezinho-data" autocapitalize="off" autocomplete="off" spellcheck={false} />
      <label class="rotulo" for="gh-token">
        Token
      </label>
      <input id="gh-token" class="campo" type="password" value={token} onInput={(e) => setToken(e.currentTarget.value)} placeholder="github_pat_…" autocapitalize="off" autocomplete="off" spellcheck={false} />
      {erro && <p class="erro">{erro}</p>}
      <button type="submit" class="botao primario largo" style={{ marginTop: 14 }} disabled={testando}>
        {testando ? 'Conectando…' : 'Conectar'}
      </button>
    </form>
  );
}

function Conectado({ repo, ultimo, erro }: { repo: string; ultimo: number | null; erro: string | null }) {
  const [rodando, setRodando] = useState(false);
  const agora = Date.now();

  const agoraSincroniza = async () => {
    setRodando(true);
    const r = await sincronizar();
    setRodando(false);
    if (r.ok === true) toast(r.recebidos ? `Sincronizado · ${r.recebidos} ${r.recebidos === 1 ? 'mudança recebida' : 'mudanças recebidas'}` : 'Sincronizado');
    else if (r.ok === false) toast('Não foi possível sincronizar');
  };

  return (
    <div class="cartao-config">
      <div class="status-sync">
        <span class={'ponto-sync' + (erro ? ' erro' : ultimo ? ' ok' : '')} />
        <div>
          <strong>{repo}</strong>
          <small>{erro ? erro : ultimo ? `sincronizado ${haQuanto(ultimo, agora)}` : 'ainda não sincronizou'}</small>
        </div>
      </div>
      <p class="texto-config">Sincroniza sozinho ao abrir e ao sair do app.</p>
      <div class="ajuste-botoes">
        <button
          class="botao"
          onClick={() => {
            void salvarConexao(null);
            toast('Desconectado. Os dados continuam neste aparelho.');
          }}
        >
          Desconectar
        </button>
        <button class="botao primario" disabled={rodando} onClick={() => void agoraSincroniza()}>
          {rodando ? 'Sincronizando…' : 'Sincronizar agora'}
        </button>
      </div>
    </div>
  );
}

function ApagarDados() {
  const contagem = useLive(async () => ({ projetos: (await listarProjetos()).length, novelos: (await listarNovelos()).length }));
  const [confirmando, setConfirmando] = useState(false);
  const [projetos, setProjetos] = useState(true);
  const [novelos, setNovelos] = useState(true);
  const [apagando, setApagando] = useState(false);
  if (!contagem) return null;

  const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const nada = contagem.projetos === 0 && contagem.novelos === 0;
  const escolheuAlgo = (projetos && contagem.projetos > 0) || (novelos && contagem.novelos > 0);

  const apagar = async () => {
    setApagando(true);
    const a = await apagarEmMassa({ projetos, novelos });
    setApagando(false);
    setConfirmando(false);
    const partes = [a.projetos.length && plural(a.projetos.length, 'projeto', 'projetos'), a.novelos.length && plural(a.novelos.length, 'novelo', 'novelos')].filter(Boolean);
    toast(`Apagados: ${partes.join(' e ')}`, { rotulo: 'Desfazer', fazer: () => void restaurarApagados(a) });
  };

  return (
    <div class="cartao-config">
      <p class="texto-config">Apaga projetos e/ou novelos de uma vez. Seu nome, valor por hora, margem e a sincronização continuam.</p>
      <button
        class="botao perigo largo"
        disabled={nada}
        onClick={() => {
          setProjetos(true);
          setNovelos(true);
          setConfirmando(true);
        }}
      >
        {nada ? 'Nada para apagar' : 'Apagar projetos e novelos'}
      </button>

      <Sheet aberta={confirmando} aoFechar={() => !apagando && setConfirmando(false)} titulo="O que apagar?">
        <Interruptor
          ligado={projetos}
          aoMudar={setProjetos}
          rotulo={`Projetos (${contagem.projetos})`}
          detalhe="com os tempos do cronômetro e os cálculos de preço"
        />
        <Interruptor ligado={novelos} aoMudar={setNovelos} rotulo={`Novelos (${contagem.novelos})`} detalhe="todo o estoque" />
        <p class="texto-config" style={{ marginTop: 14 }}>
          Some em todos os aparelhos sincronizados. Dá para desfazer logo depois; se quiser uma cópia guardada, exporte um backup antes.
        </p>
        <div class="ajuste-botoes" style={{ marginTop: 16 }}>
          <button
            class="botao"
            disabled={apagando}
            onClick={() =>
              void exportarBackup().then(
                () => toast('Backup salvo nos downloads'),
                () => toast('Não foi possível gerar o backup')
              )
            }
          >
            Exportar backup
          </button>
          <button class="botao perigo" disabled={apagando || !escolheuAlgo} onClick={() => void apagar()}>
            {apagando ? 'Apagando…' : 'Apagar'}
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Backup({ ultimo }: { ultimo: number | null }) {
  const arquivo = useRef<HTMLInputElement>(null);

  const importar = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try {
      const r = await importarBackup(f);
      toast(`Backup importado · ${r.projetos} ${r.projetos === 1 ? 'projeto' : 'projetos'}, ${r.novelos} ${r.novelos === 1 ? 'novelo' : 'novelos'} atualizados`);
    } catch (err) {
      toast((err as Error).message);
    }
  };

  return (
    <div class="cartao-config">
      <p class="texto-config">
        Um arquivo com todos os seus dados. Importar junta com o que já existe, sem apagar nada.
        <br />
        <strong>Último backup: {ultimo ? haQuanto(ultimo) : 'nunca'}</strong>
      </p>
      <div class="ajuste-botoes">
        <button class="botao" onClick={() => arquivo.current?.click()}>
          Importar
        </button>
        <button
          class="botao primario"
          onClick={() =>
            void exportarBackup().then(
              () => toast('Backup salvo nos downloads'),
              () => toast('Não foi possível gerar o backup')
            )
          }
        >
          Exportar
        </button>
      </div>
      <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={(e) => void importar(e)} />
    </div>
  );
}

function Instalar() {
  const { plataforma, instalado, podeInstalar, instalar } = useInstalacao();
  if (instalado) return null;
  if (plataforma === 'ios') {
    return (
      <>
        <h2 class="secao-titulo">Instalar no iPhone</h2>
        <div class="cartao-config">
          <ol class="passos-ios">
            <li>
              No Safari, toque em <strong>Compartilhar</strong> <Icone nome="compartilhar" tamanho={18} />
            </li>
            <li>
              Escolha <strong>Adicionar à Tela de Início</strong>
            </li>
          </ol>
          <p class="texto-config">Instalado, o app abre em tela cheia, funciona offline e o iPhone não apaga seus dados.</p>
        </div>
      </>
    );
  }
  if (podeInstalar) {
    return (
      <>
        <h2 class="secao-titulo">Instalar</h2>
        <div class="cartao-config">
          <p class="texto-config">Coloque o Crochêzinho na tela inicial, com ícone próprio e funcionando offline.</p>
          <button class="botao primario largo" onClick={() => void instalar().then((ok) => ok && toast('App instalado'))}>
            Instalar app
          </button>
        </div>
      </>
    );
  }
  return null;
}

function Diagnostico() {
  const [texto, setTexto] = useState<string | null>(null);
  const ver = async () => setTexto(await textoDiagnostico());
  const copiar = async () => {
    const t = texto ?? (await textoDiagnostico());
    try {
      await navigator.clipboard.writeText(t);
      toast('Diagnóstico copiado');
    } catch {
      window.prompt('Copie o texto abaixo:', t);
    }
  };
  return (
    <div class="cartao-config">
      <p class="texto-config">Se algo não funcionar, copie isto e envie para quem está te ajudando. Não inclui seus dados nem o token.</p>
      {texto && <pre class="diagnostico">{texto}</pre>}
      <div class="ajuste-botoes">
        <button class="botao" onClick={() => void ver()}>
          {texto ? 'Atualizar' : 'Ver diagnóstico'}
        </button>
        <button class="botao primario" onClick={() => void copiar()}>
          Copiar
        </button>
      </div>
    </div>
  );
}
