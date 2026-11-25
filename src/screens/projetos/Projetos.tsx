import { useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { useDadosCrono } from '../../app/dados.ts';
import { useAgora } from '../../app/hooks.ts';
import { href, ir } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { SeloPrazo } from '../../components/SeloPrazo.tsx';
import { diaCurto } from '../../app/datas.ts';
import { useLive } from '../../db/hooks.ts';
import { lerConfig, listarFichas, salvarConfig } from '../../db/repo.ts';
import { agruparClientes, buscarClientes, iniciais } from '../../domain/clientes.ts';
import { valorCombinado } from '../../app/financeiro.ts';
import { etapa, naFila, separarEncomendas } from '../../domain/encomendas.ts';
import type { Projeto } from '../../db/types.ts';
import { brl } from '../../domain/preco.ts';
import { ordenarPorPrazo } from '../../domain/prazo.ts';
import { BUSCA_A_PARTIR_DE, buscarProjetos } from '../../domain/projetos.ts';
import { formatarTotal, totalDoProjeto } from '../../domain/tempo.ts';

type Vista = 'todos' | 'encomendas' | 'clientes';
const VISTAS: [Vista, string][] = [
  ['todos', 'Todos'],
  ['encomendas', 'Encomendas'],
  ['clientes', 'Clientes']
];

export function Projetos() {
  const dados = useDadosCrono();
  const agora = useAgora(!!dados?.aberta, 30_000);
  const [busca, setBusca] = useState('');
  const vista = useLive(() => lerConfig<Vista>('projetos.vista', 'todos'));
  const fichas = useLive(listarFichas);

  if (!dados || !vista || !fichas) return null;
  const { projetos, sessoes, aberta, comTempo } = dados;
  const clientes = agruparClientes(projetos, valorCombinado);
  const comBusca = (vista === 'clientes' ? clientes.length : projetos.length) >= BUSCA_A_PARTIR_DE;
  const visiveis = comBusca && vista !== 'clientes' ? buscarProjetos(projetos, busca) : projetos;
  const clientesVisiveis = comBusca && vista === 'clientes' ? buscarClientes(clientes, busca, fichas) : clientes;
  const abertos = ordenarPorPrazo(visiveis.filter((p) => p.status === 'fazendo'));
  const fazendo = abertos.filter((p) => !naFila(p, comTempo));
  const fila = abertos.filter((p) => naFila(p, comTempo));
  const concluidos = visiveis.filter((p) => p.status === 'concluido').sort((a, b) => (b.concluidoEm ?? 0) - (a.concluidoEm ?? 0));
  const enc = separarEncomendas(visiveis, comTempo);
  const totalEncomendas = enc.fila.length + enc.fazendo.length + enc.pronta.length + enc.entregue.length;

  const linha = (p: Projeto) => (
    <li key={p.id} class="linha-projeto" onClick={() => ir(href.projeto(p.id))}>
      <Capa class="capa" cor={p.capaCor} fotoId={p.fotoId} />
      <span class="linha-projeto-texto">
        <strong>{p.nome}</strong>
        <small>
          {[
            p.cliente ? `para ${p.cliente}` : p.tipo,
            naFila(p, comTempo) ? 'na fila' : formatarTotal(totalDoProjeto(sessoes, p.id, agora)),
            aberta?.projetoId === p.id ? 'rodando' : ''
          ]
            .filter(Boolean)
            .join(' · ')}
        </small>
      </span>
      {(p.precoCentavos !== null || p.entregaEm || p.entregueEm) && (
        <span class="linha-projeto-lado">
          {p.precoCentavos !== null && <span class="linha-preco">{brl(p.precoCentavos)}</span>}
          {etapa(p, comTempo) === 'entregue' && p.entregueEm ? (
            <span class="selo-prazo entregue">entregue {diaCurto(p.entregueEm)}</span>
          ) : (
            (p.status === 'fazendo' || p.cliente || p.entregaEm) && <SeloPrazo entregaEm={p.entregaEm} agora={agora} />
          )}
        </span>
      )}
    </li>
  );

  return (
    <main class="tela anim-tela">
      <header class="cabecalho">
        <h1 class="titulo-grande">Projetos</h1>
        <span class="contador">{projetos.length}</span>
      </header>

      {projetos.length > 0 && (
        <div class="segmentado tres vista-projetos" role="tablist" aria-label="Mostrar">
          {VISTAS.map(([v, nome]) => (
            <button key={v} role="tab" aria-selected={vista === v} class={vista === v ? 'ativo' : ''} onClick={() => void salvarConfig('projetos.vista', v)}>
              {nome}
            </button>
          ))}
        </div>
      )}

      {projetos.length === 0 ? (
        <div class="vazio">
          <h2>Nenhum projeto ainda</h2>
          <p>Toque no + para criar o primeiro.</p>
        </div>
      ) : (
        <>
          {comBusca && (
            <div class="busca busca-projetos">
              <input
                class="campo"
                type="search"
                placeholder={vista === 'clientes' ? 'Buscar cliente ou contato…' : 'Buscar projeto, cliente, tipo…'}
                value={busca}
                onInput={(e) => setBusca(e.currentTarget.value)}
                aria-label="Buscar projetos"
              />
            </div>
          )}
          {vista === 'clientes' ? (
            clientesVisiveis.length === 0 ? (
              <div class="vazio">
                {busca.trim() && clientes.length ? (
                  <>
                    <h2>Nada encontrado</h2>
                    <p>Tente outra busca.</p>
                  </>
                ) : (
                  <>
                    <h2>Nenhum cliente ainda</h2>
                    <p>Quem aparece em "Para quem" numa encomenda entra aqui.</p>
                  </>
                )}
              </div>
            ) : (
              <ul class="lista">
                {clientesVisiveis.map((c) => (
                  <li key={c.chave} class="linha-projeto" onClick={() => ir(href.cliente(c.chave))}>
                    <span class="avatar" aria-hidden="true">
                      {iniciais(c.nome)}
                    </span>
                    <span class="linha-projeto-texto">
                      <strong>{c.nome}</strong>
                      <small>
                        {[c.projetos.length === 1 ? '1 encomenda' : `${c.projetos.length} encomendas`, c.emAberto > 0 && `${c.emAberto} em aberto`]
                          .filter(Boolean)
                          .join(' · ')}
                      </small>
                    </span>
                    {c.totalCentavos > 0 && <span class="linha-valor">{brl(c.totalCentavos)}</span>}
                  </li>
                ))}
              </ul>
            )
          ) : vista === 'encomendas' ? (
            totalEncomendas === 0 ? (
              <div class="vazio">
                {busca.trim() ? (
                  <>
                    <h2>Nada encontrado</h2>
                    <p>Tente outra busca.</p>
                  </>
                ) : (
                  <>
                    <h2>Nenhuma encomenda</h2>
                    <p>Um projeto vira encomenda quando tem "Para quem" ou "Entrega" preenchido.</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {enc.fazendo.length > 0 && (
                  <>
                    <h2 class="secao-titulo" style={{ marginTop: 0 }}>
                      Fazendo
                    </h2>
                    <ul class="lista">{enc.fazendo.map(linha)}</ul>
                  </>
                )}
                {enc.fila.length > 0 && (
                  <>
                    <h2 class="secao-titulo" style={enc.fazendo.length ? undefined : { marginTop: 0 }}>
                      Na fila
                    </h2>
                    <ul class="lista">{enc.fila.map(linha)}</ul>
                  </>
                )}
                {enc.pronta.length > 0 && (
                  <>
                    <h2 class="secao-titulo">Prontas para entregar</h2>
                    <ul class="lista">{enc.pronta.map(linha)}</ul>
                  </>
                )}
                {enc.entregue.length > 0 && (
                  <>
                    <h2 class="secao-titulo">Entregues</h2>
                    <ul class="lista concluidos">{enc.entregue.map(linha)}</ul>
                  </>
                )}
              </>
            )
          ) : (
            <>
              {abertos.length === 0 && concluidos.length === 0 && (
                <div class="vazio">
                  <h2>Nada encontrado</h2>
                  <p>Tente outra busca.</p>
                </div>
              )}
              {fazendo.length > 0 && (
                <>
                  <h2 class="secao-titulo" style={{ marginTop: 0 }}>
                    Em andamento
                  </h2>
                  <ul class="lista">{fazendo.map(linha)}</ul>
                </>
              )}
              {fila.length > 0 && (
                <>
                  <h2 class="secao-titulo" style={fazendo.length ? undefined : { marginTop: 0 }}>
                    Na fila
                  </h2>
                  <ul class="lista">{fila.map(linha)}</ul>
                </>
              )}
              {concluidos.length > 0 && (
                <>
                  <h2 class="secao-titulo">Concluídos</h2>
                  <ul class="lista concluidos">{concluidos.map(linha)}</ul>
                </>
              )}
            </>
          )}
        </>
      )}

      <button class="fab" aria-label="Novo projeto" onClick={() => ir(href.novoProjeto)}>
        <Icone nome="mais" tamanho={26} espessura={2.4} />
      </button>
    </main>
  );
}
