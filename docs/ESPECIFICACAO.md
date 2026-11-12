# Crochêzinho — especificação

App pessoal (uma usuária), PWA mobile-first, 100% offline depois da primeira visita.
Fonte de verdade visual: `design/prototipo-v3.dc.html` (abre no navegador junto com `design/support.js`;
precisa de internet porque carrega o React do unpkg). Tokens de estilo em `src/styles/tokens.css`.

Princípio: **simples e intuitivo**. Na dúvida, menos toques e menos opções.

## Plataforma

- Vite + Preact + TypeScript + Dexie (IndexedDB) + vite-plugin-pwa.
- Publicado no **GitHub Pages** em https://crochezinho.github.io/ (repositório público `crochezinho.github.io`) via `.github/workflows/deploy.yml`.
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
- "Tirar" tempo não passa do total do projeto (o tempo nunca fica negativo escondido). Ajustes contam em "no mês"
  no mês em que foram feitos.
- Trocar de projeto; iniciar outro pausa o atual. Uma sessão aberta por vez.
- Tela acesa enquanto roda (Wake Lock, quando disponível).
- Tempo calculado por timestamps (`inicio`/`fim`), nunca por contador em memória.

### Calcular (aba com três botões no topo: Preço · Shopee · Embalagem)
Abrir o cálculo de um projeto sempre mostra o Preço. O que foi digitado em Shopee/Embalagem fica salvo só no aparelho.

#### Preço
- Avulsa ou ligada a um projeto ("Calcular para" · trocar).
- **Peças iguais** (1 ou mais): fios e outros custos são **por peça** e o app multiplica; as horas são o total
  do projeto (todas as peças). Preço = (fios × peças + trabalho + outros × peças) × (1 + margem).
  Mostra o **preço por peça** em destaque e o total das peças embaixo; "Copiar valor" copia o preço por peça.
- Fios do estoque: **"sobrou Y g"** (gramas usadas = peso inicial − sobra) ou "usei X g". Custo = gramas × preço/grama.
  Peso ainda não digitado é "vazio", nunca zero: sem a sobra, o resumo mostra "—" e não dá para adicionar; quem
  usou o novelo inteiro marca **acabou**. Na calculadora avulsa basta o cadastro (não pede qual novelo físico).
- Dinheiro: vírgula é decimal; num teclado só com ponto, "18.50" vale R$ 18,50 ("1.234" continua milhar).
- Fio com **valor manual**: nome opcional + R$ por peça. Não mexe no estoque.
- Horas em **h + min**, preenchidas com o tempo do cronômetro quando há projeto (editável).
- Valor/hora e margem vêm do padrão (Configurações); mudar no cálculo vale só para ele, com "usar como padrão".
- Margem aplicada sobre fios + trabalho + outros (texto explícito na tela).
- Outros custos (nome + valor).
- Total fixo no topo ao rolar. Barra de composição com cores distintas e valores escritos.
- **Sem arredondamento** do preço.
- Avulso: "Copiar valor" e "Criar projeto com este cálculo". Sem histórico de orçamentos. As horas do cálculo não vão
  para o cronômetro (podem ser só uma estimativa); o cartão de preço do projeto mostra "estimado com Xh" enquanto o
  cronômetro estiver zerado.
- Ligado a projeto: "Salvar no projeto"; o projeto mostra a data do cálculo e avisa se o tempo mudou desde então.
  Projeto concluído: o cálculo muda só o preço (não os fios, já acertados com o estoque) e não oferece "a pesar".
- O que está sendo digitado fica salvo ao trocar de aba, mesmo logo depois de digitar.
- "Quanto sobra vendendo na Shopee?" leva o preço por peça e o custo por peça (sem o lucro) para a aba Shopee.

#### Shopee (portada do magamalabares, regras de nov/2026)
- Vendedor CPF. Preço de venda e custo (opcional) → **você recebe**, lucro e margem.
- Taxas detalhadas em "Ver as taxas"; itens no pedido, embalagem, +450 pedidos e campanha em "Ajustes".
- Avisos: prejuízo, degrau da taxa fixa (R$ 80/100/200) com o preço de equilíbrio, sugestão de kit
  para produto barato, notas do adicional regressivo e do Pix.
