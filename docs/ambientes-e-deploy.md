# Ambientes e deploy

## Endereço da API

Vem do arquivo de ambiente escolhido na hora do build ([`src/environments`](../src/environments)), lido pelo
`API_BASE_URL` em `core/api/api.service.ts`:

| Onde | Configuração do build | Arquivo | API |
| --- | --- | --- | --- |
| `npm start` e testes | `development` | `environment.ts` | `/api` (o `proxy.conf.json` leva ao back) |
| Vercel develop (`npm run build:develop`) | `develop` | `environment.develop.ts` | `/api` (a Vercel repassa ao back de develop) |
| Vercel produção (`npm run build`) | `production` | `environment.production.ts` | `/api` (a Vercel repassa ao back de produção) |

Em todos os ambientes o navegador chama a API pelo próprio domínio do front. Na Vercel, a rota de `/api` do
[`vercel.json`](../vercel.json) leva ao back do ambiente (veja abaixo). O arquivo de ambiente também define o
nível mínimo do log ([erros-e-observabilidade.md](erros-e-observabilidade.md)).

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

- `API_CORS_ORIGINS` com a URL publicada do front: a Vercel repassa o `Origin` do navegador ao back, e ele só
  aceita login, refresh e logout de origens confiáveis.
- Front e API no **mesmo site**, para o cookie da sessão funcionar em todos os navegadores: é o que a rota de
  `/api` da Vercel garante ([autenticacao.md](autenticacao.md)).

## Vercel

| Ambiente | Projeto na Vercel | Endereço | `API_ORIGIN` (back) |
| --- | --- | --- | --- |
| develop | `golduck-front-develop` | `https://golduck-front-develop.vercel.app` | `https://golduck-back-develop.vercel.app` |
| produção | `golduck-front` | a definir | endereço do back de produção |

- Um projeto por ambiente, sempre publicado como produção daquele projeto: URL fixa e sem a proteção que o
  plano Hobby põe nos deploys de preview.
- O [`vercel.json`](../vercel.json) define a instalação (`npm ci`), o build (`npm run build:vercel`), a saída
  (`dist/golduck-front/browser`) e as rotas, nesta ordem:
  1. `/api/*` → `${API_ORIGIN}/api/*`: a Vercel repassa a chamada ao back. O valor vem da variável `API_ORIGIN`
     do projeto (*Settings > Environment Variables*, ambiente *Production*), sem barra no fim. Para o
     navegador, front e API são o mesmo site, então o cookie da sessão funciona em todos os navegadores.
  2. arquivos que existem no build (JS, CSS, imagens);
  3. o resto vai para o `index.html` (rotas do Angular).
- O deploy automático por Git fica **desligado**: quem publica é o `deploy.yml` ([ci-cd.md](ci-cd.md)).
- O `build:vercel` escolhe a configuração do Angular pela variável `ANGULAR_CONFIGURATION` (o `deploy.yml`
  define `develop` ou `production`; cada projeto da Vercel também a tem, para um deploy manual pelo CLI sair
  certo). Sem ela, usa `VERCEL_ENV` (`production` → production, `preview` → develop).

## Problemas conhecidos do ambiente

- No Windows, não rode `npm ci` nem apague a `node_modules` com o `ng serve` no ar: o servidor segura binários
  nativos (esbuild, lightningcss) e a instalação quebra pela metade. Pare o `ng serve` antes.
  `npm install <pacote>` funciona com ele rodando.
- Se o npm 10.9.2 falhar ao **adicionar** um pacote (`Cannot read properties of null (reading 'edgesOut')`),
  use `npx npm@11 install <pacote>`.
