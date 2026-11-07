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
│   ├── api/               # cliente HTTP: desembrulha { data } e padroniza erros
│   ├── auth/              # sessão, tokens, guards e interceptor de autenticação
│   ├── config/            # tema e tradução do PrimeNG
│   └── layout/            # menu lateral, topo e seletor de mês
├── shared/                # reaproveitado por todas as features
│   ├── forms/             # mensagens de erro de formulário
│   ├── money/             # formatação e conversão de valores em reais
│   ├── month/             # utilitários de mês (AAAA-MM)
│   └── ui/                # componentes genéricos (cabeçalho de página…)
└── features/              # uma pasta por módulo do back, com o mesmo nome
    ├── auth/
    ├── categories/
    ├── incomes/
    ├── manual-expenses/
    └── people/
        ├── data-access/   # people.service.ts (chamadas HTTP) + people.models.ts (≈ DTOs)
        ├── pages/         # telas ligadas a uma rota (≈ controllers)
        ├── components/    # pedaços de tela usados só nesta feature
        └── people.routes.ts
```

Regra prática: **cada módulo novo no back ganha uma pasta com o mesmo nome em `features/`.**

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
