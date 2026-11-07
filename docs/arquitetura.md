# Arquitetura

## Stack

| Peça | Escolha | Para quê |
| --- | --- | --- |
| Framework | [Angular 21](https://angular.dev) | estrutura, rotas, chamadas HTTP, formulários e testes |
| Componentes | [PrimeNG 21](https://primeng.org) (tema Aura customizado) | tabelas, campos de moeda, seletor de mês, diálogos, avisos |
| Layout | [Tailwind CSS 4](https://tailwindcss.com) | espaçamento e grid com classes utilitárias |
| Estado | signals (nativo do Angular) | estado das telas sem bibliotecas extras |
| Qualidade | ESLint (angular-eslint) + Prettier | as mesmas regras de estilo do back |
| Testes | Vitest, pelo builder de testes do Angular | testes de unidade e de componente ([testes.md](testes.md)) |

> O Angular 22 já existe, mas exige Node ≥ 22.22.3. Ao atualizar o Node, rode
> `npx ng update @angular/core@22 @angular/cli@22` e depois `npm install primeng@22`.

## Pastas

```text
src/app/
├── core/                  # carregado uma vez só (singletons)
│   ├── api/               # ApiService ({ data } e ApiError), x-request-id, códigos de erro
│   ├── auth/              # sessão, tokens, guards e interceptor (renovação única do token)
│   ├── config/            # tema e tradução do PrimeNG
│   ├── errors/            # ErrorHandler global (log + aviso com código de suporte)
│   ├── layout/            # moldura: menu lateral, barra do celular, topo, itens do menu (navigation.ts)
│   ├── logging/           # LoggerService com níveis e ids/códigos de suporte
│   ├── month/             # mês selecionado no topo (compartilhado entre as telas)
│   ├── notification/      # avisos (toasts) e confirmações
│   ├── storage/           # prefixo das chaves gravadas no navegador
│   └── version/           # versões do front e da API (rodapé)
├── shared/                # reaproveitado por todas as features
│   ├── data/              # remoteData() e paginação
│   ├── forms/             # mensagens de erro e erros do back nos campos
│   ├── money/             # reais: formatação, centavos, limites do campo de valor
│   ├── month/             # utilitários de mês (AAAA-MM)
│   ├── date/              # datas AAAA-MM-DD sem erro de fuso (pipe isoDate)
│   ├── phone/             # celular: (11) 99999-9999 ⇄ +5511999999999
│   └── ui/                # componentes genéricos (cabeçalho de página, rodapé, marca)
└── features/              # uma pasta por módulo do back, com o mesmo nome
    └── <feature>/
        ├── data-access/   # <x>.service.ts (chamadas HTTP) + <x>.models.ts (tipos da API com nomes curtos)
        ├── pages/         # telas ligadas a uma rota
        ├── components/    # pedaços de tela usados só nesta feature (diálogos...)
        └── <x>.routes.ts
src/testing/               # auxiliares dos testes (não vão para o app)
src/environments/          # endereço da API e nível de log de cada ambiente
```

As features e as telas estão descritas em [telas.md](telas.md).

## Como uma tela conversa com o back

```text
página (signals) → service da feature → ApiService → interceptors (x-request-id, token) → API
                 ←      dados prontos  ←   desembrulha { data } ou lança ApiError   ←
```

1. A **página** guarda o estado em `signal()`. Dados que dependem do mês ou do ano selecionado usam
   `remoteData()` (`shared/data/remote-data.ts`): busca de novo quando o mês muda e descarta respostas de um
   mês que já não está selecionado.
2. O **service da feature** (`data-access/<x>.service.ts`) tem um método por rota do back e só monta a
   chamada: rota, método, query e corpo. Não tem regra de negócio.
3. O **ApiService** (`core/api`) prefixa `/api`, desembrulha o `{ data }` e converte qualquer falha em
   `ApiError` ([api-e-tipos.md](api-e-tipos.md)).
4. Os **interceptors** mandam o `x-request-id` em toda chamada e o access token nas rotas protegidas,
   renovando a sessão quando preciso ([autenticacao.md](autenticacao.md)).

## Front "burro": o back entrega pronto, o front só exibe

Regra do projeto: **o front não faz contas com valores vindos do back.** Totais, divisões entre pessoas,
saldos, percentuais e comparações vêm prontos da API; o front formata e mostra.

O que o front pode fazer:

- **formatar** para a tela (R$, %, mês por extenso, "2 mil");
- **desenhar**: larguras de barras, escalas e posições de gráficos a partir de valores já prontos;
- **somar o que o usuário marcou na tela** (ex.: "Selecionados: R$ X" ou o total considerado na revisão da
  fatura, que depende das caixas marcadas antes de salvar): o back não tem como saber essa seleção;
- **converter o que o usuário digita** para o formato da API (ex.: `1234,5` → `"1234.50"`).

**Ainda calculam no front** (aguardando os campos prontos no back; quando chegarem, apague a conta daqui,
os testes dela e a meta de cobertura correspondente):

| Onde | O que calcula hoje |
| --- | --- |
| `features/summary/data-access/summary-statement.ts` | a tabela do resumo por pessoa inteira (divisão, centavos, líquidos) a partir de 6 listas |
| `features/summary/data-access/summary-view.ts` e `summary-page.component.ts` | comparação com o mês anterior, percentuais e medidores |
| `incomes-page`, `manual-expenses-page`, `card-expenses-page`, `card-import-review` | totais das listas (`sumAmounts`) |

## Receita de uma feature nova

1. `data-access/x.models.ts`: rode `npm run api:types` e dê nomes curtos aos tipos gerados
   (`export type X = ApiSchemas['XResponse']`).
2. `data-access/x.service.ts`: um método por rota do controller do back, usando `ApiService`.
3. `pages/x-page.component.ts`: a tela, com estado em `signal()`; use `remoteData()` se a busca depender do
   mês ou ano selecionado.
4. `components/x-form-dialog.component.ts`: formulário reativo com as mesmas regras do Joi do back. Os botões
   ficam **dentro** do `<form>` (assim Enter e "Salvar" enviam).
5. `x.routes.ts` + rota em `app.routes.ts` + item em `core/layout/navigation.ts`.
6. Testes ([testes.md](testes.md)): contrato do service, formulário e tela; acrescente a meta da área no
   `vitest.config.ts`.
7. Docs: a tela em [telas.md](telas.md) e o que mais mudou.

Regra prática: **cada módulo novo no back ganha uma pasta com o mesmo nome em `features/`**, uma rota em
`app.routes.ts` e um item em `navigation.ts` (um teste confere que todo item do menu aponta para uma rota
que existe).

## Do NestJS para o Angular

| NestJS | Angular |
| --- | --- |
| `app.module.ts` | `app.config.ts` + `app.routes.ts` |
| Módulo de feature | pasta em `features/` com seu `*.routes.ts` (carregada sob demanda) |
| `@Injectable()` service | `@Injectable()` service, a mesma ideia de injeção de dependência |
| Controller (rota HTTP) | componente de página (rota de tela) |
| Guard `CanActivate` | guard de rota (`CanActivateFn`) |
| Interceptor | interceptor HTTP (`HttpInterceptorFn`) |
| DTO | tipo gerado do OpenAPI, apelidado em `*.models.ts` |
| Pipe de validação (Joi) | `Validators` dos formulários reativos |
| `nest g service x` | `npx ng g service x` |

No Angular, "pipe" é só uma função de formatação usada no HTML (`{{ valor | brl }}`); não tem relação com os
pipes de validação do Nest.
