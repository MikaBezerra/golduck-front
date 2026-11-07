# Fluxo de trabalho

## Do pedido ao commit

1. **Debate**: a ideia é discutida antes de qualquer código (regras, telas, contrato com o back).
2. **Implementação**, depois do "pode implementar".
3. **Testes e docs junto com o código** (regra do projeto, veja abaixo).
4. **`npm run verify`** passando.
5. **Commit local**, um por assunto. O push é feito só quando combinado.

Front e back andam em sessões separadas: mudanças de contrato (campos novos, rotas) são combinadas antes, e o
front só adapta depois que o back entrega.

## O que é "pronto"

Uma mudança só está pronta quando:

- [ ] o código faz o que foi combinado e segue as [convenções](convencoes.md);
- [ ] o front não ganhou contas com valores do back ([front burro](arquitetura.md));
- [ ] os **testes** cobrem o comportamento novo e as metas de cobertura continuam batendo ([testes.md](testes.md));
- [ ] a **documentação** do tema em `docs/` foi atualizada (e o [guia](README.md), se surgiu tema novo);
- [ ] mudou contrato com o back? Rodou `npm run api:types` e commitou o `api-schema.d.ts`;
- [ ] mexeu em layout? Conferiu no celular (375px);
- [ ] o `npm run verify` passa.

## `npm run verify`

Roda localmente o mesmo que o CI: `format:check`, `lint`, `typecheck:spec`, `test:cov` (com as metas) e
`build`. Se passou, nada que as checagens automáticas enxergam quebrou. O que ele **não** vê:

- erros de lógica fora dos testes: confira a tela funcionando;
- front e back desencontrados: rode `npm run api:types` quando o back mudar;
- visual e uso no celular.

## Commits

- Conventional Commits em português depois do prefixo, conferido pelo commitlint no hook `commit-msg` do Husky:
  `feat: ...`, `fix: ...`, `refactor: ...`, `test: ...`, `docs: ...`, `chore: ...`, `ci: ...`.
- Um commit por assunto. Testes e docs de uma mudança vão no mesmo commit dela.
- Sem `Co-Authored-By` e sem menções a ferramentas de IA nos commits e arquivos.

## Pull requests

O template (`.github/pull_request_template.md`) pede: o que muda, como testar e o checklist acima. O título do
PR vira a mensagem do squash merge e entra no `CHANGELOG.md`.
