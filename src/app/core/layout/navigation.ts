export interface NavItem {
    readonly label: string;
    /** Classe do ícone do PrimeIcons, ex.: `pi pi-wallet` (https://primeng.org/icons). */
    readonly icon: string;
    readonly route: string;
    /** Só fica ativo na rota exata (o Resumo é `/`, que é o começo de todas as outras). */
    readonly exact?: boolean;
}

export interface NavGroup {
    readonly label: string;
    readonly items: readonly NavItem[];
    /** No celular, os grupos que não cabem na barra de baixo ficam no botão "Mais". */
    readonly inMobileBar: boolean;
}

/** Página inicial, sempre no topo do menu e na barra do celular. */
export const HOME_ITEM: NavItem = { label: 'Resumo', icon: 'pi pi-chart-bar', route: '/', exact: true };

/**
 * Itens do menu, agrupados. Cada feature nova adiciona o seu item aqui.
 * No celular, a barra de baixo mostra o Resumo, os grupos com `inMobileBar` e o botão "Mais".
 */
export const NAV_GROUPS: readonly NavGroup[] = [
    {
        label: 'Lançamentos',
        inMobileBar: true,
        items: [
            { label: 'Despesas', icon: 'pi pi-receipt', route: '/despesas' },
            { label: 'Faturas', icon: 'pi pi-file-import', route: '/faturas' },
            { label: 'Entradas', icon: 'pi pi-arrow-circle-down', route: '/entradas' },
        ],
    },
    {
        label: 'Cadastros',
        inMobileBar: false,
        items: [
            { label: 'Cartões', icon: 'pi pi-credit-card', route: '/cartoes' },
            { label: 'Categorias', icon: 'pi pi-tags', route: '/categorias' },
            { label: 'Pessoas', icon: 'pi pi-users', route: '/pessoas' },
        ],
    },
];