- Regras em `src/domain/vendas/shopee.ts`. Quando a Shopee mudar, atualizar aqui **e** no magamalabares.

#### Embalagem de envio (portada do magamalabares)
- Medidas e peso de uma peça, peças no pacote, tipo (flexível/rígido/plano), proteção, modalidade de envio.
- Resultado: medidas e peso **para cadastrar**, a embalagem sugerida e o peso sobre o qual o frete é calculado;
  dicas (limites, Mini Envios, tamanho pesando mais que o produto, kit, tamanho mínimo); "Comparar embalagens".
- Usa os catálogos padrão de caixas e envelopes (sem edição no app). Regras em `src/domain/vendas/embalagem.ts`.

### Projetos
- Lista em "Em andamento" e "Concluídos" (com preço quando houver); "+" abre o formulário.
- Formulário (criar/editar): nome, tipo, **peças iguais**, **para quem** e **entrega** (opcionais), agulha
  (chips + outro tamanho), cor de capa.
- **Encomendas**: com data de entrega, o projeto em andamento ganha um selo ("entrega em 3 dias", "entrega hoje",
  "atrasada 2 dias"; amarelo até 3 dias, vermelho se atrasada). "Em andamento" (Projetos e Início) mostra primeiro
  as encomendas, da entrega mais próxima para a mais distante. Sem notificações.
- Busca por nome, cliente ou tipo quando há 6 projetos ou mais.
- Topo da aba Projetos: **Todos · Encomendas** (preferência lembrada). Encomenda = projeto com "Para quem" ou
  "Entrega". Etapas **Fazendo → Pronta → Entregue**: pronta é o projeto concluído (o fio sai do estoque aí);
  "Marcar como entregue" guarda a data (`entregueEm`), com desfazer. Na vista Encomendas: Fazendo e Prontas para
  entregar (pela entrega mais próxima) e Entregues (mais recente primeiro). Numa encomenda, "Concluir projeto"
  aparece como "Marcar como pronta".
- Detalhe: tempo, preço, "Começar/Continuar cronômetro" (já inicia e abre o crono), cartão de preço
  (abre a calculadora do projeto), fios usados, menu ⋮ com Editar/Excluir.
- **Fios direto no projeto** (sem passar pela calculadora): "adicionar" abre a mesma folha de fio (só novelos do
  estoque, sem valor manual); tocar num fio edita ou tira (com desfazer). Projeto concluído não edita fios.
  Se o projeto tem cálculo, a mudança vai para o cálculo em andamento (fios manuais e preço/grama da época mantidos)
  e o aviso oferece "Revisar preço"; o preço salvo só muda ao salvar de novo na calculadora.
- **Qual novelo físico**: ao escolher um cadastro com mais de um novelo, escolhe-se qual (#1, #2…, com o peso e
  "em uso: Projeto" se já estiver em OUTRO projeto em andamento). O aberto mais leve vem marcado "sugerido".
  No projeto, o fio sempre é um novelo físico; na calculadora avulsa basta o cadastro.
