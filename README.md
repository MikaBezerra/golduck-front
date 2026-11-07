# Golduck — front-end

Interface web do **Golduck** (projeto Finanças) — *Make your money count.* Consome a API do back-end
([golduck-back](https://github.com/MikaBezerra/golduck-back), NestJS) e segue a mesma organização por módulos.

## Stack

| Peça        | Escolha                                   | Para quê                                                       |
| ----------- | ----------------------------------------- | -------------------------------------------------------------- |
| Framework   | [Angular 21](https://angular.dev)         | Estrutura, rotas, chamadas HTTP, formulários, testes           |
| Componentes | [PrimeNG 21](https://primeng.org) (Aura)  | Tabelas, campos de moeda, seletor de mês, diálogos, avisos     |
| Layout      | [Tailwind CSS 4](https://tailwindcss.com) | Espaçamento e grid com classes utilitárias                     |
| Estado      | Signals (nativo do Angular)               | Estado das telas sem bibliotecas extras                        |
| Qualidade   | ESLint (angular-eslint) + Prettier        | Mesmas regras de estilo do back (4 espaços, aspas simples etc.) |
| Testes      | Vitest (padrão do Angular CLI)            | Testes unitários                                               |

> O Angular 22 já existe, mas exige Node ≥ 22.22.3. Ao atualizar o Node, rode
> `npx ng update @angular/core@22 @angular/cli@22` e depois `npm install primeng@22`.

## Como rodar

Pré-requisitos: Node 22 (`^22.12`, versão no [`.nvmrc`](.nvmrc): `nvm use`) e o back-end rodando em
`http://localhost:3000`.

```sh
npm install        # também ativa os hooks do Git (Husky)
npm start          # http://localhost:4200
```

Em desenvolvimento, o arquivo [`proxy.conf.json`](proxy.conf.json) repassa toda chamada
`/api/*` para `http://localhost:3000`. Por isso o navegador não esbarra em CORS e o back
não precisa de nenhuma configuração extra.

Para entrar, use um usuário criado no back com `npm run admin:create`.

## Scripts

| Comando                    | O que faz                                                          |
| -------------------------- | ------------------------------------------------------------------ |
| `npm start`                | Sobe o front em modo desenvolvimento (4200)                        |
| `npm run build`            | Gera a versão de produção em `dist/`                               |
| `npm run build:develop`    | Build do ambiente develop (API de develop)                         |
| `npm run build:production` | Build de produção (igual ao `build`)                               |
| `npm run build:vercel`     | Build usado pela Vercel (escolhe develop/production, ver CI/CD)    |
| `npm test`                 | Roda os testes unitários uma vez                                   |
| `npm run test:watch`       | Roda os testes a cada alteração                                    |
| `npm run test:cov`         | Testes com cobertura e metas mínimas (relatório em `coverage/`)    |
| `npm run lint`             | Verifica o código com ESLint                                       |
| `npm run format`           | Formata o código com Prettier (`format:check` só confere)          |
| `npm run verify`           | Roda tudo o que o CI roda: `format:check`, lint, `test:cov` e build |

Antes de commitar, rode `npm run verify`. A mensagem do commit é conferida pelo commitlint (hook
`commit-msg` do Husky) no padrão Conventional Commits: `feat: ...`, `fix: ...`, `chore: ...`,
`docs: ...`, `ci: ...` (em português depois do prefixo).

## Estrutura

```
src/app/
├── core/                  # carregado uma vez só (singletons)
│   ├── api/               # ApiService ({ data } e ApiError), x-request-id, códigos de erro
│   ├── auth/              # sessão, tokens, guards e interceptor (renovação única do token)
│   ├── config/            # tema e tradução do PrimeNG
│   ├── errors/            # ErrorHandler global (log + aviso com código de suporte)
│   ├── layout/            # menu lateral, barra do celular, topo e itens do menu (navigation.ts)
│   ├── logging/           # LoggerService com níveis e ids/códigos de suporte
│   ├── month/             # mês selecionado no topo (compartilhado entre as telas)
│   ├── notification/      # avisos (toasts) e confirmações
│   ├── storage/           # prefixo das chaves gravadas no navegador
│   └── version/           # versões do front e da API (mostradas no rodapé)
├── shared/                # reaproveitado por todas as features
│   ├── data/              # remoteData() e paginação (PageQuery, Page<T>, pageParams, p-table)
│   ├── forms/             # mensagens de erro e erros do back nos campos
│   ├── money/             # reais: formatação, centavos, limites do campo de valor
│   ├── month/             # utilitários de mês (AAAA-MM)
│   ├── date/              # datas AAAA-MM-DD sem erro de fuso (pipe isoDate)
│   ├── phone/             # celular: (11) 99999-9999 ⇄ +5511999999999
│   └── ui/                # componentes genéricos (cabeçalho de página…)
└── features/              # uma pasta por módulo do back, com o mesmo nome
    ├── auth/              # tela de login
    ├── card-expenses/     # /faturas — despesas do cartão (usa os diálogos de card-imports)
    ├── card-imports/      # envio de fatura (pré-visualizar → revisar → salvar), fatura manual e histórico
    ├── categories/        # /categorias
    ├── credit-cards/      # /cartoes
    ├── incomes/           # /entradas (entrada e reserva de cada mês)
    ├── manual-expenses/   # /despesas
    ├── people/            # /pessoas
    │   ├── data-access/   # person.service.ts (chamadas HTTP) + person.models.ts (≈ DTOs)
    │   ├── pages/         # telas ligadas a uma rota (≈ controllers)
    │   ├── components/    # pedaços de tela usados só nesta feature (diálogos…)
    │   └── people.routes.ts
    ├── reserves/          # reserva do mês e total guardado (só data-access; a tela é a de Entradas)
    └── summary/           # / visão geral com gráficos (abre pelo logo) e /resumo: tabela do mês por pessoa
```

Regra prática: **cada módulo novo no back ganha uma pasta com o mesmo nome em `features/`**,
uma rota em `app.routes.ts` e um item em `core/layout/navigation.ts`.

### Receita de uma feature nova

1. `data-access/x.models.ts`: rode `npm run api:types` e dê nomes curtos aos tipos gerados
   (`export type X = ApiSchemas['XResponse']`).
2. `data-access/x.service.ts`: um método por rota do controller, usando `ApiService`.
3. `pages/x-page.component.ts`: a tela, com estado em `signal()`; use `remoteData()` se a busca
   depender do mês/ano selecionado.
4. `components/x-form-dialog.component.ts`: formulário reativo com as mesmas regras do Joi.
   Os botões ficam **dentro** do `<form>` (assim Enter e "Salvar" enviam).
5. `x.routes.ts` + rota em `app.routes.ts` + item em `navigation.ts`.

## Do NestJS para o Angular

| NestJS                            | Angular                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `app.module.ts`                   | `app.config.ts` + `app.routes.ts`                                |
| Módulo de feature                 | Pasta em `features/` com seu `*.routes.ts` (carregada sob demanda) |
| `@Injectable()` service           | `@Injectable()` service — mesma ideia de injeção de dependência  |
| Controller (rota HTTP)            | Componente de página (rota de tela)                              |
| Guard `CanActivate`               | Guard de rota (`CanActivateFn`)                                  |
| Interceptor                       | Interceptor HTTP (`HttpInterceptorFn`)                           |
| DTO                               | Tipo gerado do OpenAPI, apelidado em `*.models.ts`               |
| Pipe de validação (Joi)           | `Validators` dos formulários reativos                            |
| `nest g service x`                | `npx ng g service x`                                             |

## Convenções

- Arquivos com o tipo no nome, como no back: `category.service.ts`, `auth.guard.ts`,
  `categories-page.component.ts`.
- Rotas da tela em português (`/categorias`), pastas e código em inglês, espelhando o back.
- Dinheiro trafega como texto (`"1234.56"`), igual à API. Nunca vira `number` para somar:
  somas são feitas em centavos inteiros (`shared/money`).
- Mês trafega como `"AAAA-MM"` (`shared/month`).
- Mensagens de erro vêm prontas do back, em português, e são exibidas como estão (com o código de
  suporte quando houver).
- Commits no mesmo padrão do back (Conventional Commits, conferido pelo commitlint): um commit por
  assunto (`feat: categorias`, `fix: ...`).

## Observabilidade

Sem ferramenta externa: tudo fica no console do navegador, organizado, e ligado ao log do back.

- **Logger com níveis** (`core/logging/logger.service.ts`): `debug`, `info`, `warn` e `error`, com hora,
  nível destacado, dados e o erro original. O nível mínimo vem do ambiente: tudo em desenvolvimento,
  `info` no develop e só `warn`/`error` em produção.
- **Erros não tratados** (`core/errors/global-error-handler.ts`): viram um log com a rota e um código de
  suporte, e um aviso amigável com o mesmo código (sem repetir o aviso se o erro se repetir).
- **Id da requisição**: toda chamada à API leva o header `x-request-id` (UUID). O back usa o mesmo id no log
  e devolve no erro; em falha de rede o front usa o id que enviou. As mensagens de erro mostram os 8
  primeiros caracteres como "código de suporte", e o log do front guarda o id completo: com ele se acha
  a mesma requisição no log do back.
- **Limite de tentativas** (429): a mensagem diz quanto esperar (header `Retry-After`).
- **Versões**: o rodapé mostra a versão do front (do `package.json`) e a da API (`GET /version`), com
  commit e ambiente na dica.

## Paginação

O back pagina com `page` (a partir de 1) e `pageSize` (1 a 100) e responde
`{ items, page, pageSize, total, totalPages }`. Em `shared/data/pagination.ts`:

- `PageQuery` e `Page<T>`;
- `pageParams(query, filtros)`: monta os `HttpParams` (corrige valores fora dos limites e ignora filtros
  vazios) para usar em `api.get<Page<T>>('rota', pageParams(...))`;
- `pageQueryFromLazyLoad(evento)` e `firstRowOf(página)`: convertem o lazy load do `p-table`
  (`first`/`rows`) em `page`/`pageSize` e de volta.

## Autenticação, em resumo

- Access token (15 min) fica só em memória. O refresh token (7 dias) fica num **cookie httpOnly**
  gravado pelo back: o JavaScript não lê o cookie, então um script malicioso na página não consegue
  roubá-lo. Login, refresh e logout vão com `withCredentials`; no `localStorage` fica só a marca
  `golduck.session` (não secreta), usada pelo guard e para sincronizar as abas.
- Transição: enquanto o back ainda devolver o refresh token no corpo, o front guarda e envia como
  antes (código marcado com `TODO(transição)` em `core/auth`). Quando o back usar o cookie, apague
  esse trecho e gere os tipos de novo.
- Para o cookie funcionar em todos os navegadores (o Safari bloqueia cookies de outro site), front e
  API precisam ficar no mesmo site: domínio próprio com a API num subdomínio (ex.: `app.exemplo.com`
  e `api.exemplo.com`) ou a API servida pelo próprio domínio do front (rewrite de `/api` na Vercel).
  Dois endereços `*.vercel.app` diferentes contam como sites diferentes.
- Se a renovação for limitada pelo back (429), a sessão continua e o front espera o `Retry-After`
  antes de tentar de novo.
- O back troca o refresh token a cada uso e derruba a sessão se um token velho for reutilizado.
  Por isso `AuthService.refreshAccessToken()` faz **uma** renovação por vez — dentro da aba
  (as requisições esperam a mesma chamada) e entre abas (Web Locks API). Há teste para isso em
  `core/auth/auth.interceptor.spec.ts`.
- Se o back recusar a renovação, aparece "Sua sessão expirou" e o usuário volta ao login;
  depois de entrar, retorna à página onde estava.

## Tipos da API (gerados do back)

Os tipos de tudo o que entra e sai da API vêm do OpenAPI (Swagger) do back:

- `src/app/core/api/api-schema.d.ts`: gerado, **não edite à mão**;
- `src/app/core/api/api-types.ts`: expõe esses tipos como `ApiSchemas`;
- cada `*.models.ts` só dá nomes curtos a eles (`export type Category = ApiSchemas['CategoryResponse']`).

Quando o back mudar um DTO, rode o back com `SWAGGER_ENABLE=1` no `.env` e:

```sh
npm run api:types
```

Se algum campo mudou, o `npm run build` aponta exatamente onde o front precisa ser ajustado.
Commite o `api-schema.d.ts` junto com o ajuste.

## Ambientes e endereço da API

O endereço da API vem do arquivo de ambiente escolhido na hora do build
([`src/environments`](src/environments)), lido pelo `API_BASE_URL` em `core/api/api.service.ts`:

| Onde                                   | Configuração do build | Arquivo                     | API                                         |
| -------------------------------------- | --------------------- | --------------------------- | ------------------------------------------- |
| `npm start` e testes                   | `development`         | `environment.ts`            | `/api` (o `proxy.conf.json` leva ao back)   |
| Vercel develop (`npm run build:develop`) | `develop`           | `environment.develop.ts`    | `https://CHANGE_ME-develop.vercel.app/api`  |
| Vercel produção (`npm run build`)      | `production`          | `environment.production.ts` | `https://CHANGE_ME.vercel.app/api`          |

Os endereços `CHANGE_ME` são provisórios: troque pelos domínios reais do back. Como front e back
ficam em domínios diferentes, libere o domínio do front no back com a variável `API_CORS_ORIGINS`
(ex.: `API_CORS_ORIGINS=https://golduck.vercel.app`).

Não há `.env` no front: tudo o que vai para o bundle é público, então não existem segredos aqui.

## CI/CD e versões

Workflows em `.github/workflows` (mesma estrutura do back, `golduck-back`):

| Workflow       | Quando roda                                                  | O que faz                                                                                                   |
| -------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `ci.yml`       | PR para `develop`/`main`, push nessas branches e manual      | `format:check`, lint, testes com cobertura mínima (relatório como artefato por 14 dias) e build             |
| `pr-title.yml` | abertura/edição de PR                                        | exige título no padrão Conventional Commits (`feat: ...`, `fix: ...`), usado no squash merge                |
| `release.yml`  | push na `main`                                               | [release-please](https://github.com/googleapis/release-please): mantém um PR de release com `CHANGELOG.md` e versão; ao fazer merge, cria a tag `vX.Y.Z` e a release |
| `deploy.yml`   | push na `develop` (preview na Vercel) e na `main` (produção) | build com a configuração do Angular do ambiente e publicação na Vercel. **Desligado** até a variável `DEPLOY_ENABLED` ser `true` |

Fluxo: `feature` → PR (squash) para `develop` → PR de `develop` para `main` → release-please.
O título do PR segue o Conventional Commits, em português depois do prefixo (`feat: tabela do resumo`).
`feat` sobe a versão minor; `fix` sobe a patch; `feat!`/`BREAKING CHANGE` sobe a major (antes da 1.0,
`feat` sobe a minor). O `.github/dependabot.yml` abre PRs semanais (segundas) para a `develop`.

**Cobertura:** a meta global fica no `angular.json` (`coverageThresholds`, hoje baixa: o relatório inclui
todas as telas, e a maioria ainda não tem teste) e as metas mais altas por arquivo/pasta ficam no
[`vitest.config.ts`](vitest.config.ts) (dinheiro, cliente HTTP, autenticação e contas do resumo). Suba as
metas conforme os testes crescerem.

### O que configurar no GitHub (Settings)

- **Environments** `develop` e `production` (sem secrets próprios por enquanto: o front não tem segredos),
  cada um aceitando deploy só da sua branch (`develop` e `main`).
- **Secrets** do repositório: `VERCEL_TOKEN` (token da conta na Vercel).
- **Variables** do repositório: `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (do `.vercel/project.json` gerado por
  `npx vercel link`) e `DEPLOY_ENABLED=true` quando o deploy estiver pronto.
- **Ruleset** na `develop`: PR obrigatório, só squash e os checks `Formatação, lint, testes e build` e
  `Título no padrão Conventional Commits`. O administrador do repositório pode passar por cima (por exemplo,
  para um force push).
- **Pull Requests**: só squash merge, com o título do PR como mensagem, e branch apagada depois do merge.
  Em Actions, as workflows podem abrir PRs (necessário para o release-please).

### O que configurar na Vercel

- Crie o projeto e ligue ao repositório (`npx vercel link`). O [`vercel.json`](vercel.json) já define:
  instalação (`npm ci`), build (`npm run build:vercel`), saída (`dist/golduck-front/browser`), o
  redirecionamento das rotas do Angular para o `index.html` e o deploy automático por Git **desligado**
  (quem publica é o `deploy.yml`).
- O `build:vercel` escolhe a configuração do Angular pela variável `ANGULAR_CONFIGURATION` (o
  `deploy.yml` define `develop` ou `production`); sem ela, usa `VERCEL_ENV` (`production` → production,
  `preview` → develop). Não é preciso mudar o comando de build no painel; se mudar, use
  `npm run build:vercel`.
- Troque os endereços provisórios `CHANGE_ME` em `src/environments` pelos domínios reais do back e
  libere os domínios do front na variável `API_CORS_ORIGINS` do back.

## Problemas conhecidos do ambiente

- No Windows, não rode `npm ci` nem apague a `node_modules` com o `ng serve` no ar: o servidor segura
  binários nativos (esbuild, lightningcss) e a instalação quebra pela metade. Pare o `ng serve` antes.
  `npm install <pacote>` funciona com ele rodando.
- Se o npm 10.9.2 falhar ao **adicionar** um pacote (`Cannot read properties of null (reading
  'edgesOut')`), use `npx npm@11 install <pacote>`.

## Licença

[MIT](LICENSE) © 2026 Mikaell Silva.
