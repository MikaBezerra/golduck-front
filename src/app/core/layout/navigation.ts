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
export const NAV_ITEMS: readonly NavItem[] = [];
