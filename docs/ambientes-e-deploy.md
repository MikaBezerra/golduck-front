# Ambientes e deploy

## Endereço da API

Vem do arquivo de ambiente escolhido na hora do build ([`src/environments`](../src/environments)), lido pelo
`API_BASE_URL` em `core/api/api.service.ts`:

| Onde | Configuração do build | Arquivo | API |
| --- | --- | --- | --- |
| `npm start` e testes | `development` | `environment.ts` | `/api` (o `proxy.conf.json` leva ao back) |
| Vercel develop (`npm run build:develop`) | `develop` | `environment.develop.ts` | `https://CHANGE_ME-develop.vercel.app/api` |
| Vercel produção (`npm run build`) | `production` | `environment.production.ts` | `https://CHANGE_ME.vercel.app/api` |

Os endereços `CHANGE_ME` são provisórios: troque pelos domínios reais do back. O arquivo de ambiente também
define o nível mínimo do log ([erros-e-observabilidade.md](erros-e-observabilidade.md)).

Não há `.env` no front: tudo o que vai para o bundle é público, então não existem segredos aqui.

## Desenvolvimento local

- Pré-requisitos: Node 22 (`^22.12`, versão no `.nvmrc`) e o back rodando em `http://localhost:3000`.
- `npm install` (também liga os hooks do Husky) e `npm start` → `http://localhost:4200`.
- O [`proxy.conf.json`](../proxy.conf.json) repassa `/api/*` para `http://localhost:3000`: o navegador não
  esbarra em CORS e o cookie da sessão fica no endereço do front.
- O back precisa ter `API_CORS_ORIGINS=http://localhost:4200` no `.env`: mesmo com o proxy, o navegador manda
  essa origem, e o back só aceita login, refresh e logout de origens confiáveis.
- Para entrar, use um usuário criado no back com `npm run admin:create`.

## O que o back precisa liberar em cada ambiente

- `API_CORS_ORIGINS` com a URL publicada do front.
- Front e API no **mesmo site**, para o cookie da sessão funcionar em todos os navegadores
  ([autenticacao.md](autenticacao.md)).

## Vercel

- Crie o projeto e ligue ao repositório (`npx vercel link`). O [`vercel.json`](../vercel.json) já define:
  instalação (`npm ci`), build (`npm run build:vercel`), saída (`dist/golduck-front/browser`), o redirecionamento
  das rotas do Angular para o `index.html` e o deploy automático por Git **desligado** (quem publica é o
  `deploy.yml`, veja [ci-cd.md](ci-cd.md)).
- O `build:vercel` escolhe a configuração do Angular pela variável `ANGULAR_CONFIGURATION` (o `deploy.yml` define
  `develop` ou `production`); sem ela, usa `VERCEL_ENV` (`production` → production, `preview` → develop).
- Troque os `CHANGE_ME` de `src/environments` pelos domínios reais do back.

## Problemas conhecidos do ambiente

- No Windows, não rode `npm ci` nem apague a `node_modules` com o `ng serve` no ar: o servidor segura binários
  nativos (esbuild, lightningcss) e a instalação quebra pela metade. Pare o `ng serve` antes.
  `npm install <pacote>` funciona com ele rodando.
- Se o npm 10.9.2 falhar ao **adicionar** um pacote (`Cannot read properties of null (reading 'edgesOut')`),
  use `npx npm@11 install <pacote>`.
