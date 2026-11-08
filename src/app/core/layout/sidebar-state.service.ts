import { Injectable, signal } from '@angular/core';

import { storageKey } from '../storage/storage-key';

const STORAGE_KEY = storageKey('sidebarCollapsed');

/**
 * Menu lateral recolhido (só os ícones) ou aberto. É uma preferência de quem usa, então fica no
 * localStorage e vale para as próximas visitas e para as outras abas.
 */
@Injectable({ providedIn: 'root' })
export class SidebarStateService {
    private readonly state = signal(readStoredState());

    public readonly collapsed = this.state.asReadonly();

    public toggle(): void {
        this.set(!this.state());
    }

    public set(collapsed: boolean): void {
        this.state.set(collapsed);
        storeState(collapsed);
    }
}

function readStoredState(): boolean {
    try {
        return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
        return false;
    }
}

function storeState(collapsed: boolean): void {
    try {
        if (collapsed) {
            localStorage.setItem(STORAGE_KEY, '1');
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Sem acesso ao storage (aba anônima restrita, por exemplo): só não lembra a escolha.
    }
}
