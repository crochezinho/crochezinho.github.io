import { Fragment, type ComponentChildren } from 'preact';
import { href, voltar } from '../../app/router.ts';
import { Icone } from '../../components/Icone.tsx';
import { REGRAS_SHOPEE_EM, SHOPEE, calcShopee, degrausShopee, equilibrioShopee } from '../../domain/vendas/shopee.ts';

const PESQUISA_EM = 'nov/2026';

const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number) => (v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';

interface Fonte {
  nome: string;
  url: string;
}
interface Dica {
  titulo: string;
  texto: ComponentChildren;
  fontes?: Fonte[];
}
const yt = (canal: string, id: string): Fonte => ({ nome: `${canal} (YouTube)`, url: `https://www.youtube.com/watch?v=${id}` });

interface Secao {
  titulo: string;
  resumo: string;
  dicas: Dica[];
}

const F = {
  yav: { nome: 'YAV', url: 'https://yav.com.br/blog/shopee-comissao-fixa-faixa-de-preco/' },
  vini: { nome: 'Vini Ensina', url: 'https://viniensina.com.br/?p=4619' },
  vendedorLucrativo: { nome: 'Vendedor Lucrativo', url: 'https://vendedorlucrativo.com.br/blog/taxa-shopee-vendedor' },
  irroba: { nome: 'Irroba', url: 'https://blog.irroba.com.br/novas-taxas-shopee-2026-guia-de-comissoes-e-frete/' },
  precisao: { nome: 'Precisão Financeira', url: 'https://www.precisaofinanceira.com.br/blog/frete-gratis-obrigatorio-shopee-2026-impacto-margem' },
  goSmarterRepasse: { nome: 'GoSmarter', url: 'https://gosmarter.com.br/repasse-shopee-ciclo-pagamento/' },
  portalDuvidas: { nome: 'Portal Dúvidas', url: 'https://portalduvidas.com.br/quanto-tempo-demora-o-saque-da-shopee-tire-suas-duvidas/' },
  serasa: { nome: 'Serasa', url: 'https://www.serasa.com.br/blog/como-vender-na-shopee-guia-completo-para-lojistas/' },
  tactusAfiliados: { nome: 'Tactus', url: 'https://tactus.com.br/comissao-de-afiliado-shopee/amp/' },
  vireiVendedor: { nome: 'Virei Vendedor', url: 'https://vireivendedor.com.br/blog/faixas-comissao-shopee-marco-2026/' },
  sebrae: {
    nome: 'Sebrae, Precificação no artesanato',
    url: 'https://bibliotecas.sebrae.com.br/chronus/ARQUIVOS_CHRONUS/bds/bds.nsf/236d0680ce055b899a9a5559ee90de47/$File/4870.pdf'
  },
  correio: {
    nome: 'Correio Braziliense',
    url: 'https://www.correiobraziliense.com.br/cbradar/quanto-cobrar-por-uma-peca-de-croche-a-conta-com-material-horas-e-acabamento-para-nao-trabalhar-no-prejuizo/'
  },
  cursa: { nome: 'Cursa.app', url: 'https://cursa.app/pt/pagina/portfolio-e-precificacao-para-marketplace-margem-real-com-comissoes-e-campanhas' },
  zen: { nome: 'Contabilidade Zen', url: 'https://www.contabilidadezen.com.br/blog/precificacao-para-marketplace-2026/' },
  sebraePr3: {
    nome: 'Sebrae PR (comunidade)',
    url: 'https://sebraepr.com.br/comunidade/artigo/precificacao-para-artesanato-3-erros-que-podem-estar-diminuindo-seu-lucro-no-croche'
  },
  circulo: { nome: 'Círculo', url: 'https://www.circulo.com.br/post/precificacao-aprenda-a-calcular-quanto-cobrar-por-cada-peca' },
  brasiarte: { nome: 'BrasiArte', url: 'https://brasiarte.com.br/blog/como-vender-amigurumi' },
  crocheArte: { nome: 'Crochê Uma Arte', url: 'https://crocheumaarte.com.br/calcular-o-preco-de-um-amigurumi/' },
  amamos: { nome: 'Amamos Artes Manuais', url: 'https://amamosartesmanuais.com.br/como-precificar-amigurumi/' },
  ebook: {
    nome: 'Shopee, e-book Boas práticas',
    url: 'https://deo.shopeemobile.com/shopee/cms_cdn_bucket/aaf8761cae2f4dd292e2440c635ed836_E-book%20Boas%20pr%C3%A1ticas%20para%20cria%C3%A7%C3%A3o%20de%20an%C3%BAncios%20na%20Shopee%20(4).pdf'
  },
  duvidas: { nome: 'Shopee, Principais dúvidas', url: 'https://seller.br.shopee.cn/edu/article/8902' },
  video: { nome: 'Shopee, vídeo', url: 'https://seller.br.shopee.cn/edu/article/18658' },
  otimizador: { nome: 'Shopee, Otimizando anúncios', url: 'https://seller.br.shopee.cn/edu/article/21806/Otimizando-seus-anuncios' },
  webinar: {
    nome: 'Shopee, webinar Pontos de Penalidade (2021)',
    url: 'https://deo.shopeemobile.com/shopee/cms_cdn_bucket/a599ad384dbf408f822eff2d6ae6671f_Pontos%20de%20Penalidade%20-%20Como%20Garantir%20a%20Excel%C3%AAncia%20da%20sua%20Loja.pdf'
  },
  agenciaSebrae: {
    nome: 'Agência Sebrae',
    url: 'https://agenciasebrae.com.br/cultura-empreendedora/vendas-em-marketplaces-destaque-seu-negocio-com-as-dicas-do-sebrae/'
  },
  faqEnvio: {
    nome: 'Shopee, FAQ Envio',
    url: 'https://help.shopee.com.br/4/article/76332-%5BFAQ%5D-Sobre-os-servi%C3%A7os-de-Envio-e-Entrega-da-Shopee'
  },
  agencia: {
    nome: 'Shopee, Agência Shopee',
    url: 'https://help.shopee.com.br/portal/4/article/198296-Qual-tamanho-e-peso-de-pacotes-permitidos-pela-Ag%C3%AAncia-Shopee'
  },
  manualEmbalagem: {
    nome: 'Sebrae, manual de embalagem',
    url: 'https://sebrae.com.br/sites/PortalSebrae/artigos/manual-de-boas-praticas-para-embalagem-de-artesanato,1469d53342603410VgnVCM100000b272010aRCRD?origem=segmento&codSegmento=3'
  },
  prazo: { nome: 'E-Commerce Brasil', url: 'https://www.ecommercebrasil.com.br/noticias/shopee-muda-prazo-de-envio-para-vendedores-de-2-dias-uteis-para-1-dia-util' },
  bling: { nome: 'Bling', url: 'https://blog.bling.com.br/prazo-de-envio-shopee/' },
  preEncomenda: { nome: 'Shopee, pré-encomenda', url: 'https://seller.shopee.com.br/edu/article/18878/o-que-e-um-anuncio-pre-encomenda' },
  reclamePre: { nome: 'Reclame Aqui', url: 'https://www.reclameaqui.com.br/shopee/limite-de-produtos-pre-encomenda_xnBbzcGIDJ1qxNR9/' },
  tea: { nome: 'Shopee, Taxa de Envio Atrasado', url: 'https://seller.br.shopee.cn/edu/article/2805' },
  tne: { nome: 'Shopee, Taxa de Não Envio', url: 'https://seller.shopee.com.br/edu/article/3280/o-que-e-a-taxa-de-nao-cumprimento' },
  gobots: { nome: 'GoBots', url: 'https://gobots.ai/blog/pontos-de-penalidade-shopee/' },
  migalhas: { nome: 'Migalhas', url: 'https://www.migalhas.com.br/quentes/466373/shopee-nao-pode-punir-loja-por-atraso-de-transportadora' },
  chat: { nome: 'Reclame Aqui (resposta da Shopee)', url: 'https://www.reclameaqui.com.br/shopee/taxa-de-respostas_yPBDU4sMMsD30u2-/' },
  avaliacao: {
    nome: 'Shopee, avaliações',
    url: 'https://help.shopee.com.br/portal/4/article/76377-[Avalia%C3%A7%C3%A3o-do-Produto]-Quando-e-como-avalio-os-vendedores'
  },
  responder: { nome: 'Shopee, responder avaliações', url: 'https://seller.shopee.com.br/edu/article/2789/como-verificar-e-responder-classificacoes-e-avaliacoes' },
  premio: { nome: 'Shopee, Prêmio de Avaliação', url: 'https://seller.br.shopee.cn/edu/article/18591' },
  cdc: { nome: 'CDC (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm' },
  decreto: { nome: 'Decreto 7.962/2013', url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm' },
  pi: {
    nome: 'Shopee, propriedade intelectual',
    url: 'https://help.shopee.com.br/portal/4/article/145692-[Seguran%C3%A7a-do-Pedido]-Como-proteger-os-seus-direitos-de-Propriedade-Intelectual'
  },
  piLoja: { nome: 'Shopee, violações de PI', url: 'https://seller.shopee.com.br/edu/article/21039/evitando-violacoes-dos-direitos-de-propriedade-intelectual' },
  canaltech: { nome: 'Canaltech', url: 'https://canaltech.com.br/series/disney-declara-guerra-contra-bonecos-falsificados-do-bebe-yoda-160378/' },
  cnae: { nome: 'Tabelas Fiscais', url: 'https://tabelasfiscais.com.br/cnae/1422300' },
  contabilizei: { nome: 'Contabilizei', url: 'https://www.contabilizei.com.br/contabilidade-online/calculo-mei-simples-nacional/' },
  goias: { nome: 'Governo de Goiás', url: 'https://goias.gov.br/industriaecomercio/?p=4025' },
  tjms: { nome: 'TJMS (via Modelo Inicial)', url: 'https://modeloinicial.com.br/peticao/11322262/indenizatoria-direito-arrependimento-produtos-personalizados' },
  luv: yt('LuvandCrafts', 'gxldkc5i05w'),
  fabiana: yt('Crochetaria e Amigurumis', 'HGZGAwcLejQ'),
  crocheECia: yt('Crochê e Cia', 'b71Zgpzn4oE'),
  bruxas: yt('Bruxas do Bem', 'vDtm7VhMj08'),
  isa: yt('Isa Monteiro', 'jA-Y5vPJdOU'),
  andreia: yt('Andréia Torres', 'kLcj0Hawc7U'),
  noeli: yt('Noeli Crochês', 'tiXFbo3ZJcw'),
  eleni: yt('Eleni', 'pUjMGbpytjo'),
  luana: yt('Luana Souza', '3531smnJX1k'),
  lunaris: yt('Lunaris', 'dpMXTDCIKN0'),
  danny: yt('Fio e Magia da Danny', 'y0rOtiUSN-0'),
  danny2: yt('Fio e Magia da Danny', 'yCKLpR-CG8g'),
  nathalia: yt('Nathália Esteves', 'LSuGJsziUBc'),
  tais: yt('Taís Barbosa', 'dVAOoMknQXo'),
  talita: yt('Talita Daitx', '13hMBh069HY'),
  flavia: yt('Crochê de A a Z', 'UGQ0E0Ic6X8'),
  fabicriart: yt('Fabicriart', 'c6cRV9Qu9l4'),
  lucelia: yt('Lucélia Silva', 'EbgzwsJQd9w'),
  viverArt: yt('Viver de Artesanato', '0oVuwIW1nN0'),
  raquel: yt('Raquel Dayo', 'mD0C4cW5odc'),
  lily: { nome: '@fofuxos_da_lily (Threads)', url: 'https://www.threads.com/@fofuxos_da_lily/post/C9SIg64uDzM' },
  hbriela: {
    nome: '@hbriela.croche (Threads)',
    url: 'https://www.threads.com/@hbriela.croche/post/DGb6WLTNwFG/gente-eu-estou-abismada-abri-uma-loja-na-shopee-e-fui-ver-sobre-as-taxas-para-ve'
  },
  lia: { nome: '@liamaria_croche (Threads)', url: 'https://www.threads.com/@liamaria_croche/post/DYkHKtfkXC_/meu-deus-como-e-complicado-cadastrar-artesanato-na-shopee/' },
  kleu: {
    nome: 'Kleu Artesanato',
    url: 'https://kleuartesanato.com.br/guia-completo-como-embalar-e-enviar-seu-croche-com-seguranca-economia-e-estilo/'
  },
  raCategoria: {
    nome: 'Reclame Aqui',
    url: 'https://www.reclameaqui.com.br/shopee/impossibilidade-de-cadastrar-produtos-artesanais-sob-encomenda-na-categoria_FIQAP40B5u7gtz_b/'
  },
  raApagado: { nome: 'Reclame Aqui', url: 'https://www.reclameaqui.com.br/shopee/anuncio-deletado_duD8np3Lf98U9evy/' },
  anuncioSanta: { nome: 'Shopee, anúncio 20 cm', url: 'https://shopee.com.br/Nossa-Senhora-Aparecida-20-cm-em-amigurumi-croch%C3%AA-i.380048315.22493166437' },
  anuncioBoneca: { nome: 'Shopee, anúncio 30 cm', url: 'https://shopee.com.br/Boneca-Negra-Amigurumi-croch%C3%AA-macac%C3%A3o-30cm-i.244064669.9785303071' },
  anuncioKit: { nome: 'Shopee, anúncio kit', url: 'https://shopee.com.br/amp/Kit-bichinhos-para-nicho-amigurumi-(em-croch%C3%AA)-i.463329612.4995819518' },
  mlBonecas: { nome: 'Mercado Livre', url: 'https://lista.mercadolivre.com.br/boneca-amigurumi' },
  elo7Coruja: { nome: 'Elo7', url: 'https://www.elo7.com.br/coruja-de-crochet-amigurumi/dp/17A51C3' },
  sebraeFotos: {
    nome: 'Sebrae, vender artesanato pela internet',
    url: 'https://sebrae.com.br/sites/PortalSebrae/arquivos/venda-de-artesanato-pela-internet,405b347ea5b13410VgnVCM100000b272010aRCRD'
  }
} satisfies Record<string, Fonte>;

function linhasTaxas() {
  const fx = SHOPEE.faixas;
  return fx.map((f, i) => {
    const prox = fx[i + 1]?.min;
    const faixa = i === 0 ? `Abaixo de ${reais(prox)}` : prox == null ? `A partir de ${reais(f.min)}` : `${reais(f.min)} a ${reais(prox - 0.01)}`;
    const taxa = `${pct(f.pct)} + ${f.fixa === 'metade' ? 'metade do preço' : reais(f.fixa)}`;
    return { faixa, taxa };
  });
}

function secoes(): Secao[] {
  const primeiroDegrau = degrausShopee()[0];
  const eq = equilibrioShopee(primeiroDegrau, {});
  const noDegrau = calcShopee({ preco: primeiroDegrau }).item;
  const faixaBaixa = SHOPEE.faixas[1];

  return [
    {
      titulo: 'Só para amigurumi',
      resumo: 'O que muda quando a peça é um bichinho de crochê',
      dicas: [
        {
          titulo: 'O tempo pesa mais que o fio',
          texto: (
            <p>
              Amigurumi gasta pouco fio e muitas horas, então a mão de obra domina o preço. No exemplo de um urso (4 h a R$ 20/h), os R$ 80 de trabalho são mais de
              dois terços dos R$ 114,45 de custo. Cronometre do início ao fim, incluindo costura e acabamento: o cronômetro do app serve para isso.
            </p>
          ),
          fontes: [F.crocheArte, F.brasiarte]
        },
        {
          titulo: 'Os materiais que somem da conta',
          texto: (
            <p>
              Além do fio: enchimento, olhos de segurança, botões, cola, marcadores e o desgaste das agulhas. Na embalagem: caixa, papel de seda, etiqueta e
              cartão. Conte só o fio que a peça usou, não o novelo inteiro.
            </p>
          ),
          fontes: [F.sebraePr3, F.correio]
        },
        {
          titulo: 'Tamanho muda tudo',
          texto: (
            <>
              <p>
                Um exemplo ilustrativo, com hora de R$ 15, mostra como o tempo cresce com a peça: chaveiro em 1h30, boneco de 20 cm em 6 h, peça de 40 cm em 12 h.
                Os valores são do autor, não do mercado: use os seus tempos.
              </p>
              <p>
                Chaveiros e minis caem na faixa de preço em que a taxa fixa da Shopee pesa mais (veja "Peças baratas" em Taxas).
              </p>
            </>
          ),
          fontes: [F.amamos]
        },
        {
          titulo: 'Compare com peças parecidas',
          texto: (
            <p>
              Não compare uma boneca cheia de detalhes com um amigurumi simples, feito em poucas horas, nem entre em guerra de preços. Concorrente muito barato
              provavelmente esqueceu de cobrar as próprias horas.
            </p>
          ),
          fontes: [F.amamos, F.brasiarte]
        },
        {
          titulo: 'Foto com escala',
          texto: (
            <p>
              Quem compra online não tem noção do tamanho: fotografe o boneco na mão ou ao lado de um objeto conhecido, além das fotos em fundo branco que a
              Shopee pede. Foto de celular serve, desde que bem feita. Informe também a altura em cm no título e na descrição.
            </p>
          ),
          fontes: [F.brasiarte, F.sebraeFotos, F.ebook]
        },
        {
          titulo: 'Título de amigurumi',
          texto: (
            <p>
              Seguindo o padrão da Shopee (Produto + Marca + Especificação + Tamanho): "Amigurumi Coelho de Crochê [sua loja] 20 cm Algodão". As cores vão nas
              variações.
            </p>
          ),
          fontes: [F.ebook]
        },
        {
          titulo: 'Olhos de segurança: avise o risco',
          texto: (
            <p>
              Olhos e narizes plásticos são peças pequenas. O Código de Defesa do Consumidor obriga a informar riscos à segurança de forma clara, e a loja online
              também precisa mostrá-los no anúncio: avise no anúncio e na etiqueta que a peça tem partes pequenas e não é indicada para menores de 3 anos. Em peças
              pensadas para bebês, bordar olhos e detalhes evita as peças pequenas.
            </p>
          ),
          fontes: [F.cdc, F.decreto]
        },
        {
          titulo: 'Personagens: prefira os seus',
          texto: (
            <p>
              Amigurumi de personagem famoso é o principal risco de remoção por propriedade intelectual — a Disney já derrubou bonecos artesanais do "Bebê
              Yoda". Crie bichinhos autorais e não use nomes de personagem no título, nas tags ou no nome da loja.
            </p>
          ),
          fontes: [F.pi, F.canaltech]
        }
      ]
    },
    {
      titulo: 'Preços na prática',
      resumo: 'O que vendedoras cobram e quanto sobra',
      dicas: [
        {
          titulo: 'O que gira: peças pequenas, em kit',
          texto: (
            <p>
              Nos relatos de quem vende, o amigurumi que sai com frequência na Shopee é pequeno e rápido de fazer — mini corações, flores, chaveiros, gatinhos —,
              em pronta entrega, na faixa de R$ 15 a R$ 40, muitas vezes em kit. Uma vendedora oferece mini corações em variações de 3, 6 e 10 unidades, e o kit
              de 3 é o que mais sai.
            </p>
          ),
          fontes: [F.tais, F.luv, F.fabiana]
        },
        {
          titulo: 'Quanto sobra nas peças baratas',
          texto: (
            <>
              <dl class="ficha">
                <div>
                  <dt>Chaveiro de R$ 35</dt>
                  <dd>sobrou R$ 24</dd>
                </div>
                <div>
                  <dt>Amigurumi de R$ 30</dt>
                  <dd>sobrou ~R$ 20</dd>
                </div>
                <div>
                  <dt>Abelhinha de R$ 15,90</dt>
                  <dd>sobrou R$ 8,15</dd>
                </div>
                <div>
                  <dt>Par de porta-copos de R$ 12,99</dt>
                  <dd>sobrou R$ 5,40</dd>
                </div>
              </dl>
              <p>
                Valores contados pelas próprias vendedoras, antes de material e mão de obra, quase todos com a taxa fixa antiga de R$ 4. Hoje sobra um pouco
                menos: confira o seu preço na aba Shopee.
              </p>
            </>
          ),
          fontes: [F.luv, F.fabiana, F.crocheECia, F.bruxas]
        },
        {
          titulo: 'Peças grandes: quase não há dados',
          texto: (
            <p>
              Só 4 anúncios de amigurumi na Shopee mostraram preço na pesquisa, e apenas por trechos de buscador: chaveiro de personagem a R$ 45, peça de 20 cm sob
              encomenda a R$ 173,90 (R$ 147,82 no Pix), boneca de 30 cm a R$ 171 e kit de 3 ursos de 15 a 25 cm a R$ 195. No Mercado Livre e no Elo7 os preços
              por tamanho ficam na mesma faixa. É pouco para falar em "preço de mercado": não deu para ver quantas unidades cada anúncio vendeu.
            </p>
          ),
          fontes: [F.anuncioSanta, F.anuncioBoneca, F.anuncioKit, F.mlBonecas, F.elo7Coruja]
        },
        {
          titulo: '"A conta não fecha"',
          texto: (
            <p>
              Uma crocheteira conta que leva de 8 a 10 horas para fazer um boneco de 30 cm e questiona anúncios de R$ 100: "desconta material, desconta as taxas
              da Shopee e quanto sobra de lucro?". Outra, ao abrir a loja, ficou "abismada" com as taxas. Fora da Shopee, vendedoras relatam bichos e bonecas de
              R$ 120 a R$ 220 em venda direta.
            </p>
          ),
          fontes: [F.lily, F.hbriela, F.isa, F.andreia]
        },
        {
          titulo: 'Preço maior na Shopee que na venda direta',
          texto: (
            <p>
              Algumas vendedoras cobram mais na Shopee para cobrir a taxa: um kit de flores sai a R$ 21 + frete na venda direta e a R$ 32 na Shopee; um mini
              trilho, a R$ 20 e a R$ 32,90.
            </p>
          ),
          fontes: [F.noeli, F.crocheECia]
        },
        {
          titulo: '"Preço − 20% − R$ 4" ficou velho',
          texto: (
            <p>
              É a conta de cabeça ensinada em vários vídeos. Desde 01/10/2026 a taxa fixa da primeira faixa é {reais(faixaBaixa.fixa as number)}, e a partir de{' '}
              {reais(primeiroDegrau)} a tabela muda: uma peça de {reais(primeiroDegrau)} deixa {reais(noDegrau.recebe)}, não R$ 60. Use a aba Shopee em vez da
              conta de cabeça.
            </p>
          ),
          fontes: [F.noeli, F.bruxas, F.yav]
        }
      ]
    },
    {
      titulo: 'O que as vendedoras ensinam',
      resumo: 'Dicas repetidas em vídeos e posts',
      dicas: [
        {
          titulo: 'Monte kits',
          texto: (
            <p>
              É a dica mais repetida: o kit paga a taxa fixa uma vez só. "Não coloca um tapete. Coloca um kitzinho, três tapetes por tanto." Uma vendedora nem deixa
              opção de compra avulsa "por causa daquela taxa". Item avulso muito barato quase não deixa nada.
            </p>
          ),
          fontes: [F.eleni, F.luv, F.tais, F.crocheECia]
        },
        {
          titulo: 'Use o Impulsionar',
          texto: (
            <p>
              O botão gratuito Impulsionar destaca 5 produtos por 4 horas. Várias vendedoras impulsionam todo dia — uma até punha despertador. Outra diz que, sem
              impulsionar, "demora a sair pedido".
            </p>
          ),
          fontes: [F.danny, F.tais, F.talita]
        },
        {
          titulo: 'Foto própria, vídeo e medidas na imagem',
          texto: (
            <p>
              Fotos da sua peça, com luz natural: foto de outra pessoa cria expectativa errada. Segundo uma vendedora, o vídeo "tá vendendo muito mais lá dentro da
              Shopee do que as fotos". E ponha as medidas na própria imagem, porque "tem muita gente que não lê descrição".
            </p>
          ),
          fontes: [F.flavia, F.noeli, F.danny]
        },
        {
          titulo: 'Descrição que evita reclamação',
          texto: (
            <p>
              Uma vendedora montou a descrição lendo as avaliações negativas das concorrentes: medidas, cores, prazo, "escolha as cores no chat", envio na cor crua
              se o comprador não escolher em 24 horas e variação de 2 cm para mais ou para menos.
            </p>
          ),
          fontes: [F.noeli]
        },
        {
          titulo: 'Pronta entrega chama atenção',
          texto: (
            <p>
              Como as bonecas na Shopee costumam estar em pré-venda, ter pronta entrega "já é um diferencial". Quem vende peças pequenas mantém estoque delas.
            </p>
          ),
          fontes: [F.nathalia, F.tais]
        },
        {
          titulo: 'Poste rápido e entre todo dia',
          texto: (
            <p>
              "Se a pessoa compra num dia de tarde, no outro dia tu tem que tá postando." Uma vendedora teve a loja congelada por ficar sem entrar.
            </p>
          ),
          fontes: [F.luv, F.noeli]
        },
        {
          titulo: 'Peso com folga e embalagem leve',
          texto: (
            <p>
              Uma vendedora cadastra o peso com cerca de 100 g de folga, para não pagar diferença de frete. Uma artesã embala a peça em saquinho transparente dentro
              de envelope de segurança, mais leve que caixa, o que barateia o frete.
            </p>
          ),
          fontes: [F.noeli, F.kleu]
        },
        {
          titulo: 'Promoção com folga no preço',
          texto: (
            <p>
              Uma vendedora anuncia a R$ 120–125 o que quer vender a R$ 100 e usa a aba Promoção: 10–12% de desconto nos horários de pico e 50% para item parado.
            </p>
          ),
          fontes: [F.luana]
        },
        {
          titulo: 'Paciência no começo',
          texto: (
            <p>
              Nos relatos, a primeira venda levou de 1 a 3 meses, e os primeiros meses tiveram de zero a 7 vendas. Algumas desistiram; outras dizem que o erro é
              "desistir rápido".
            </p>
          ),
          fontes: [F.nathalia, F.fabiana, F.luv, F.flavia]
        },
        {
          titulo: 'Shopee como vitrine',
          texto: (
            <p>
              Para peças maiores, algumas usam a Shopee como vitrine de confiança: com o link da Shopee, o comprador sabe que "pode reclamar" e "pode ter o
              reembolso", e lá "o cliente já tá com o cartão na mão".
            </p>
          ),
          fontes: [F.raquel, F.talita]
        },
        {
          titulo: 'Onde elas discordam',
          texto: (
            <ul>
              <li>
                <strong>Começar barato?</strong> Umas baixam o preço para conseguir as primeiras vendas e sobem aos poucos; outras dizem que preço baixo espanta
                quem valoriza o artesanal.
              </li>
              <li>
                <strong>Mexer no anúncio?</strong> Em anúncio parado, várias trocam foto e título. Em anúncio que já vende, uma vendedora trocou a foto de capa e
                ficou meses sem vender.
              </li>
              <li>
                <strong>Pagar Shopee Ads?</strong> Para umas, a maioria das vendas veio de anúncio pago; outras nunca pagaram nada.
              </li>
              <li>
                <strong>Mandar mimo?</strong> Umas mandam cartão ou chaveirinho; outras desistiram porque o mimo não trouxe avaliação.
              </li>
            </ul>
          ),
          fontes: [F.danny2, F.flavia, F.fabicriart, F.lucelia, F.lunaris, F.eleni, F.bruxas]
        }
      ]
    },
    {
      titulo: 'Dicas que dão problema',
      resumo: 'Circulam por aí, mas vão contra as regras',
      dicas: [
        {
          titulo: 'Fechar a venda por fora',
          texto: (
            <p>
              Há vídeos contando vendas "no particular" com clientes que chegaram pelo anúncio. A Shopee proíbe pôr no anúncio contato ou pagamento por fora (como
              "pix pessoal"). O caminho seguro é o contrário: trazer a encomenda para dentro da Shopee.
            </p>
          ),
          fontes: [F.fabiana, F.luv, F.ebook]
        },
        {
          titulo: 'Categoria "parecida" para liberar o sob encomenda',
          texto: (
            <p>
              A Shopee pede a categoria que corresponde ao produto. Desde outubro de 2025, segundo um canal para artesãs, o sob encomenda é liberado por formulário,
              com aviso de punição e até banimento para quem abusa. Há relato de anúncio de crochê apagado depois de trocar de categoria.
            </p>
          ),
          fontes: [F.talita, F.ebook, F.viverArt, F.raApagado]
        },
        {
          titulo: 'Encher o título de palavras-chave',
          texto: (
            <p>
              Alguns vídeos ensinam a pôr o máximo de palavras ("polvinho de crochê, polvinho amigurumi, polvinho de pelúcia..."). As regras da Shopee tratam
              excesso e repetição de palavras como motivo de remoção.
            </p>
          ),
          fontes: [F.noeli, F.crocheECia, F.ebook, F.webinar]
        },
        {
          titulo: 'Cancelar e pedir para comprar de novo',
          texto: (
            <p>
              Cancelar um pedido para o cliente refazer a compra com cupom conta como cancelamento do vendedor, que entra na Taxa de Não Envio e gera ponto de
              penalidade acima de 8%.
            </p>
          ),
          fontes: [F.bruxas, F.tne]
        },
        {
          titulo: 'Robô para impulsionar',
          texto: (
            <p>Há quem recomende robô para impulsionar a cada 4 horas. A pesquisa não achou regra da Shopee sobre isso, então o risco é desconhecido.</p>
          ),
          fontes: [F.lunaris]
        }
      ]
    },
    {
      titulo: 'Taxas da Shopee',
      resumo: 'Quanto a Shopee fica de cada venda',
      dicas: [
        {
          titulo: 'Comissão + taxa fixa por item',
          texto: (
            <>
              <p>Tabela única para CPF e CNPJ, cobrada por produto (não sobre o frete). A comissão já inclui a taxa de transação.</p>
              <dl class="ficha">
                {linhasTaxas().map((l) => (
                  <div key={l.faixa}>
                    <dt>{l.faixa}</dt>
                    <dd>{l.taxa}</dd>
                  </div>
                ))}
              </dl>
              <p>
                A taxa fixa da primeira faixa era R$ 4,00 e passou a {reais(faixaBaixa.fixa as number)} em 01/10/2026. Acima de R$ 500 as fontes divergem
                (R$ 26 ou R$ 28), mas isso quase nunca afeta amigurumi.
              </p>
            </>
          ),
          fontes: [F.yav, F.vini, F.irroba]
        },
        {
          titulo: 'Peças baratas pagam proporcionalmente mais',
          texto: (
            <p>
              Abaixo de {reais(faixaBaixa.min)}, a taxa fixa vira metade do preço: num item de R$ 5, as taxas chegam a 70%. Para vendedor CPF, abaixo de R$ 12
              vale uma tabela regressiva que a Shopee não publica. O jeito de saber o custo real de um chaveiro ou mini é simular no Seller Centre.
            </p>
          ),
          fontes: [F.yav, F.vini]
        },
        ...(eq
          ? [
              {
                titulo: `Cuidado com o degrau de ${reais(primeiroDegrau)}`,
                texto: (
                  <p>
                    Em {reais(primeiroDegrau)} a taxa fixa pula de {reais(eq.fixaAntes)} para {reais(eq.fixaDepois as number)}. Uma peça de {reais(eq.precoAntes)}{' '}
                    deixa {reais(eq.recebeAntes)}; a {reais(primeiroDegrau)}, deixa só {reais(noDegrau.recebe)}. Só a partir de {reais(eq.preco)} volta a
                    compensar. Se o seu preço cair logo acima de {reais(primeiroDegrau)}, decida entre descer para {reais(eq.precoAntes)} ou subir além de{' '}
                    {reais(eq.preco)}.
                  </p>
                ),
                fontes: [F.yav, F.vini]
              }
            ]
          : []),
        {
          titulo: 'Vendedor CPF com mais de 450 pedidos',
          texto: (
            <p>
              Depois de 450 pedidos em 90 dias, a taxa fixa ganha R$ {SHOPEE.adicionalCPF},00 a mais por item (fontes antigas falavam em R$ 5). Com
              faturamento de R$ 81 mil por ano ou mais, migrar para CNPJ passa a ser obrigatório.
            </p>
          ),
          fontes: [F.vendedorLucrativo, F.irroba, F.vini]
        },
        {
          titulo: 'Frete grátis e desconto no Pix',
          texto: (
            <p>
              Segundo blogs do setor, o Programa de Frete Grátis ficou obrigatório para todos em março de 2026 (sem confirmação oficial). A Shopee banca cupons de
              frete de até R$ 20 para itens até R$ 79,99, até R$ 30 de R$ 80 a R$ 199,99 e até R$ 40 acima disso; lojas com penalidades podem ter os cupons
              limitados. O desconto no Pix (a partir de R$ 80) é pago pela Shopee: você recebe o valor cheio.
            </p>
          ),
          fontes: [F.precisao, F.vini, F.irroba]
        },
        {
          titulo: 'Quando o dinheiro cai',
          texto: (
            <p>
              O valor é liberado quando o comprador confirma o recebimento ou, se ele não confirmar, 7 dias após a entrega. O saque para o banco leva de 1 a 3
              dias úteis. Somando produção, envio e confirmação, o ciclo fica perto de duas a três semanas: conte com isso na hora de comprar fio. Pedidos
              cancelados não pagam comissão.
            </p>
          ),
          fontes: [F.goSmarterRepasse, F.portalDuvidas, F.serasa]
        },
        {
          titulo: 'Campanhas e afiliados',
          texto: (
            <p>
              Sobre a Campanha de Destaque as fontes se contradizem (2,5%, 3,5% ou programa extinto): confira no painel antes de aderir. A Comissão Extra de
              afiliados é um percentual definido pela própria loja e só é paga sobre vendas vindas de afiliados.
            </p>
          ),
          fontes: [F.irroba, F.vendedorLucrativo, F.vireiVendedor, F.tactusAfiliados]
        }
      ]
    },
    {
      titulo: 'Como calcular o preço',
      resumo: 'A margem divide, não multiplica',
      dicas: [
        {
          titulo: 'Use o markup divisor',
          texto: (
            <>
              <p>O Sebrae recomenda partir dos custos e dividir pelo que sobra depois dos percentuais:</p>
              <p class="formula">Preço = custo ÷ (1 − impostos − comissão − custos fixos − lucro)</p>
              <p>
                Somar a margem ao custo é o erro mais comum. Exemplo do Correio Braziliense: custo de R$ 210 com 25% de percentuais. Certo: R$ 210 ÷ 0,75 = R$
                280. Errado: R$ 210 + 25% = R$ 262,50, que, tirados os 25%, deixa R$ 196,87 — menos que o custo.
              </p>
            </>
          ),
          fontes: [F.sebrae, F.correio]
        },
        {
          titulo: 'Na Shopee, a taxa fixa vai em cima',
          texto: (
            <>
              <p>Os valores fixos por item somam no numerador; os percentuais saem do denominador:</p>
              <p class="formula">
                Preço = (material + mão de obra + custos fixos + embalagem + taxa fixa) ÷ (1 − comissão − imposto − margem)
              </p>
              <p>
                Exemplo: custo de R$ 22, vendedor CPF sem imposto, margem de 25%: (22 + 4,50) ÷ (1 − 0,20 − 0,25) ≈ R$ 48,18. Como a taxa muda com a faixa de
                preço, confira se o resultado caiu na faixa que você usou. Depois, ponha o preço na aba Shopee para ver quanto sobra.
              </p>
            </>
          ),
          fontes: [F.cursa, F.zen]
        },
        {
          titulo: 'Quanto vale a sua hora',
          texto: (
            <p>
              Todas as fontes fazem igual: renda mensal desejada ÷ horas trabalhadas no mês. Exemplo do Sebrae PR: R$ 2.200 ÷ 160 h = R$ 13,75 — "não é lucro, é o
              seu pagamento justo". O salário deve cobrir também as horas fora da produção (comprar material, estudar, feiras). Cronometre a peça do início ao
              fim, com costura e acabamento: o cronômetro do app serve para isso.
            </p>
          ),
          fontes: [F.sebraePr3, F.sebrae, F.brasiarte]
        },
        {
          titulo: 'Erros comuns',
          texto: (
            <ul>
              <li>Cobrar só o novelo e esquecer enchimento, olhos, embalagem, energia, taxas da plataforma e o DAS do MEI.</li>
              <li>Contar o novelo inteiro em vez da quantidade usada.</li>
              <li>Usar a regra "material × 3".</li>
              <li>Copiar o preço do concorrente.</li>
              <li>Não recalcular quando a Shopee muda as taxas (ela mudou duas vezes em 2026).</li>
            </ul>
          ),
          fontes: [F.sebraePr3, F.correio, F.zen]
        },
        {
          titulo: 'Concorrência só depois da conta',
          texto: (
            <p>
              O Sebrae chama de "perigosa" a precificação baseada só no concorrente. Calcule pelos custos e depois compare: se ficar abaixo do mercado, dá para
              subir; se ficar acima, diferencie a peça ou reduza custos. Preço baixo demais passa "uma imagem de qualidade inferior". Não existe tabela confiável de
              preço de amigurumi no Brasil: os valores que circulam em blogs são ilustrativos.
            </p>
          ),
          fontes: [F.sebrae, F.amamos]
        }
      ]
    },
    {
      titulo: 'Anúncio',
      resumo: 'Fotos, vídeo, título e descrição',
      dicas: [
        {
          titulo: 'Fotos',
          texto: (
            <p>
              Fotos reais, em fundo branco, de vários ângulos, com no mínimo 500×500 px e uma foto para cada cor ou tamanho. O limite atual parece ser 9 imagens (o
              e-book de 2023 dizia 8). Textos de outras plataformas, contatos, redes sociais, fotos cortadas e prints podem derrubar o anúncio.
            </p>
          ),
          fontes: [F.ebook, F.duvidas]
        },
        {
          titulo: 'Vídeo',
          texto: (
            <p>
              De 10 a 60 segundos, em MP4, até 30 MB. No Otimizador de Anúncios da Shopee, é o vídeo que leva um anúncio novo de "Qualificado" para "Excelente".
            </p>
          ),
          fontes: [F.video, F.otimizador]
        },
        {
          titulo: 'Título',
          texto: (
            <p>
              Padrão oficial: Produto + Marca + Modelo/Especificação + Tamanho — por exemplo, "Amigurumi Coelho de Crochê [sua loja] 20 cm Algodão". Nada de
              emojis, # ou @, nem repetir uma palavra mais de duas vezes. Cor e tamanho vão nas variações, não no título.
            </p>
          ),
          fontes: [F.ebook, F.webinar]
        },
        {
          titulo: 'Variações em vez de anúncios repetidos',
          texto: (
            <p>Cada anúncio aceita até dois tipos de variação. Anunciar cada cor em um anúncio separado conta como duplicação e gera penalidade.</p>
          ),
          fontes: [F.ebook, F.webinar]
        },
        {
          titulo: 'Descrição',
          texto: (
            <p>
              Informe material, tamanho, peso e medidas, garantia e política de devolução. Links, contato externo e "pix pessoal" são proibidos: peças
              personalizadas se combinam pelo chat e se pagam dentro da Shopee.
            </p>
          ),
          fontes: [F.ebook]
        },
        {
          titulo: '7 dias sem vender?',
          texto: <p>O Sebrae sugere testar outra foto, outro título ou outra descrição quando um produto passa uma semana sem venda.</p>,
          fontes: [F.agenciaSebrae]
        }
      ]
    },
    {
      titulo: 'Envio',
      resumo: 'Peso, caixa e prazo de postagem',
      dicas: [
        {
          titulo: 'Peso e medidas da peça já embalada',
          texto: (
            <p>
              O frete é calculado com o peso e as dimensões que você informa, em kg e com a embalagem. Exemplo da Shopee: 100 g de produto + 60 g de embalagem =
              0,16 kg. Use a menor caixa que proteja bem a peça. A aba Embalagem do app calcula o peso e as medidas para cadastrar.
            </p>
          ),
          fontes: [F.faqEnvio, F.ebook, F.manualEmbalagem]
        },
        {
          titulo: 'Limites da Agência Shopee',
          texto: <p>No máximo 120 cm em um lado, 200 cm somando os lados e 30 kg.</p>,
          fontes: [F.agencia]
        },
        {
          titulo: 'Prazo de postagem',
          texto: (
            <p>
              Desde junho de 2024, pedidos pagos até as 13h devem ser enviados em 1 dia útil; os pagos depois, em 2. Algumas fontes de 2026 ainda falam em 2 dias:
              o prazo de cada pedido aparece no próprio pedido.
            </p>
          ),
          fontes: [F.prazo, F.bling]
        },
        {
          titulo: 'Peças feitas depois da venda',
          texto: (
            <p>
              Anúncios "Sob encomenda" (pré-encomenda) permitem um prazo maior de preparo, de 2 a 15 dias, mas só em cerca de 20% dos anúncios da loja. Deixe as
              peças prontas em anúncios normais e marque como sob encomenda só o que é feito depois do pedido. Vendedoras reclamam que falta categoria de artesanato
              e que algumas categorias não têm pré-encomenda.
            </p>
          ),
          fontes: [F.preEncomenda, F.reclamePre, F.raCategoria, F.lia]
        }
      ]
    },
    {
      titulo: 'Reputação',
      resumo: 'Prazos, chat, avaliações e pontos',
      dicas: [
        {
          titulo: 'Poste no prazo',
          texto: (
            <p>
              A Taxa de Envio Atrasado deve ficar abaixo de 2% e gera ponto de penalidade acima de 5%. A Taxa de Não Envio (cancelamentos e devoluções por culpa
              do vendedor nos últimos 7 dias) gera ponto acima de 8%.
            </p>
          ),
          fontes: [F.tea, F.tne]
        },
        {
          titulo: 'Não anuncie o que não tem',
          texto: (
            <p>
              Cancelar por falta de estoque custa 2 pontos; produto diferente do anunciado, 3. Pontos acumulados tiram benefícios: a partir de 3, a loja sai das
              campanhas; com 15 ou mais, a conta pode ser congelada (faixas do webinar de 2021, que podem ter mudado).
            </p>
          ),
          fontes: [F.gobots, F.webinar]
        },
        {
          titulo: 'Nunca peça para o comprador cancelar',
          texto: <p>Pedir ao comprador que cancele também gera pontos. Se for preciso cancelar, o cancelamento deve partir de você.</p>,
          fontes: [F.webinar]
        },
        {
          titulo: 'Atraso da transportadora',
          texto: (
            <p>
              Dá para pedir revisão de pontos quando a culpa é da coleta ou da transportadora. Em 2026 a Justiça de SP mandou a Shopee suspender pontos aplicados a
              uma loja por atrasos da transportadora.
            </p>
          ),
          fontes: [F.webinar, F.migalhas]
        },
        {
          titulo: 'Responda o chat em até 12 horas',
          texto: <p>A taxa de resposta conta as mensagens respondidas em até 12 horas.</p>,
          fontes: [F.chat]
        },
        {
          titulo: 'Avaliações',
          texto: (
            <p>
              O comprador tem 30 dias para avaliar e ganha moedas Shopee por avaliar com foto ou vídeo. Você pode responder cada avaliação uma única vez, sem
              editar depois. Pelo "Prêmio de Avaliação", dá para oferecer moedas extras por avaliações de qualidade.
            </p>
          ),
          fontes: [F.avaliacao, F.responder, F.premio]
        }
      ]
    },
    {
      titulo: 'Regras',
      resumo: 'Personagens, MEI e direito do consumidor',
      dicas: [
        {
          titulo: 'Personagens licenciados',
          texto: (
            <p>
              A Shopee remove cópias não autorizadas, e violar propriedade intelectual pode levar à exclusão da conta. O nome da loja também não pode remeter a marca
              registrada. A Disney já derrubou bonecos artesanais do "Bebê Yoda" na Etsy. Designs autorais, sem nome de personagem no título ou na loja, são o
              caminho seguro.
            </p>
          ),
          fontes: [F.pi, F.piLoja, F.canaltech]
        },
        {
          titulo: 'CPF ou MEI',
          texto: (
            <p>
              A Shopee aceita os dois. Existe a ocupação MEI "Crocheteiro(a) independente" (CNAE 1422-3/00); em 2026 o DAS é R$ 82,05 por mês e o teto de
              faturamento é R$ 81 mil por ano. A Carteira Nacional do Artesão é gratuita e, conforme o estado, dá acesso a nota fiscal avulsa.
            </p>
          ),
          fontes: [F.cnae, F.contabilizei, F.goias]
        },
        {
          titulo: '7 dias para desistir',
          texto: (
            <p>
              O CDC (art. 49) dá ao comprador online 7 dias, a contar do recebimento, para desistir, com devolução do dinheiro. Há decisão aplicando isso mesmo a
              produtos personalizados, então o mais prudente é presumir que vale e considerar esse risco no preço. A loja online também precisa informar como
              exercer esse direito.
            </p>
          ),
          fontes: [F.cdc, F.decreto, F.tjms]
        }
      ]
    }
  ];
}

export function DicasShopee() {
  return (
    <main class="tela tela-sem-abas anim-tela dicas">
      <header class="cabecalho-voltar">
        <button class="botao-voltar" aria-label="Voltar" onClick={() => voltar(href.calcular)}>
          <Icone nome="voltar" />
        </button>
        <h1>Dicas para vender</h1>
      </header>

      <p class="dicas-intro">
        Pesquisa de {PESQUISA_EM} sobre como precificar e vender amigurumi na Shopee. Cada dica traz a fonte. Além de regras da Shopee e do Sebrae, há relatos de
        vendedoras em vídeos do YouTube e em redes sociais: são experiências pessoais, não regras. As páginas da Central do Vendedor não puderam ser
        lidas diretamente, então os números de taxa vêm de sites que citam a política oficial: confira no Seller Centre antes de fixar preços. Não é consultoria
        jurídica nem contábil.
      </p>

      {secoes().map((s, i) => (
        <details key={s.titulo} class="mais-detalhes dicas-secao" open={i === 0}>
          <summary>
            <span>
              {s.titulo}
              <small>{s.resumo}</small>
            </span>
          </summary>
          {s.dicas.map((d) => (
            <article key={d.titulo} class="dica">
              <h3>{d.titulo}</h3>
              {typeof d.texto === 'string' ? <p>{d.texto}</p> : d.texto}
              {d.fontes && d.fontes.length > 0 && (
                <p class="dica-fontes">
                  Fonte{d.fontes.length > 1 ? 's' : ''}:{' '}
                  {d.fontes.map((f, j) => (
                    <Fragment key={f.url}>
                      {j > 0 && ', '}
                      <a href={f.url} target="_blank" rel="noopener noreferrer">
                        {f.nome}
                      </a>
                    </Fragment>
                  ))}
                </p>
              )}
            </article>
          ))}
        </details>
      ))}

      <p class="rodape-regras">Taxas da tabela iguais às da calculadora (regras de {REGRAS_SHOPEE_EM}).</p>
    </main>
  );
}
