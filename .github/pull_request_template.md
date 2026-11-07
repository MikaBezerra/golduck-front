## O que muda

<!-- Resumo em uma ou duas frases. O título do PR deve seguir o padrão: feat: ..., fix: ..., chore: ... -->

## Como testar

<!-- Telas e passos para conferir a mudança (inclua o celular, 375px, se mexeu em layout). -->

## Checklist

- [ ] `npm run verify` passa localmente (format:check, lint, tipos dos testes, test:cov com as metas e build)
- [ ] Testes novos ou ajustados para o que mudou, sem baixar nenhuma meta de cobertura (`docs/testes.md`)
- [ ] Documentação do tema atualizada em `docs/` (e o guia `docs/README.md`, se surgiu tema novo)
- [ ] Front "burro": nenhuma conta nova com valores vindos do back (`docs/arquitetura.md`)
- [ ] Usa um endpoint novo ou alterado? Conferi o contrato no Swagger do back e rodei `npm run api:types`
- [ ] Mudou o endereço de algum ambiente? Atualizei `src/environments` e liberei o domínio em `API_CORS_ORIGINS` no back
