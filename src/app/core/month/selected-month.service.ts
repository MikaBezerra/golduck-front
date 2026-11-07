import { computed, Injectable, signal } from '@angular/core';

import { addMonths, currentMonthKey, isMonthKey, parseMonthKey } from '../../shared/month/month';
import { storageKey } from '../storage/storage-key';

const STORAGE_KEY = storageKey('selectedMonth');

/**
 * Mês que o usuário está olhando (seletor no topo da tela).
 * Despesas e demais telas mensais leem daqui, então trocar o mês no topo
 * atualiza todas elas. Fica guardado na aba do navegador para sobreviver a um F5.
 */
@Injectable({ providedIn: 'root' })
export class SelectedMonthService {
    private readonly selected = signal(readStoredMonth() ?? currentMonthKey());

    /** Mês selecionado no formato da API (`"2026-11"`). */
    public readonly month = this.selected.asReadonly();
    public readonly year = computed(() => parseMonthKey(this.selected()).year);
    public readonly isCurrentMonth = computed(() => this.selected() === currentMonthKey());

    public set(month: string): void {
        if (!isMonthKey(month)) {
            return;
        }

        this.selected.set(month);
        storeMonth(month);
    }

    public next(): void {
        this.set(addMonths(this.selected(), 1));
    }

    public previous(): void {
        this.set(addMonths(this.selected(), -1));
    }

    public goToCurrentMonth(): void {
        this.set(currentMonthKey());
    }
}

function readStoredMonth(): string | null {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);

        return stored && isMonthKey(stored) ? stored : null;
    } catch {
        return null;
    }
}

function storeMonth(month: string): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, month);
    } catch {
        // Sem acesso ao storage (aba anônima restrita, por exemplo): só não lembra o mês.
    }
}
