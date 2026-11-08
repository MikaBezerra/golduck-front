# Erros e observabilidade

Sem ferramenta externa: tudo fica no console do navegador, organizado, e ligado ao log do back pelo id da
requisição.

## Logger (`core/logging/logger.service.ts`)

- Níveis `debug`, `info`, `warn` e `error`, com hora, nível destacado, dados e o erro original.
- O nível mínimo vem do ambiente: tudo em desenvolvimento, `info` no develop e só `warn`/`error` em produção
  (`src/environments`).
- Use o logger em vez de `console.log` (o lint só deixa `console.error` e `console.warn`).

## Erros não tratados (`core/errors/global-error-handler.ts`)

- Viram um log com a rota atual e um **código de suporte**.
- O usuário vê um aviso amigável com o mesmo código. O mesmo erro repetido não gera avisos repetidos.

## Id da requisição e código de suporte

- Toda chamada à API leva o header `x-request-id` (um UUID gerado pelo front, `core/api/request-id.interceptor.ts`).
- O back usa o mesmo id no log dele e devolve no corpo do erro. Em falha de rede, o front usa o id que enviou.
- As mensagens de erro mostram os 8 primeiros caracteres como "código de suporte"; o log do front guarda o id
  completo. Com ele se acha a mesma requisição no log do back.

## Avisos e confirmações (`core/notification`)

- `NotificationService`: `success`, `info`, `error(erro)` (monta a mensagem a partir de um `ApiError`, com o
  código de suporte) e `unexpected(código)`.
- `ConfirmService.danger({ header, message, acceptLabel })`: confirmação antes de ações destrutivas, com o foco
  em "Cancelar". Devolve `true` se o usuário confirmar.

## Erros com tratamento próprio

As mensagens vêm prontas do back (em pt-BR). O front só decide **onde** mostrá-las e, em alguns casos,
acrescenta o que fazer:

| Código | Onde aparece |
| --- | --- |
| `CARD_SYNC_NOT_CONFIGURED`, `CARD_SYNC_NO_CREDIT_ACCOUNT`, `CARD_SYNC_ITEM_NOT_FOUND`, `PLUGGY_DISABLED`, `PLUGGY_UNAVAILABLE` | painel do resultado da sincronização (Faturas), com uma dica (`cardSyncErrorHint` em `features/card-sync/data-access/card-sync.models.ts`) |
| `PLUGGY_AUTH_FAILED` e os demais erros da sincronização | mesmo painel, só com a mensagem do back e o código de suporte |
| `CREDIT_CARD_BILL_DATE_OUT_OF_RANGE` | embaixo da data no ajuste do melhor dia da fatura (o front já confere o intervalo antes de enviar) |
| `CREDIT_CARD_BILLING_NOT_CONFIGURED` | aviso; a tela de Faturas nem busca o período sem vencimento e melhor dia |
| `CARD_EXPENSE_INSTALLMENT_INVALID` | embaixo da parcela em "Adicionar compra" e "Mudar de fatura" |
| `CARD_EXPENSE_MOVE_NOT_ALLOWED` | evitado: compras de upload já chegam com "Mudar de fatura" desligado e a explicação; se vier, vira aviso |
| `CARD_EXPENSE_INACTIVE_CATEGORY` / `_PERSON` | embaixo do campo de categoria ou pessoa |
| `SUMMARY_DISPATCH_PENDING_EXPENSES` | aviso no diálogo de envio (o botão já fica desligado com `pending.count > 0`) |

## Limite de tentativas (429)

A mensagem diz quanto esperar, a partir do header `Retry-After` (exposto pelo back no CORS).

## Versões

O rodapé mostra a versão do front (do `package.json`) e a da API (`GET /version`), com commit e ambiente na
dica. Ajuda a saber exatamente o que estava no ar quando algo deu errado.
