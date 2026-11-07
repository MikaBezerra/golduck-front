export interface NavItem {
    readonly label: string;
    /** Classe do ícone do PrimeIcons, ex.: `pi pi-wallet` (https://primeng.org/icons). */
    readonly icon: string;
    readonly route: string;
    /** Texto curto exibido no atalho da página inicial. */
    readonly description: string;
}

/**
 * Itens do menu lateral e dos atalhos da página inicial.
 * Cada feature nova adiciona o seu item aqui.
 */
export const NAV_ITEMS: readonly NavItem[] = [
    {
        label: 'Despesas',
        icon: 'pi pi-receipt',
        route: '/despesas',
        description: 'Lance e acompanhe os gastos do mês.',
    },
    {
        label: 'Faturas',
        icon: 'pi pi-file-import',
        route: '/faturas',
        description: 'Envie a fatura do cartão e organize as compras.',
    },
    {
        label: 'Entradas',
        icon: 'pi pi-arrow-circle-down',
        route: '/entradas',
        description: 'Quanto entra em cada mês do ano.',
    },
    {
        label: 'Cartões',
        icon: 'pi pi-credit-card',
        route: '/cartoes',
        description: 'Cartões de crédito usados nas despesas.',
    },
    {
        label: 'Categorias',
        icon: 'pi pi-tags',
        route: '/categorias',
        description: 'Organize as despesas por tipo de gasto.',
    },
    {
        label: 'Pessoas',
        icon: 'pi pi-users',
        route: '/pessoas',
        description: 'Quem participa das despesas da casa.',
    },
];
