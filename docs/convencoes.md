# Convenções

## Nomes e pastas

- Arquivos com o tipo no nome, como no back: `category.service.ts`, `auth.guard.ts`,
  `categories-page.component.ts`, `category-form-dialog.component.ts`.
- Rotas da tela em português (`/categorias`); pastas e código em inglês, espelhando o back.
- Uma pasta em `features/` por módulo do back, com o mesmo nome ([arquitetura.md](arquitetura.md)).

## Dados

- **Front burro**: o front não faz contas com valores do back; totais, divisões, saldos e percentuais vêm
  prontos ([arquitetura.md](arquitetura.md)).
- **Dinheiro** trafega como texto (`"1234.56"`), igual à API. Para exibir, `{{ valor | brl }}`. O campo de valor
  (`p-inputnumber`) trabalha com `number`, convertido de e para a API com `numberToAmount`/`amountToNumber`
  (`shared/money`). Nunca some números com vírgula: se for inevitável somar algo, some em centavos inteiros.
- **Mês** trafega como `"AAAA-MM"` (`shared/month`; para exibir, `{{ mes | month }}`).
- **Datas** trafegam como `"AAAA-MM-DD"` e são exibidas com o pipe `isoDate`, sem erro de fuso horário.
- **Celular**: o usuário digita `(11) 99999-9999` e o back recebe `+5511999999999` (`shared/phone`).

## Formulários

- Formulários reativos, com as **mesmas regras do Joi do back** (obrigatório, tamanhos, limites), usando os
  limites exportados nos `*.models.ts`.
- Os botões ficam **dentro** do `<form>`, para Enter e "Salvar" enviarem.
- Ao salvar com erro, `revealFormErrors(form)` mostra todos os erros de uma vez; `<app-field-error>` mostra a
  mensagem de cada campo em português.
- Erros do back vão para o campo certo (`setServerError` e `applyServerErrors`, veja
  [api-e-tipos.md](api-e-tipos.md)); só o que não pertence a um campo vira aviso.
- Na edição, envie só o que mudou (reenviar uma categoria ou pessoa desativada, por exemplo, daria erro no back).
- Campos opcionais vazios vão como `null` quando o back usa `null` para apagar o valor.

## Telas

- Estado em `signal()`; dados que dependem do mês/ano em `remoteData()`.
- Componentes com `ChangeDetectionStrategy.OnPush`.
- Ações destrutivas pedem confirmação (`ConfirmService.danger`).
- Mensagens ao usuário em português, curtas e no tom das que já existem ("Despesa lançada.", "Nada foi
  alterado.").

## Código

- Prettier: 4 espaços, aspas simples, 120 colunas. ESLint (angular-eslint + typescript-eslint): acessibilidade
  explícita (`public`/`protected`/`private`), sem `any`, sem `!` de não-nulo (liberado nos testes), `===`
  sempre, sem `console.log`.
- Comentários em português explicando o **porquê**, não o óbvio.
- Commits: Conventional Commits em português depois do prefixo (`feat: ...`, `fix: ...`), um por assunto
  ([fluxo-de-trabalho.md](fluxo-de-trabalho.md)).
