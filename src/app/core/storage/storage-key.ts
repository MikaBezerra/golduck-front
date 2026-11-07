/**
 * Prefixo de tudo o que a aplicação guarda no navegador (localStorage, sessionStorage e o nome
 * da trava entre abas). Ao reaproveitar o projeto, troque só aqui.
 */
const STORAGE_PREFIX = 'golduck';

/** `storageKey('selectedMonth')` → `"golduck.selectedMonth"` */
export function storageKey(name: string): string {
    return `${STORAGE_PREFIX}.${name}`;
}
