# Golduck — front-end

Interface web do **Golduck** (projeto Finanças) — *Make your money count.* Consome a API do back-end
([golduck-back](https://github.com/MikaBezerra/golduck-back), NestJS) e segue a mesma organização por módulos.

Angular 21 · PrimeNG 21 · Tailwind CSS 4 · signals · Vitest.

## Como rodar

Pré-requisitos: Node 22 (`^22.12`, versão no [`.nvmrc`](.nvmrc): `nvm use`) e o back-end rodando em
`http://localhost:3000` (com `API_CORS_ORIGINS=http://localhost:4200` no `.env` dele).

```sh
npm install        # também ativa os hooks do Git (Husky)
npm start          # http://localhost:4200
```

Para entrar, use um usuário criado no back com `npm run admin:create`.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm start` | sobe o front em modo desenvolvimento (4200), com proxy de `/api` para o back |
| `npm run build` | versão de produção em `dist/` (`build:develop` para o ambiente develop) |
| `npm test` / `test:watch` | testes uma vez / a cada alteração |
| `npm run test:cov` | testes com cobertura e metas mínimas (relatório em `coverage/`) |
| `npm run lint` | ESLint |
| `npm run format` | formata com Prettier (`format:check` só confere) |
| `npm run typecheck:spec` | confere os tipos dos testes |
| `npm run api:types` | gera os tipos da API a partir do Swagger do back |
| **`npm run verify`** | **tudo o que o CI roda:** `format:check`, lint, `typecheck:spec`, `test:cov` e build |

Antes de commitar, rode `npm run verify`. A mensagem do commit é conferida pelo commitlint no padrão
Conventional Commits (`feat: ...`, `fix: ...`, em português depois do prefixo).

## Documentação

Toda a documentação fica em [`docs/`](docs/README.md), um arquivo por tema: arquitetura (e a regra do front
"burro"), telas, API e tipos, autenticação, erros e observabilidade, visual e layout, convenções, testes,
ambientes e deploy, CI/CD e o fluxo de trabalho.

**Toda implementação atualiza a documentação e os testes junto com o código** (veja
[docs/fluxo-de-trabalho.md](docs/fluxo-de-trabalho.md)).

## Licença

[MIT](LICENSE) © 2026 Mikaell Silva.
