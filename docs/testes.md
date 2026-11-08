# Testes

## Como rodar

| Comando | O que faz |
| --- | --- |
| `npm test` | roda todos os testes uma vez |
| `npm run test:watch` | roda a cada alteração |
| `npm run test:cov` | testes com cobertura e metas mínimas (relatório em `coverage/`, abra o `index.html`) |
| `npm run typecheck:spec` | confere os tipos dos testes e dos auxiliares (o build só confere os do app) |
| `npm run verify` | tudo o que o CI roda, inclusive os dois acima |

Os testes rodam no Vitest, pelo builder de testes do Angular (`ng test`), num navegador simulado (jsdom).
`describe`, `it`, `expect` e `vi` são globais.

## O que testar e como

| Tipo | Para quê | Exemplo |
| --- | --- | --- |
| Funções puras | contas, conversões e formatação | `shared/money/money.spec.ts`, `shared/month/month.spec.ts` |
| Contrato com o back | cada service chama a rota, o método, a query e o corpo certos e devolve o `data` | `features/people/data-access/person.service.spec.ts` |
| Núcleo | sessão, renovação do token, guards, interceptors, logger, erros | `core/auth/*.spec.ts` |
| Formulários | validação (as mesmas regras do back), o corpo enviado e os erros do back nos campos | `features/manual-expenses/components/expense-form-dialog.component.spec.ts` |
| Telas | carregar, recarregar quando o mês muda, confirmar e excluir, avisos | `features/registry-pages.spec.ts`, `features/incomes/pages/incomes-page.component.spec.ts` |

Regras:

- **Teste o comportamento, não o HTML**: o que a tela envia ao back, o que mostra (sinais e mensagens) e o que
  acontece em cada erro. Mudanças de layout não devem quebrar testes.
- **Nada sai para a rede**: services usam o `HttpTestingController`; telas e diálogos recebem services dublês.
- **Um cenário por `it`**, com nome em português dizendo o que deve acontecer ("não envia com nome em branco").
- Não invista em testes de código que vai sair (as contas do resumo que vão para o back; veja "Front burro" em
  [arquitetura.md](arquitetura.md)).

## Auxiliares (`src/testing`)

Ficam fora do app (excluídos no `tsconfig.app.json`) e são conferidos pelo `typecheck:spec`.

| Arquivo | O que oferece |
| --- | --- |
| `http-testing.ts` | `setupHttpTesting()`, `expectApiCall(http, 'POST', 'people')`, `queryOf(req)`, `respondData`, `respondNoContent`, `respondError` |
| `components.ts` | `renderComponent(Comp, inputs, providers)`, `openDialog(...)` (abre com `visible = true`), `internals<T>(fixture)` para acessar membros `protected` (form, save...) e `apiError(status, code, message, details)` para simular erros do back |
| `mocks.ts` | `notificationsMock()` e `confirmMock(resposta)` |
| `fixtures.ts` | registros de exemplo no formato da API: `aPerson()`, `aCategory()`, `aCreditCard()`, `aSyncedCreditCard()` (com ciclo e sincronização), `aCardSync()`, `aCardBill()`, `anIncome()`, `aReserve()`, `aManualExpense()`, `aCardExpense()` (cada um aceita só o que o teste quer mudar) |
| `lookups.ts` | dublê do `ExpenseLookupsService` (categorias e pessoas das telas de despesas) |

Exemplo de teste de contrato:

```ts
it('cria com POST e o corpo do formulário', async () => {
    const result = firstValueFrom(service.create({ name: 'Bruno' }));
    const request = expectApiCall(http, 'POST', 'people');

    expect(request.request.body).toEqual({ name: 'Bruno' });
    respondData(request, aPerson({ name: 'Bruno' }));

    await expect(result).resolves.toMatchObject({ name: 'Bruno' });
});
```

Exemplo de teste de formulário:

```ts
const fixture = openDialog(CategoryFormDialogComponent, { category: null }, [
    { provide: CategoryService, useValue: categories },
    { provide: NotificationService, useValue: notifications },
]);
const dialog = internals<{ form: FormGroup; save(): void }>(fixture);

dialog.form.setValue({ name: '  Farmácia ' });
dialog.save();

expect(categories.create).toHaveBeenCalledWith({ name: 'Farmácia' });
```

## Metas de cobertura

A cobertura mede quanto do código os testes executam. O `test:cov` (e portanto o `verify` e o CI) **falha se
alguma meta não for atingida**.

- **Por área** (`vitest.config.ts`): utilitários, núcleo, services de cada feature (95%), formulários, envio de
  fatura e telas. As metas ficam um pouco abaixo do que os testes cobrem hoje, para que uma mudança que derrube
  a cobertura de uma área seja barrada.
- **Piso global** (`angular.json`, `coverageThresholds`): vale para o projeto todo, inclusive o que ainda não
  tem meta própria (layout, gráficos e telas do resumo, que serão refeitas quando o back entregar os valores
  prontos).

Hoje: cerca de 270 testes e 73% das linhas cobertas.

## A cada implementação

1. Escreva ou ajuste os testes do que mudou (contrato do service, formulário, tela).
2. Área nova? Acrescente a meta dela no `vitest.config.ts`.
3. Cobertura subiu bastante? Suba as metas da área (nunca baixe uma meta para fazer o `verify` passar: escreva
   o teste que falta).
4. Rode `npm run verify`.
