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
- Fio com **valor manual**: nome opcional + R$ por peça. Não mexe no estoque.
- Horas em **h + min**, preenchidas com o tempo do cronômetro quando há projeto (editável).
- Valor/hora e margem vêm do padrão (Configurações), com "só neste cálculo".
- Margem aplicada sobre fios + trabalho + outros (texto explícito na tela).
- Outros custos (nome + valor).
- Total fixo no topo ao rolar. Barra de composição com cores distintas e valores escritos.
- **Sem arredondamento** do preço.
- Avulso: "Copiar valor" e "Criar projeto com este cálculo". Sem histórico de orçamentos.
- Ligado a projeto: "Salvar no projeto"; o projeto mostra a data do cálculo e avisa se o tempo mudou desde então.
- "Quanto sobra vendendo na Shopee?" leva o preço por peça e o custo por peça (sem o lucro) para a aba Shopee.

#### Shopee (portada do magamalabares, regras de nov/2026)
- Vendedor CPF. Preço de venda e custo (opcional) → **você recebe**, lucro e margem.
- Taxas detalhadas em "Ver as taxas"; itens no pedido, embalagem, +450 pedidos e campanha em "Ajustes".
- Avisos: prejuízo, degrau da taxa fixa (R$ 80/100/200) com o preço de equilíbrio, sugestão de kit
  para produto barato, notas do adicional regressivo e do Pix.
- Regras em `src/domain/vendas/shopee.ts`. Quando a Shopee mudar, atualizar aqui **e** no magamalabares.

#### Embalagem (portada do magamalabares)
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
  (abre a calculadora do projeto), fios usados (editados pela calculadora), menu ⋮ com Editar/Excluir.
- **Receita**: link colado (ex.: PDF no Google Drive; acha o link mesmo com texto junto). Cartão "Abrir receita"
  abre fora do app (no app do Drive, já logado). Sem prévia do PDF: os arquivos ficam privados no Drive.
- **Anotações**: texto livre no detalhe, salvo enquanto se digita; sincroniza com os outros aparelhos.
- "Concluir projeto" → folha com o que sai de cada novelo (gramas por peça × peças) e o que fica; interruptor para não descontar;
  pausa o crono se estiver rodando. "Desfazer" no aviso reabre e devolve o estoque.
- "Reabrir projeto" → oferece devolver ao estoque o que foi descontado.
- **Quanto fio preciso?** No projeto em andamento, abaixo dos fios: "Tem fio para as N peças" ou, por novelo,
  quanto precisa (por peça × peças), quanto tem, quanto falta e quantos novelos comprar. Fios manuais ficam de fora.
- **Fazer de novo** (menu ⋮, e botão no projeto concluído): escolhe as peças, mostra a conferência do estoque e cria
  um projeto novo com nome, tipo, agulha, capa, receita, anotações e fios por peça; cronômetro zerado. Se o original tinha cálculo, o novo
  começa com um cálculo em andamento com os mesmos fios (preço atual do novelo), outros custos, valor/hora e margem.
- Excluir com "desfazer". Sessões de projetos excluídos não entram nas contas.

### Novelos
- Novelo = **tipo** (digitado, ex.: Amigurumi, Chenille, Balloon Amigo) + **cor** + **marca**.
  Por extenso, o nome é **tipo + cor** ("Chenille Rosa Chá").
- Lista "Meus novelos" (cores · gramas), busca sem acento (cor, marca, tipo),
  agrupar **por tipo → marca** (padrão) ou **por marca → tipo** (preferência lembrada). Dentro de cada grupo,
  os novelos usados em mais projetos vêm primeiro. Sem filtro "acabando". Grupos ignoram maiúsculas e acentos
  ("chenille" = "Chenille"); ao sair do campo, o tipo/marca digitado vira a grafia que já existe.
- Detalhe: estoque em gramas com − / + (uma gramatura por toque) e "ajustar estoque" (pesagem um por um, ver
  abaixo; o total substitui o estoque; "acabou, zerar estoque"; desfazer); ficha (gramatura, agulha, lote, preço, preço/grama); usado em projetos;
  menu ⋮ Editar/Excluir (com desfazer).
- Formulário: tipo e marca (sugerem os já digitados), cor, gramatura, preço, capa (cor + textura
  **liso / brilho / felpudo**); lote e agulha em "Mais detalhes". Estoque inicial só na criação (pesagem um por um).
