# Telas

Todas as telas, menos o login, ficam dentro da moldura (`core/layout/shell`): menu, seletor de mês no topo e
rodapé ([visual-e-layout.md](visual-e-layout.md)). As telas mensais usam o **mês selecionado no topo**
(`SelectedMonthService`): trocar o mês ali atualiza a tela aberta, e o mês escolhido sobrevive a um F5.

| Rota | Tela | Pasta |
| --- | --- | --- |
| `/login` | Login | `features/auth` |
| `/` | Visão geral (abre pelo logo) | `features/summary` |
| `/resumo` | Resumo do mês em tabela | `features/summary` |
| `/despesas` | Despesas fora do cartão | `features/manual-expenses` |
| `/faturas` | Despesas do cartão e envio de fatura | `features/card-expenses` + `features/card-imports` |
| `/entradas` | Entradas e reservas do ano | `features/incomes` + `features/reserves` |
| `/cartoes` | Cartões | `features/credit-cards` |
| `/categorias` | Categorias | `features/categories` |
| `/pessoas` | Pessoas | `features/people` |

## Login (`/login`)

- E-mail e senha. O e-mail vai em minúsculas e sem espaços.
- Credenciais erradas mostram "E-mail ou senha incorretos."; outros erros mostram a mensagem do back (por
  exemplo, o limite de tentativas, com o tempo de espera).
- Depois de entrar, volta para a página que o usuário tentou abrir (`?redirect=`). Só aceita caminhos
  internos: um link para outro site ou de volta ao login cai na página inicial.
- Quem já tem sessão e abre `/login` vai para a página inicial.
- Back: `POST /auth/login` e `GET /auth/me` ([autenticacao.md](autenticacao.md)).

## Visão geral (`/`)

- Números do mês escolhido (ou do ano inteiro): entrada, despesas, reserva e saldo, com comparação com o mês
  anterior.
- Gráfico do ano por mês, despesas por categoria e por pessoa, e o líquido de cada pessoa com um medidor de
  quanto da parte dela já foi gasto.
- Back: `GET /summary?month=` e `GET /summary/annual?year=`.
- Ainda faz contas (comparação, percentuais e medidores): veja "Front burro" em
  [arquitetura.md](arquitetura.md).

## Resumo (`/resumo`)

- Tabela do mês com uma coluna de total e uma por pessoa ativa: entrada, o que é compartilhado (dividido
  igualmente), o que é de cada um e os líquidos. Linhas com seta abrem os detalhes (cada despesa, cada cartão).
- Pessoas inativas aparecem só se tiverem gasto individual no mês (e não entram na divisão).
- A tabela vem pronta do back (linhas, valores e estilos); o front só formata e mostra.
- Back: `GET /summary/statement?month=`.

## Despesas (`/despesas`)

- Despesas fora do cartão do mês selecionado, com categoria e pessoa (sem pessoa = compartilhada).
- Nova despesa: título, valor, categoria (a padrão já vem marcada), pessoa e "repetir até dezembro", que
  cria uma despesa independente em cada mês até o fim do ano (o diálogo mostra quantas).
- Editar: o mês fica travado e só o que mudou é enviado. Categoria ou pessoa desativada continua visível
  na despesa antiga, marcada como "(desativada)".
- Seleção de várias linhas: editar em lote (campo vazio = manter; "Ninguém" remove a pessoa) ou excluir.
  Trocar de mês limpa a seleção.
- Excluir pede confirmação e não pode ser desfeito.
- Back: `GET/POST/PATCH/DELETE /manual-expenses`, mais `GET /categories?includeInactive=true` e
  `GET /people?includeInactive=true` para os nomes.

## Faturas (`/faturas`)

Despesas do cartão escolhido no mês selecionado. As despesas entram só pelo envio da fatura; aqui elas
ganham apelido, categoria e pessoa.

- **Enviar fatura** (diálogo em 3 etapas):
  1. *Arquivo*: mês da fatura e arquivo do banco (`.csv` para Nubank e C6, `.pdf` com senha para Neon; até
     2 MB). Extensão, arquivo vazio e tamanho são conferidos antes de enviar.
  2. *Revisão*: o back lê o arquivo sem gravar nada (`POST /card-imports/preview`) e devolve cada compra com
     a sugestão de apelido, categoria e pessoa. O usuário pode mudar essas escolhas e excluir compras (com
     escopo de parcelas e "não perguntar de novo"). Mostra também o que será removido do mês.
  3. *Salvar*: o arquivo é enviado de novo com as escolhas (`POST /card-imports`). Só vão as compras em que o
     usuário mudou algo e as decisões de exclusão que mudam algo. Ao final, um resumo do que aconteceu.
  - Senha errada aparece no campo da senha; arquivo recusado volta para a primeira etapa; se a fatura mudou
    desde a pré-visualização, pede uma nova.
- **Fatura manual**: digitar os lançamentos (data, descrição, valor, parcela e final do cartão). Começa com o
  que o cartão já tem no mês; substitui tudo do mês. Sem nenhuma linha, pede confirmação antes de apagar tudo.
- **Histórico de envios**: lista os envios do cartão; excluir um envio apaga as despesas gravadas por ele e
  **não** restaura a situação anterior.
- **Editar** uma ou várias despesas: apelido, categoria e pessoa. Em compras parceladas, a mudança vale também
  para as próximas parcelas (o aviso diz quantas foram atualizadas).
- **Excluir / restaurar**: exclusão suave, com escopo (`month`, `forward`, `backward` ou `all`); despesas
  excluídas saem dos totais e os próximos envios as mantêm excluídas.
- Back: `/card-expenses` e `/card-imports` ([api-e-tipos.md](api-e-tipos.md)).

## Entradas (`/entradas`)

- Os 12 meses do ano do mês selecionado, cada um com a entrada e a reserva (o mês selecionado fica
  destacado). Setas trocam o ano.
- Nova entrada ou reserva: o mesmo valor em vários meses de uma vez; meses que já têm valor ficam bloqueados.
  Editar só muda o valor; excluir pede confirmação.
- Mostra também quanto já foi guardado no total (todos os anos).
- Back: `/incomes`, `/reserves` e `GET /reserves/totals`.

## Cartões, Categorias e Pessoas (`/cartoes`, `/categorias`, `/pessoas`)

Telas de cadastro com o mesmo jeito de funcionar:

- lista em ordem alfabética, com "Mostrar inativas" (categorias e pessoas) para reativar;
- cadastrar e editar num diálogo; desativar pede confirmação (o que já foi lançado continua ligado ao item);
- **Cartões**: nome e banco; o banco não muda depois de cadastrado (define o formato da fatura);
- **Categorias**: só o nome; nome repetido aparece embaixo do campo; a categoria padrão ("Outros") é usada
  quando nenhuma é escolhida;
- **Pessoas**: nome, e-mail e celular (opcionais; apagar o campo apaga o valor no back).
- Back: `/credit-cards`, `/categories` e `/people`.
