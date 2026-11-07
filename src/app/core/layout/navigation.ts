export interface NavItem {
    readonly label: string;
    /** Classe do ícone do PrimeIcons, ex.: `pi pi-wallet` (https://primeng.org/icons). */
    readonly icon: string;
    readonly route: string;
}

/**
 * Itens do menu lateral (o Resumo, página inicial, fica fixo no topo do menu).
 * Cada feature nova adiciona o seu item aqui.
 */
export const NAV_ITEMS: readonly NavItem[] = [
    {
        label: 'Despesas',
        icon: 'pi pi-receipt',
        route: '/despesas',
    },
    {
        label: 'Faturas',
        icon: 'pi pi-file-import',
        route: '/faturas',
    },
    {
        label: 'Entradas',
        icon: 'pi pi-arrow-circle-down',
        route: '/entradas',
    },
    {
        label: 'Cartões',
        icon: 'pi pi-credit-card',
        route: '/cartoes',
    },
    {
        label: 'Categorias',
        icon: 'pi pi-tags',
        route: '/categorias',
    },
    {
        label: 'Pessoas',
        icon: 'pi pi-users',
        route: '/pessoas',
    },
];
