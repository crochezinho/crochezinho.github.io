# Crochezinho — especificação

App pessoal (uma usuária), PWA mobile-first, 100% offline depois da primeira visita.
Fonte de verdade visual: `design/prototipo-v3.dc.html` (abre no navegador junto com `design/support.js`;
precisa de internet porque carrega o React do unpkg). Tokens de estilo em `src/styles/tokens.css`.

Princípio: **simples e intuitivo**. Na dúvida, menos toques e menos opções.

## Plataforma

- Vite + Preact + TypeScript + Dexie (IndexedDB) + vite-plugin-pwa.
- Publicado no **GitHub Pages** (este repositório, público) via `.github/workflows/deploy.yml`.
- Sincronização entre aparelhos: o app grava um JSON num **repositório privado `crochezinho-data`**
  pela API do GitHub, com um token fine-grained (só leitura/escrita de conteúdo nesse repositório),
  colado uma vez em cada aparelho. O app funciona sem isso. Envia e busca ao abrir e ao sair;
  em conflito vence a edição mais recente (`atualizadoEm`). Exclusões são marcadas (`excluidoEm`).
- Exportar/importar arquivo JSON como backup manual.

## Navegação

4 abas com rótulo: **Início · Projetos · Novelos · Calcular**. Configurações numa engrenagem na Início.

## Telas

### Início
- Cartão do cronômetro: projeto atual, estado real (⏸ rodando / ▶ pausado), trocar de projeto.
- Projetos em andamento (tocar = abrir; ▶ = iniciar crono, pausando o atual).
- Horas no mês. Indicador de sincronização.

### Cronômetro (tema escuro)
- Número grande: **tempo total do projeto** ("2h 14min"). Menor: "esta sessão: 43 min".
- Indicador "● em andamento" / "pausado". **Sem anel, sem carreiras, sem pontos, sem trava de tela.**
- Um botão grande pausar/retomar; um único voltar.
- **Ajustar tempo**: corrigir sessões ou somar/tirar minutos. Ao lado, atalho **Calcular preço** do projeto.
- Ao reabrir com sessão rodando há mais de 3 h: "Você ainda estava crochetando?" com correção da hora de parada.
- Trocar de projeto; iniciar outro pausa o atual. Uma sessão aberta por vez.
- Tela acesa enquanto roda (Wake Lock, quando disponível).
- Tempo calculado por timestamps (`inicio`/`fim`), nunca por contador em memória.

### Calculadora
- Avulsa ou ligada a um projeto ("Calcular para" · trocar).
- Fios do estoque: **"sobrou Y g"** (gramas usadas = peso inicial − sobra) ou "usei X g". Custo = gramas × preço/grama.
- Horas em **h + min**, preenchidas com o tempo do cronômetro quando há projeto (editável).
- Valor/hora e margem vêm do padrão (Configurações), com "só neste cálculo".
- Margem aplicada sobre fios + trabalho + outros (texto explícito na tela).
- Outros custos (nome + valor).
- Total fixo no topo ao rolar. Barra de composição com cores distintas e valores escritos.
- **Sem arredondamento** do preço.
- Avulso: "Copiar valor" e "Criar projeto com este cálculo". Sem histórico de orçamentos.
- Ligado a projeto: "Salvar no projeto"; o projeto mostra a data do cálculo e avisa se o tempo mudou desde então.

### Projetos
- Lista em "Em andamento" e "Concluídos" (com preço quando houver); "+" abre o formulário.
- Formulário (criar/editar): nome, tipo, agulha (chips + outro tamanho), cor de capa.
- Detalhe: tempo, preço, "Começar/Continuar cronômetro" (já inicia e abre o crono), cartão de preço
  (abre a calculadora do projeto), fios usados (editados pela calculadora), menu ⋮ com Editar/Excluir.
- "Concluir projeto" → folha com o que sai de cada novelo e o que fica; interruptor para não descontar;
  pausa o crono se estiver rodando. "Desfazer" no aviso reabre e devolve o estoque.
- "Reabrir projeto" → oferece devolver ao estoque o que foi descontado.
- Excluir com "desfazer". Sessões de projetos excluídos não entram nas contas.

### Novelos
- Lista "Meus novelos" (cores · novelos), busca sem acento (cor, marca, linha, fibra, família),
  agrupar **por marca → linha** ou **por cor** (preferência lembrada), filtro **Acabando**.
- **Acabando = menos de 1 novelo inteiro em estoque.** Selo rosa-escuro na lista e aviso no detalhe.
- Detalhe: estoque com − / + (um novelo por toque) e "ajustar em gramas" (fechados + peso dos abertos,
  com desfazer); ficha (fibra, gramatura, metragem, agulha, lote, preço, preço/grama); usado em projetos;
  menu ⋮ Editar/Excluir (com desfazer).
- Formulário: cor, marca e linha (sugere as já usadas), fibra, gramatura, metragem, preço, lote,
  agulha, cor de capa (dá nome à família para agrupar). Estoque inicial só na criação.
- **Estoque em gramas**, exibido como "2 novelos + 40 g".

### Configurações (engrenagem na Início)
- Nome ("Oi, Bruna"), valor/hora padrão, margem padrão.
- Sincronização GitHub: repositório (`usuario/crochezinho-data` ou URL) + token fine-grained.
  Recusa repositório **público**. Status (verde/erro, "sincronizado há X"), "Sincronizar agora", "Desconectar".
  Automática: ao abrir, ao sair/voltar para o app e quando a internet volta (no máximo a cada 20 s).
- Backup: Exportar (`crochezinho-backup-AAAA-MM-DD.json`) e Importar (junta, não apaga). "Último backup: há X".
- Instalar: passo a passo no iPhone; botão "Instalar app" no Android.
- Rodapé: versão e se o navegador protegeu os dados contra limpeza.
- Início mostra um lembrete quando não há sincronização e o último backup tem mais de 14 dias
  (ou nunca houve), ou quando a sincronização falhou.

### Sincronização — detalhes
- Arquivo `dados.json` no repositório privado (API Contents do GitHub), com projetos, sessões, novelos
  (incluindo excluídos, marcados com `excluidoEm`) e as configs `nome`, `valorHoraCentavos`, `margemPct`.
- Mesclagem por registro: vence o `atualizadoEm` mais recente. Exclusões não ressuscitam.
- Token, rascunhos da calculadora e preferências de tela **ficam só no aparelho**.
- Conflito (outro aparelho gravou no meio): relê, mescla e tenta de novo (até 3 vezes).

## Fora do escopo
Contador de carreiras/pontos e metas, conquistas, retrospectiva, ganhos/vendas, lista de compras,
perfil com foto/bio, notificações push, anexo de receita, foto de capa, cartão de visita.

## Modelo de dados
Ver `src/db/types.ts` e `src/db/db.ts`. IDs UUID, dinheiro em centavos, datas em ms.
