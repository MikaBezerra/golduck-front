# Documentação do front-end do Golduck

Guia de toda a documentação do front. Cada arquivo trata de um tema; comece pela arquitetura e siga para o
que precisar.

| Arquivo | O que explica | Atualize quando... |
| --- | --- | --- |
| [arquitetura.md](arquitetura.md) | pastas, como uma tela conversa com o back, estado com signals, a regra do **front burro** e a receita de uma feature nova | criar uma pasta, mudar o fluxo de dados ou o front passar a (ou deixar de) fazer alguma conta |
| [telas.md](telas.md) | cada tela: rota, o que mostra, o que o usuário pode fazer e quais rotas do back usa | criar, mudar ou remover uma tela ou ação |
| [api-e-tipos.md](api-e-tipos.md) | `ApiService`, envelope `{ data }`, erros (`ApiError`), tipos gerados do back e paginação | o back mudar um contrato ou surgir um código de erro tratado na tela |
| [autenticacao.md](autenticacao.md) | login, access token em memória, refresh token em cookie, renovação, guards e saída | mexer em sessão, login, guards ou interceptors |
| [erros-e-observabilidade.md](erros-e-observabilidade.md) | logger, erros não tratados, id da requisição, código de suporte, avisos e versões | mudar como erros são mostrados ou registrados |
| [visual-e-layout.md](visual-e-layout.md) | tema, cores, fontes, Tailwind + PrimeNG, moldura das telas e celular | mudar o visual, o menu ou o layout |
| [convencoes.md](convencoes.md) | nomes, dinheiro e mês, formulários, estilo de código | combinar uma convenção nova |
| [testes.md](testes.md) | como rodar, tipos de teste, auxiliares de `src/testing`, metas de cobertura por área | criar um tipo de teste, um auxiliar ou uma área com meta nova |
| [ambientes-e-deploy.md](ambientes-e-deploy.md) | endereço da API em cada ambiente, proxy local, Vercel e o que o back precisa liberar | mudar ambientes, domínios ou o deploy |
| [ci-cd.md](ci-cd.md) | workflows do GitHub, branches, versões (release-please) e configuração do repositório | mudar workflows ou o fluxo de branches |
| [fluxo-de-trabalho.md](fluxo-de-trabalho.md) | do debate ao commit: o que é "pronto", o `npm run verify`, commits e PRs | mudar o jeito de trabalhar |

## Regra de manutenção

**Toda implementação atualiza a documentação e os testes junto com o código.** Uma mudança só está pronta
quando:

1. o arquivo de `docs/` do tema reflete o que o código faz agora (e esta tabela, se surgiu tema novo);
2. os testes cobrem o comportamento novo, e as metas de cobertura da área continuam batendo
   (veja [testes.md](testes.md));
3. o `npm run verify` passa.

O checklist do PR repete esses itens (`.github/pull_request_template.md`).