- **Fio "a pesar"** ("Pesar no fim", o padrão nos projetos; sem abas: os outros modos são links "já usei e pesei a
  sobra" e "sei quanto usei"): o fio entra sem gramas ("Rosa #1 · a pesar") e guarda o **peso de antes** = o peso do
  novelo no estoque, ou "o peso mudou? pesar de novo" (balança, com desconto da embalagem). Novelo que não estava no
  estoque: pesa-se agora, e ao concluir a sobra entra no estoque como novelo aberto novo. Na calculadora aparece
  "a pesar no fim" e não entra no preço; no "Quanto fio preciso?" aparece "vai ser pesado no fim" (o app não afirma
  que dá). Ao concluir, pede-se a sobra de cada novelo "a pesar" (balança + embalagem, ou "acabou"); o fio ganha as
  gramas (antes − sobra, ÷ peças) e o novelo fica com o peso da sobra. Sem pesar todos, "Concluir" fica travado.
  Fio de novelo excluído não trava: não pesa nem desconta, e pode ser trocado ou tirado.
- **Receita**: link colado (ex.: PDF no Google Drive; acha o link mesmo com texto junto). Cartão "Abrir receita"
  abre fora do app (no app do Drive, já logado). Sem prévia do PDF: os arquivos ficam privados no Drive.
- **Anotações**: texto livre no detalhe, salvo enquanto se digita; sincroniza com os outros aparelhos.
- "Concluir projeto" → folha com os fios "a pesar" no topo (sobra, conta da embalagem, "usou X g · fica Y g") e os fios
  por gramas embaixo ("fica Y g"); **um** interruptor "Atualizar o estoque" vale para todos. Pausa o crono se estiver
  rodando. "Desfazer" no aviso reabre e devolve o estoque. O desconto sai do novelo físico do fio; se ele não der,
  dos abertos (o mais leve primeiro) e por último dos fechados.
- "Reabrir projeto" (e o "Desfazer") → oferece devolver ao estoque o que foi descontado, a cada novelo físico (o que
  tinha acabado volta com o mesmo número; a sobra que tinha entrado como novelo novo sai). Os fios voltam a ser como
  eram antes de concluir (`fiosAntesDeConcluir`): os "a pesar" voltam a ser pesados no fim.
- **Quanto fio preciso?** No projeto em andamento, abaixo dos fios: "Tem fio para as N peças" ou, por novelo,
  quanto precisa (por peça × peças), quanto tem, quanto falta e quantos novelos comprar. Fios manuais ficam de fora.
- **Fazer de novo** (menu ⋮, e botão no projeto concluído): escolhe as peças, mostra a conferência do estoque e cria
  um projeto novo com nome, tipo, agulha, capa, receita, anotações e fios por peça; cronômetro zerado. Se o original tinha cálculo, o novo
  começa com um cálculo em andamento com os mesmos fios (as gramas já pesadas no projeto, sem o novelo físico nem o
  "a pesar" do antigo; preço atual do novelo), outros custos, valor/hora e margem.
- Excluir com "desfazer". Sessões de projetos excluídos não entram nas contas.

### Novelos
- Novelo = **tipo** (digitado, ex.: Amigurumi, Chenille, Balloon Amigo) + **cor** + **marca**.
  Por extenso, o nome é **tipo + cor** ("Chenille Rosa Chá").
- Lista "Meus novelos" ("N fios · X g"; cada grupo também "N fios · X g"; cada bloco "2 novelos · 200 g"), busca sem
  acento (cor, marca, tipo; a mesma busca na folha de escolher fio),
  agrupar **por tipo → marca** (padrão) ou **por marca → tipo** (preferência lembrada). Dentro de cada grupo,
  os novelos usados em mais projetos vêm primeiro. Sem filtro "acabando". Grupos ignoram maiúsculas e acentos
  ("chenille" = "Chenille"); ao sair do campo, o tipo/marca digitado vira a grafia que já existe.
- **Cada novelo é único**: o cadastro (tipo + cor + marca, gramatura, preço, capa) guarda os novelos físicos
  (**#1, #2…**, número fixo), cada um com o seu peso e "fechado"/"aberto". O estoque é a soma. O número de um novelo
  que acabou nunca volta a ser usado (`ultimoNumero` no cadastro).
- Detalhe: total em gramas e a lista dos novelos (#n, fechado/aberto, "em uso: Projeto", peso). Tocar num novelo
  → pesar de novo (foco direto no campo; "87 g → 64 g (−23 g)") ou "este novelo acabou". "+ Fechado (50 g)" e
  "+ Aberto (pesar)" acrescentam (mesma ordem e nomes do formulário). Novelo em uso num fio por gramas avisa que
  repesar e concluir desconta duas vezes (com atalho para o projeto).
  Tudo com desfazer. Ficha (gramatura, agulha, lote, preço, preço/grama); usado em projetos; menu ⋮ Editar/Excluir.
  Mudar a gramatura no cadastro muda o peso dos fechados.
- Formulário, nesta ordem: tipo · cor (foco no tipo), marca, gramatura · preço, **estoque** (só na criação), **cor da
  capa** (obrigatória: paleta sempre à vista, ou uma foto; textura **liso / brilho / felpudo**); lote e agulha em
  "Mais detalhes". O erro de campo obrigatório só aparece ao tentar salvar. O cadastro rápido dentro da folha de fio
  segue as mesmas regras (preço opcional, aviso de repetido com "usar este").
- **Marca automática**: ao digitar tipo/cor, a marca vazia é preenchida com a do novelo de mesmo tipo + cor, ou a
  mais usada no tipo. Se tipo + cor + marca já existem: "Você já tem esse novelo" com atalho para ele.
- **Estoque sempre em gramas** ("1.240 g"), nunca "2 novelos + 40 g".
- **Combinar fios**: botão "Combinar" ao lado de Por tipo/Por marca → toca em até **3** novelos (número da ordem
  no canto) → "Ver lado a lado". A tela mostra as capas em faixas encostadas (foto ou cor + textura), com cor,
  tipo · marca e estoque embaixo; ‹ › reordena, × tira (fica no mínimo 1), "Adicionar fio" abre a lista com busca.
  A combinação fica só no endereço (`#/novelos/combinar/a,b,c`), não é salva.

### Peso da embalagem do novelo
- Configurações → **Embalagem dos novelos**: um peso (g, aceita decimal) por tipo de novelo; a lista mostra os tipos
  já usados. Sincroniza (uma config por tipo, `embalagem.<tipo sem acento>`). Também dá para cadastrar no próprio lugar
  onde se pesa ("pesou com a embalagem? descontar o peso dela"), inclusive no primeiro novelo de um tipo.
- Não confundir com a **embalagem de envio** (aba Calcular → Embalagem, e o custo dela na Shopee).
- A **gramatura** é a linha que vem no novelo; a embalagem nunca entra nela.
- **Estoque do cadastro**: começa vazio. **Fechados** num contador ("Fechados [−] 2 [+] · #1 a #2 · 50 g cada", contam
  a gramatura, sem balança e sem embalagem) e uma linha por **aberto** ("#3 · __ g", o que a balança mostrou; o app
  tira uma embalagem por aberto). Ex.: 50 g de linha, embalagem 15 g, dois fechados e um aberto de 40 g →
  "2 fechados × 50 g + 40 g − 15 g" = 125 g. "Pesei com embalagem" vem ligado e só aparece com aberto e peso
  cadastrado para o tipo.
- "Pesei o que sobrou": o peso de antes aparece como informação (do estoque, já sem embalagem; sem novelo físico, um
  fechado); o único campo é "Sobrou, na balança", que perde a embalagem. "pesei o antes também" abre o campo de antes
  (na balança), e aí a embalagem sai das duas pesagens.

### Foto (projetos e novelos)
- Uma foto por projeto e por novelo ("Adicionar foto" → câmera ou galeria; "Trocar"; "Ajustar"; "Tirar").
  Com foto, ela é a capa em todo lugar (listas, topo do detalhe, calculadora); a cor fica guardada e volta sem a foto.
- **Editor de corte 4:3** (tela cheia): arrastar posiciona, dois dedos / barra de zoom aproximam (até 4×), botão gira
  90°. "Ajustar" reabre a foto atual no editor (o recorte vira uma foto nova). Topo do detalhe em 4:3.
- **Ver a foto**: tocar na capa com foto (topo do detalhe do projeto/novelo ou prévia no formulário) abre a foto
  inteira em tela cheia; toque em qualquer lugar, ✕ ou Esc fecha.
- Foto final: JPEG até 1200 × 900 px (~150–250 KB), guardada no aparelho, na tabela `fotos`, fora do pacote.
- Sincronização: cada foto é um arquivo `fotos/<id>.jpg` no repositório privado, enviado antes do `dados.json`;
  os outros aparelhos baixam quando a foto aparece na tela. Uma foto nunca muda (trocar = foto nova); fotos
  substituídas ficam no repositório (não são apagadas, pois "Fazer de novo" pode reaproveitar a mesma).
- O backup em arquivo (Exportar) não leva as fotos.

### Cor da capa (projetos e novelos)
- Seletor do próprio app (não o do celular): paleta de 36 tons de fio + ajuste fino de tom, intensidade e claridade.
  Nos novelos a paleta fica sempre à vista (faixa que rola de lado) e a cor é obrigatória; sem escolher, não salva.
  Fios claros ganham um contorno fino nas capas pequenas.
- Texturas dos novelos: **brilho** = estrelinhas e pontinhos de glitter; **felpudo** = bolinhas macias de pelúcia.
  Desenhos gerados por `scripts/gerar-texturas.py`.

### Configurações (engrenagem na Início)
- Nome ("Oi, Bruna"), valor/hora padrão, margem padrão, embalagem dos novelos.
- Sincronização GitHub: repositório (`usuario/crochezinho-data` ou URL) + token fine-grained.
  Recusa repositório **público**. Status (verde/erro, "sincronizado há X"), "Sincronizar agora", "Desconectar".
  Automática: ao abrir, ao sair/voltar para o app e quando a internet volta (no máximo a cada 20 s).
- Backup: Exportar (`crochezinho-backup-AAAA-MM-DD.json`) e Importar (junta, não apaga). "Último backup: há X".
  O texto diz que as fotos não vão no arquivo.
- **Apagar projetos e novelos**: folha com dois interruptores (Projetos, com sessões e cálculos; Novelos), atalho
  para exportar backup e "Desfazer" no aviso. Marca como excluído (vai para os outros aparelhos pela sincronização).
  Configurações (nome, valor/hora, margem, GitHub) não são apagadas.
- Instalar: passo a passo no iPhone; botão "Instalar app" no Android.
- Rodapé: versão e se o navegador protegeu os dados contra limpeza.
- Início mostra um lembrete quando não há sincronização e o último backup tem mais de 14 dias
  (ou nunca houve), ou quando a sincronização falhou.

### Sincronização — detalhes
- Arquivo `dados.json` no repositório privado (API Contents do GitHub), com projetos, sessões, novelos
  (incluindo excluídos, marcados com `excluidoEm`) e as configs `nome`, `valorHoraCentavos`, `margemPct`
  e `embalagem.*`.
- Mesclagem por registro: vence o `atualizadoEm` mais recente. Exclusões não ressuscitam.
- Token, rascunhos da calculadora e preferências de tela **ficam só no aparelho**.
- Conflito (outro aparelho gravou no meio): relê, mescla e tenta de novo (até 3 vezes).
- Acima de 1 MB a API Contents não manda o arquivo: o app lê pelo blob (`/git/blobs/<sha>`, até 100 MB).
- Fotos que nenhum projeto/novelo usa saem do aparelho (só do aparelho; no GitHub ficam): depois de sincronizar e ao
  abrir o app. As nunca enviadas esperam 1 dia, e as de um item excluído (que ainda pode voltar) ficam.

### Voltar do celular
- Folhas, ver foto e editor de foto entram no histórico: o "voltar" do Android fecha a folha em vez de sair da tela.
  Fechar por botão tira a entrada do histórico; navegar logo depois de fechar espera a saída da folha (fila no
  `router.ts`), para o "voltar" atrasado não desfazer a navegação.

## Fora do escopo
Contador de carreiras/pontos e metas, conquistas, retrospectiva, ganhos, Nuvemshop, lista de compras,
perfil com foto/bio, notificações push, anexo/prévia do PDF da receita (só o link), cartão de visita.

## Modelo de dados
Ver `src/db/types.ts` e `src/db/db.ts`. IDs UUID, dinheiro em centavos, datas em ms.
Versão 2 do banco e do pacote de sincronização: novelo com `tipo`/`textura` (sem `linha`, `familia`, `fibra`,
`metros`), projeto com `quantidade`, fio do cálculo com `valorCentavos` (manual). Dados antigos são convertidos
ao abrir o app e ao receber de outro aparelho ou backup (`src/domain/migracao.ts`). Banco v6 / pacote 3: novelo com `unidades` (o estoque antigo vira fechados pela gramatura + um aberto com o resto,
com ids `<novelo>-u<n>` iguais em todo aparelho); fio com `unidadeId`, `aPesar`, `antesG`. Banco v5: projeto com
`anotacoes` e `receitaUrl` ("" quando vazios). Campos opcionais (sem mudar banco nem pacote): `Novelo.ultimoNumero`,
`Projeto.fiosAntesDeConcluir`, `FioDescontado.criada`.
