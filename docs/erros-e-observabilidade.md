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

## Limite de tentativas (429)

A mensagem diz quanto esperar, a partir do header `Retry-After` (exposto pelo back no CORS).

## Versões

O rodapé mostra a versão do front (do `package.json`) e a da API (`GET /version`), com commit e ambiente na
dica. Ajuda a saber exatamente o que estava no ar quando algo deu errado.
