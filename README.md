# Finanças — front-end

Interface web do projeto **Finanças**. Consome a API do back-end
([`financas`](../financas), NestJS) e segue a mesma organização por módulos.

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

Pré-requisitos: Node `^20.19`, `^22.12` ou `>=24` e o back-end rodando em `http://localhost:3000`.

```sh
npm install
npm start          # http://localhost:4200
```

Em desenvolvimento, o arquivo [`proxy.conf.json`](proxy.conf.json) repassa toda chamada
`/api/*` para `http://localhost:3000`. Por isso o navegador não esbarra em CORS e o back
não precisa de nenhuma configuração extra.

Para entrar, use um usuário criado no back com `npm run admin:create`.

## Scripts

| Comando                | O que faz                                    |
| ---------------------- | -------------------------------------------- |
| `npm start`            | Sobe o front em modo desenvolvimento (4200)  |
| `npm run build`        | Gera a versão de produção em `dist/`         |
| `npm test`             | Roda os testes unitários uma vez             |
| `npm run test:watch`   | Roda os testes a cada alteração              |
| `npm run lint`         | Verifica o código com ESLint                 |
| `npm run format`       | Formata o código com Prettier                |

## Estrutura

```
src/app/
├── core/                  # carregado uma vez só (singletons)
│   ├── api/               # ApiService: desembrulha { data } e transforma { error } em ApiError
│   ├── auth/              # sessão, tokens, guards e interceptor (renovação única do token)
│   ├── config/            # tema e tradução do PrimeNG
│   ├── layout/            # menu lateral, topo, página inicial e itens do menu (navigation.ts)
│   ├── month/             # mês selecionado no topo (compartilhado entre as telas)
│   └── notification/      # avisos (toasts) e confirmações
├── shared/                # reaproveitado por todas as features
│   ├── data/              # remoteData(): busca dados e recarrega quando o parâmetro muda
│   ├── forms/             # mensagens de erro e erros do back nos campos
│   ├── money/             # reais: formatação, centavos, limites do campo de valor
│   ├── month/             # utilitários de mês (AAAA-MM)
│   ├── phone/             # celular: (11) 99999-9999 ⇄ +5511999999999
│   └── ui/                # componentes genéricos (cabeçalho de página…)
└── features/              # uma pasta por módulo do back, com o mesmo nome
    ├── auth/              # tela de login
    ├── categories/        # /categorias
    ├── incomes/           # /entradas
    ├── manual-expenses/   # /despesas
    └── people/            # /pessoas
        ├── data-access/   # person.service.ts (chamadas HTTP) + person.models.ts (≈ DTOs)
        ├── pages/         # telas ligadas a uma rota (≈ controllers)
        ├── components/    # pedaços de tela usados só nesta feature (diálogos…)
        └── people.routes.ts
```

Regra prática: **cada módulo novo no back ganha uma pasta com o mesmo nome em `features/`**,
uma rota em `app.routes.ts` e um item em `core/layout/navigation.ts`.

### Receita de uma feature nova

1. `data-access/x.models.ts`: copie os DTOs do back como `interface`.
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
| DTO                               | `interface` em `*.models.ts`                                     |
| Pipe de validação (Joi)           | `Validators` dos formulários reativos                            |
| `nest g service x`                | `npx ng g service x`                                             |

## Convenções

- Arquivos com o tipo no nome, como no back: `category.service.ts`, `auth.guard.ts`,
  `categories-page.component.ts`.
- Rotas da tela em português (`/categorias`), pastas e código em inglês, espelhando o back.
- Dinheiro trafega como texto (`"1234.56"`), igual à API. Nunca vira `number` para somar:
  somas são feitas em centavos inteiros (`shared/money`).
- Mês trafega como `"AAAA-MM"` (`shared/month`).
- Mensagens de erro vêm prontas do back, em português, e são exibidas como estão.
- Commits no mesmo padrão do back: um commit por feature (`feat: add categorias`).

## Autenticação, em resumo

- Access token (15 min) fica só em memória; refresh token (7 dias) fica no `localStorage`.
- O back troca o refresh token a cada uso e derruba a sessão se um token velho for reutilizado.
  Por isso `AuthService.refreshAccessToken()` faz **uma** renovação por vez — dentro da aba
  (as requisições esperam a mesma chamada) e entre abas (Web Locks API). Há teste para isso em
  `core/auth/auth.interceptor.spec.ts`.
- Se o back recusar a renovação, aparece "Sua sessão expirou" e o usuário volta ao login;
  depois de entrar, retorna à página onde estava.

## Pendências que dependem do back

- **Reativar categoria/pessoa:** `GET /categories` e `GET /people` só devolvem ativas, então uma
  desativada some da tela e não há como reativá-la por aqui. Falta uma forma de listar as inativas
  (ex.: `?includeInactive=true`).
- **Dashboard:** depende de um `GET /summary?month=AAAA-MM` (entrada, total de despesas, saldo,
  totais por categoria e por pessoa). Até lá, a página inicial mostra atalhos.
- **Usuário logado:** o token só tem `sub` e `sid`; um `GET /auth/me` permitiria mostrar o e-mail
  e esconder telas de administrador.
- **Produção:** servir front e back no mesmo domínio ou habilitar CORS no back.
- **Tipos automáticos:** com o Swagger ligado no back, os `*.models.ts` podem ser gerados
  (`openapi-typescript`) em vez de copiados à mão.

## Problemas conhecidos do ambiente

- O npm 10.9.2 (que vem com o Node 22.16) tem um bug ao **adicionar** pacotes novos
  (`Cannot read properties of null (reading 'edgesOut')`). Instalar a partir do lockfile
  (`npm install`/`npm ci`) funciona. Para adicionar um pacote, use `npx npm@11 install <pacote>`
  ou atualize o Node.
