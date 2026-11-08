# API e tipos

## `ApiService` (`core/api/api.service.ts`)

Toda chamada ao back passa por ele:

- prefixa o endereço da API do ambiente (`/api` no local; veja [ambientes-e-deploy.md](ambientes-e-deploy.md));
- `get(rota, query)`: monta a query string ignorando valores `undefined` e `null`;
- `post`, `patch`, `delete`: enviam o corpo como JSON (ou `FormData`, nos uploads);
- `options.headers`: headers extras de uma chamada (ex.: `Idempotency-Key` no envio do resumo por e-mail);
- **desembrulha o envelope** `{ data }`: o service recebe só o conteúdo; respostas 204 viram `undefined`;
- converte qualquer falha em `ApiError`.

Os services das features só montam a chamada (rota, método, query, corpo) e devolvem o `Observable`.
Exemplo: `this.api.get<Person[]>('people', includeInactive ? { includeInactive } : undefined)`.

## Erros: `ApiError` (`core/api/api-error.ts`)

O back responde erros como `{ error: { code, message, requestId, details? } }`. O front transforma em
`ApiError` com:

| Campo | Para quê |
| --- | --- |
| `status` | status HTTP (0 = sem conexão) |
| `code` | código estável para decidir o que fazer (`VALIDATION_ERROR`, `CATEGORY_NAME_CONFLICT`...) |
| `message` | texto pronto, em português, para mostrar ao usuário |
| `requestId` | id da requisição (o mesmo do log do back); os 8 primeiros caracteres viram o "código de suporte" |
| `details` | erros por campo (`field`, `code`, `message`) nas validações |
| `retryAfterSeconds` | em 429: quanto esperar (header `Retry-After`) |

Códigos gerados pelo próprio front: `NETWORK_ERROR` (sem conexão) e erros inesperados com o status HTTP.

### Como as telas tratam os erros

1. Código conhecido que pertence a um campo (ex.: `CATEGORY_NAME_CONFLICT` → nome): `setServerError` coloca a
   mensagem embaixo do campo.
2. Erros de validação (`details`): `applyServerErrors` encaixa cada um no campo do formulário. Entende
   `name`, `changes.amount` (com `fieldMap` quando o nome difere), `months[0]` e `transactions[2].amount`
   (linha de um `FormArray`).
3. O resto vira aviso (`NotificationService.error`), com o código de suporte
   ([erros-e-observabilidade.md](erros-e-observabilidade.md)).

As mensagens vêm prontas do back e são exibidas como estão.

## Tipos gerados do back

Os tipos de tudo o que entra e sai da API vêm do OpenAPI (Swagger) do back:

- `src/app/core/api/api-schema.d.ts`: gerado, **não edite à mão**;
- `src/app/core/api/api-types.ts`: expõe esses tipos como `ApiSchemas`;
- cada `*.models.ts` só dá nomes curtos a eles (`export type Category = ApiSchemas['CategoryResponse']`) e
  guarda os limites usados nos formulários (ex.: `CATEGORY_NAME_MAX_LENGTH`), iguais aos do back.

Quando o back mudar um DTO, suba o back com `SWAGGER_ENABLE=1` no `.env` e rode:

```sh
npm run api:types
```

Se algum campo mudou, o `npm run build` aponta onde o front precisa de ajuste, e os testes de contrato dos
services ([testes.md](testes.md)) mostram rotas e corpos que mudaram. Commite o `api-schema.d.ts` junto.

## Paginação

O back pagina com `page` (a partir de 1) e `pageSize` (1 a 100) e responde
`{ items, page, pageSize, total, totalPages }`. Em `shared/data/pagination.ts`:

- `PageQuery` e `Page<T>`;
- `pageParams(query, filtros)`: monta os `HttpParams` (corrige valores fora dos limites e ignora filtros vazios)
  para usar em `api.get<Page<T>>('rota', pageParams(...))`;
- `pageQueryFromLazyLoad(evento)` e `firstRowOf(página)`: convertem o lazy load do `p-table` (`first`/`rows`)
  em `page`/`pageSize` e de volta.

As listas atuais do Golduck não são paginadas.

## Rotas do back usadas pelo front

| Feature | Rotas |
| --- | --- |
| auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| version | `GET /version` |
| people | `GET /people[?includeInactive=true]`, `GET /people/:id`, `POST /people`, `PATCH /people/:id` |
| categories | `GET /categories[?includeInactive=true]`, `GET /categories/:id`, `POST /categories`, `PATCH /categories/:id` |
| credit-cards | `GET /credit-cards`, `GET /credit-cards/:id`, `POST /credit-cards`, `PATCH /credit-cards/:id` |
| incomes | `GET /incomes?year=`, `GET/PATCH/DELETE /incomes/:month`, `POST /incomes` |
| reserves | `GET /reserves?year=`, `GET /reserves/totals`, `PATCH/DELETE /reserves/:month`, `POST /reserves` |
| manual-expenses | `GET /manual-expenses?month=`, `GET /manual-expenses/:id`, `POST`, `PATCH` e `DELETE /manual-expenses` (`{ ids, changes }` / `{ ids }`) |
| card-expenses | `GET /card-expenses?month=&cardId=[&includeExcluded=true]`, `GET /card-expenses/:id`, `PATCH /card-expenses`, `DELETE /card-expenses` e `POST /card-expenses/restore` (`{ ids, scope }`) |
| card-imports | `POST /card-imports/preview` e `POST /card-imports` (multipart), `POST /card-imports/manual`, `GET /card-imports[?cardId=&month=]`, `DELETE /card-imports/:id` |
| summary | `GET /summary?month=`, `GET /summary/annual?year=`, `GET /summary/statement?month=` |
| summary-dispatch | `GET /summary/dispatches/preview?month=`, `POST /summary/dispatches` (header `Idempotency-Key`; `{ month, personIds? }`), `GET /summary/dispatches/email?month=&personId=` (só ADMIN) |

Cada linha desta tabela tem um teste de contrato no `*.service.spec.ts` da feature.
