import { useState } from 'preact/hooks';
import { Capa } from '../../components/Capa.tsx';
import { href, ir, voltar } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { Sheet } from '../../components/Sheet.tsx';
import { VerFoto } from '../../components/VerFoto.tsx';
import { useLive } from '../../db/hooks.ts';
import { listarNovelos } from '../../db/repo.ts';
import type { Novelo } from '../../db/types.ts';
import { alternarSelecao, MAX_COMBINAR, mover } from '../../domain/combinar.ts';
import { formatarEstoque } from '../../domain/estoque.ts';
import { filtrar, nomeDoNovelo } from '../../domain/novelos.ts';

export function CombinarFios({ ids }: { ids: string[] }) {
  const novelos = useLive(listarNovelos);
  const [adicionando, setAdicionando] = useState(false);
  const [foto, setFoto] = useState<Novelo | null>(null);

  if (!novelos) return <main class="tela" />;
  const porId = new Map(novelos.map((n) => [n.id, n]));
  const fios = ids.map((id) => porId.get(id)).filter((n): n is Novelo => !!n);
  const atuais = fios.map((n) => n.id);
  const trocar = (novos: string[]) => ir(href.combinar(novos), true);

  return (
    <main class="tela tela-sem-abas anim-tela combinar">
      <header class="cabecalho-voltar">
        <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(href.novelos)}>
          <Icone nome="voltar" />
        </button>
        <h1>Combinar fios</h1>
      </header>

      {fios.length === 0 ? (
        <div class="vazio">
          <h2>Nenhum fio escolhido</h2>
          <p>Escolha os fios em Meus novelos, no botão Combinar.</p>
        </div>
      ) : (
        <>
          <div class="combinar-faixas" style={{ gridTemplateColumns: `repeat(${fios.length}, 1fr)` }}>
            {fios.map((n) => (
              <Capa key={n.id} class="combinar-faixa" tag="div" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId}>
                {n.fotoId && <button class="faixa-ver-foto" aria-label={`Ver foto de ${nomeDoNovelo(n)}`} onClick={() => setFoto(n)} />}
              </Capa>
            ))}
          </div>

          <ol class="combinar-legendas" style={{ gridTemplateColumns: `repeat(${fios.length}, 1fr)` }}>
            {fios.map((n, i) => (
              <li key={n.id}>
                <strong>{n.cor || nomeDoNovelo(n)}</strong>
                <small>{[n.tipo, n.marca].filter(Boolean).join(' · ') || 'Sem tipo'}</small>
                <small>{formatarEstoque(n.estoqueG)}</small>
                <div class="combinar-acoes">
                  <button aria-label={`Mover ${n.cor} para a esquerda`} disabled={i === 0} onClick={() => trocar(mover(atuais, i, -1))}>
                    <Icone nome="voltar" tamanho={18} espessura={2.2} />
                  </button>
                  <button aria-label={`Tirar ${n.cor}`} disabled={fios.length === 1} onClick={() => trocar(atuais.filter((id) => id !== n.id))}>
                    <Icone nome="fechar" tamanho={16} espessura={2.2} />
                  </button>
                  <button aria-label={`Mover ${n.cor} para a direita`} disabled={i === fios.length - 1} onClick={() => trocar(mover(atuais, i, 1))}>
                    <Icone nome="seta" tamanho={18} espessura={2.2} />
                  </button>
                </div>
              </li>
            ))}
          </ol>

          {fios.length < MAX_COMBINAR && novelos.length > fios.length && (
            <button class="botao largo combinar-adicionar" onClick={() => setAdicionando(true)}>
              <Icone nome="mais" />
              Adicionar fio
            </button>
          )}
        </>
      )}

      <Sheet aberta={adicionando} aoFechar={() => setAdicionando(false)} titulo="Adicionar fio">
        {adicionando && (
          <EscolherFio
            novelos={novelos.filter((n) => !atuais.includes(n.id))}
            aoEscolher={(id) => {
              setAdicionando(false);
              trocar(alternarSelecao(atuais, id));
            }}
          />
        )}
      </Sheet>

      {foto?.fotoId && <VerFoto fotoId={foto.fotoId} titulo={nomeDoNovelo(foto)} aoFechar={() => setFoto(null)} />}
    </main>
  );
}

function EscolherFio({ novelos, aoEscolher }: { novelos: Novelo[]; aoEscolher: (id: string) => void }) {
  const [busca, setBusca] = useState('');
  const visiveis = filtrar(novelos, busca);
  return (
    <>
      <div class="busca combinar-busca">
        <input
          class="campo"
          type="search"
          placeholder="Buscar cor, marca, tipo…"
          value={busca}
          onInput={(e) => setBusca(e.currentTarget.value)}
          aria-label="Buscar novelos"
        />
      </div>
      {visiveis.length === 0 ? (
        <p class="texto-apagado">Nada encontrado.</p>
      ) : (
        <div class="grade-novelos">
          {visiveis.map((n) => (
            <button key={n.id} class="bloco-novelo" onClick={() => aoEscolher(n.id)}>
              <Capa class="bloco-cor" cor={n.capaCor} textura={n.textura} fotoId={n.fotoId} />
              <strong>{n.cor}</strong>
              <small>{n.tipo || formatarEstoque(n.estoqueG)}</small>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
