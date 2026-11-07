# Crochezinho

Cronômetro de projetos, calculadora de preço e estoque de novelos para crochê.
PWA que funciona offline. Especificação em [docs/ESPECIFICACAO.md](docs/ESPECIFICACAO.md).

## Rodar localmente

```sh
npm install
npm run dev     # servidor local
npm test        # testes das regras (src/domain)
npm run build   # build de produção em dist/
```

## Publicar

Cada push na `main` publica no GitHub Pages pelo workflow `.github/workflows/deploy.yml`.
No GitHub: Settings → Pages → Source: **GitHub Actions**.

## Sincronizar entre aparelhos

1. Crie o repositório **privado** `crochezinho-data` no GitHub (pode ficar vazio).
2. Crie um token em <https://github.com/settings/personal-access-tokens/new> (fine-grained):
   - Repository access: **Only select repositories** → `crochezinho-data`
   - Permissions → Repository → **Contents: Read and write**
3. No app: Início → engrenagem → Sincronização → cole `seu-usuario/crochezinho-data` e o token → Conectar.
4. Repita o passo 3 em cada aparelho (o token fica só no aparelho, nunca no arquivo de dados).

## Estrutura

```
design/        protótipo v3 (abra prototipo-v3.dc.html no navegador) e fontes do ícone
docs/          especificação
public/icons/  ícones do PWA
src/
  app/         moldura do app e rotas
  db/          banco local (Dexie) e tipos
  domain/      regras puras: tempo, preço, estoque
  screens/     uma pasta por tela
  components/  componentes reutilizáveis
  styles/      tokens, base e animações
```
