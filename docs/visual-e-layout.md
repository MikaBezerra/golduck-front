# Visual e layout

## Identidade visual

- Só modo escuro (classe `app-dark` no `<html>`, em `src/index.html`).
- Cores (`core/config/theme.preset.ts`): preto meia-noite (`#02070A`) de fundo, azul elétrico (`#0297DE`) como
  cor principal, laranja cantalupo (`#FC734D`) para destaques e texto quase branco.
- Fontes: Plus Jakarta Sans (texto) e Sora (títulos e números grandes), instaladas pelo npm (`@fontsource-variable`).
- Marca: o "d" do Golduck que gira como moeda (`core/layout/brand-logo.component.ts`,
  `shared/ui/brand-mark.component.ts` e `brand-name.component.ts`), o favicon em `public/` e a ilustração de
  fundo em `public/images`.

## PrimeNG + Tailwind

- Os componentes do PrimeNG leem os **tokens** do tema (`theme.preset.ts`): trocar uma cor ali muda botões,
  campos, tabelas e diálogos de uma vez. A tradução do PrimeNG para português fica em `primeng-pt-br.ts`.
- O Tailwind cuida de espaçamento e grid. As cores e fontes da marca viram classes (`bg-card`, `border-line`,
  `text-cantaloupe`, `bg-income`, `font-display`...), definidas em `src/styles.css` (`@theme`).
- A ordem das camadas de CSS (`theme, base, primeng, components, utilities`) deixa as classes do Tailwind
  vencerem os estilos do PrimeNG quando preciso.

## Moldura das telas (`core/layout`)

- **Telas grandes**: menu lateral (`sidebar-nav`) com os grupos de `navigation.ts`. O botão no canto esquerdo do
  topo recolhe o menu para uma faixa só com os ícones (o nome de cada item aparece num balão ao passar o mouse ou
  focar pelo teclado, e continua lá para leitores de tela). A escolha fica no `SidebarStateService`
  (`sidebar-state.service.ts`), guardada no localStorage para valer nas próximas visitas.
- **Celular**: barra no pé da tela (`bottom-nav`) com o Resumo, os grupos marcados `inMobileBar` e um botão
  "Mais" para o resto.
- **Topo**: seletor de mês (`month-picker`, com setas e um calendário de meses; no celular o mês aparece
  abreviado) e quem está logado (`user-badge`).
- **Rodapé** (`shared/ui/app-footer`): direitos autorais e as versões.
- O título da aba segue o padrão "Página · Golduck" (`app-title.strategy.ts`, a partir do `title` de cada rota).

## Celular

Toda mudança de layout precisa funcionar em 375px de largura (o checklist do PR lembra disso). Para esconder ou
mostrar coisas por tamanho de tela, prefira as classes do Tailwind (`sm:`, `lg:`); quando o TypeScript precisa
saber o tamanho (formato de data, rótulos de gráfico), use `mediaQuery()` (`shared/ui/media-query.ts`).

## Acessibilidade

O lint dos templates inclui as regras de acessibilidade do angular-eslint (rótulos, foco, elementos clicáveis).
Mensagens de erro de campo usam `role="alert"`.
