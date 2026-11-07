# CI/CD e versões

## Workflows (`.github/workflows`)

| Workflow | Quando roda | O que faz |
| --- | --- | --- |
| `ci.yml` | PR para `develop`/`main`, push nessas branches e manual | formatação, lint, tipos dos testes, testes com metas de cobertura (relatório como artefato por 14 dias) e build |
| `pr-title.yml` | abertura/edição de PR | exige título no padrão Conventional Commits, usado no squash merge |
| `release.yml` | push na `main` | [release-please](https://github.com/googleapis/release-please): mantém um PR de release com `CHANGELOG.md` e versão; ao fazer merge, cria a tag `vX.Y.Z` e a release |
| `deploy.yml` | push na `develop` (preview na Vercel) e na `main` (produção) | build com a configuração do Angular do ambiente e publicação na Vercel. **Desligado** até a variável `DEPLOY_ENABLED` ser `true` |

O `npm run verify` roda localmente os mesmos passos do `ci.yml` ([fluxo-de-trabalho.md](fluxo-de-trabalho.md)).
O `.github/dependabot.yml` abre PRs semanais (segundas) para a `develop`.

## Branches e versões

Fluxo: branch da feature → PR (squash) para `develop` → PR de `develop` para `main` → release-please.

- O título do PR segue o Conventional Commits, em português depois do prefixo (`feat: tabela do resumo`).
- `feat` sobe a versão minor; `fix` sobe a patch; `feat!`/`BREAKING CHANGE` sobe a major (antes da 1.0, `feat`
  sobe a minor).
- A versão do `package.json` aparece no rodapé ([erros-e-observabilidade.md](erros-e-observabilidade.md)).

## O que configurar no GitHub (Settings)

- **Environments** `develop` e `production` (sem secrets próprios: o front não tem segredos), cada um aceitando
  deploy só da sua branch (`develop` e `main`).
- **Secrets** do repositório: `VERCEL_TOKEN`.
- **Variables** do repositório: `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` (do `.vercel/project.json` gerado por
  `npx vercel link`) e `DEPLOY_ENABLED=true` quando o deploy estiver pronto.
- **Ruleset** na `develop`: PR obrigatório, só squash e os checks `Formatação, lint, testes e build` e
  `Título no padrão Conventional Commits`. O administrador do repositório pode passar por cima (por exemplo,
  para um force push).
- **Pull Requests**: só squash merge, com o título do PR como mensagem, e branch apagada depois do merge. Em
  Actions, as workflows podem abrir PRs (necessário para o release-please).