- **Marca automática**: ao digitar tipo/cor, a marca vazia é preenchida com a do novelo de mesmo tipo + cor, ou a
  mais usada no tipo. Se tipo + cor + marca já existem: "Você já tem esse novelo" com atalho para ele.
- **Estoque sempre em gramas** ("1.240 g"), nunca "2 novelos + 40 g".

### Peso da embalagem
- Configurações → **Embalagens**: um peso (g, aceita decimal) por tipo de novelo; a lista mostra os tipos já usados.
  Sincroniza (uma config por tipo, `embalagem.<tipo sem acento>`).
- **Pesagem um por um** (cadastro do novelo e "Ajustar estoque"): cada linha é um novelo, com o peso que a balança
  mostrou (com embalagem). "+ Outro novelo" abre uma linha vazia; "+ Fechado (65 g)" já preenche gramatura + embalagem,
  para não precisar pesar novelo fechado. Estoque = soma − uma embalagem por linha preenchida
  ("170 g − 3 × 15 g" = 125 g). "Pesei com embalagem" vem ligado (só aparece se o tipo tiver peso cadastrado).
- Calculadora, "Pesei o que sobrou": desconta a embalagem do que sobrou; se "pesava antes" for digitado, desconta dele
  também (o valor padrão é a gramatura do rótulo, já sem embalagem).

### Foto (projetos e novelos)
- Uma foto por projeto e por novelo ("Adicionar foto" → câmera ou galeria; "Trocar"; "Ajustar"; "Tirar").
  Com foto, ela é a capa em todo lugar (listas, topo do detalhe, calculadora); a cor fica guardada e volta sem a foto.
- **Editor de corte 4:3** (tela cheia): arrastar posiciona, dois dedos / barra de zoom aproximam (até 4×), botão gira
  90°. "Ajustar" reabre a foto atual no editor (o recorte vira uma foto nova). Topo do detalhe em 4:3.
- Foto final: JPEG até 1200 × 900 px (~150–250 KB), guardada no aparelho, na tabela `fotos`, fora do pacote.
- Sincronização: cada foto é um arquivo `fotos/<id>.jpg` no repositório privado, enviado antes do `dados.json`;
  os outros aparelhos baixam quando a foto aparece na tela. Uma foto nunca muda (trocar = foto nova); fotos
  substituídas ficam no repositório (não são apagadas, pois "Fazer de novo" pode reaproveitar a mesma).
- O backup em arquivo (Exportar) não leva as fotos.

### Cor da capa (projetos e novelos)
- Seletor do próprio app (não o do celular): paleta de 36 tons de fio + ajuste fino de tom, intensidade e claridade.
- Texturas dos novelos: **brilho** = estrelinhas e pontinhos de glitter; **felpudo** = bolinhas macias de pelúcia.
  Desenhos gerados por `scripts/gerar-texturas.py`.

### Configurações (engrenagem na Início)
- Nome ("Oi, Bruna"), valor/hora padrão, margem padrão, pesos das embalagens.
- Sincronização GitHub: repositório (`usuario/crochezinho-data` ou URL) + token fine-grained.
  Recusa repositório **público**. Status (verde/erro, "sincronizado há X"), "Sincronizar agora", "Desconectar".
  Automática: ao abrir, ao sair/voltar para o app e quando a internet volta (no máximo a cada 20 s).
- Backup: Exportar (`crochezinho-backup-AAAA-MM-DD.json`) e Importar (junta, não apaga). "Último backup: há X".
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

## Fora do escopo
Contador de carreiras/pontos e metas, conquistas, retrospectiva, ganhos, Nuvemshop, lista de compras,
perfil com foto/bio, notificações push, anexo/prévia do PDF da receita (só o link), cartão de visita.

## Modelo de dados
Ver `src/db/types.ts` e `src/db/db.ts`. IDs UUID, dinheiro em centavos, datas em ms.
Versão 2 do banco e do pacote de sincronização: novelo com `tipo`/`textura` (sem `linha`, `familia`, `fibra`,
`metros`), projeto com `quantidade`, fio do cálculo com `valorCentavos` (manual). Dados antigos são convertidos
ao abrir o app e ao receber de outro aparelho ou backup (`src/domain/migracao.ts`). Banco v5: projeto com
`anotacoes` e `receitaUrl` ("" quando vazios).
