## O que muda

<!-- Resumo em uma ou duas frases. O título do PR deve seguir o padrão: feat: ..., fix: ..., chore: ... -->

## Como testar

<!-- Telas e passos para conferir a mudança (inclua o celular, 375px, se mexeu em layout). -->

## Checklist

- [ ] `npm run format:check`, `npm run lint`, `npm run test:cov` e `npm run build` passam localmente
- [ ] Usa um endpoint novo ou alterado? Conferi o contrato no Swagger do back e rodei `npm run api:types`
- [ ] Mudou o endereço de algum ambiente? Atualizei `src/environments` e liberei o domínio em `API_CORS_ORIGINS` no back
