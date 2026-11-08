import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from 'primeng/button';

import { cardSyncErrorHint, type CardSyncResult, describeSyncSummary } from '../data-access/card-sync.models';

interface ResultView {
    readonly cardId: string;
    readonly cardName: string;
    readonly lines: readonly string[];
    readonly error: string | null;
    readonly hint: string | null;
}

/**
 * Resultado de "Atualizar" (um cartão) ou "Atualizar todos": o que mudou em cada cartão (criadas,
 * alteradas, removidas...) e o erro de quem falhou, com uma dica do que fazer.
 */
@Component({
    selector: 'app-card-sync-result',
    imports: [Button],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section
            class="relative mb-4 rounded-2xl border px-4 py-3 pr-12 backdrop-blur-md"
            [class]="failed() ? 'border-red-400/40 bg-red-400/10' : 'border-primary/40 bg-primary/10'"
            aria-live="polite"
            aria-label="Resultado da sincronização"
        >
            <h2 class="m-0 mb-2 text-base font-semibold">
                {{ failed() ? 'Sincronização com problemas' : 'Sincronização concluída' }}
            </h2>
            <ul class="m-0 flex list-none flex-col gap-2 p-0">
                @for (item of views(); track item.cardId) {
                    <li>
                        @if (views().length > 1) {
                            <span class="font-medium">{{ item.cardName }}</span>
                        }
                        @if (item.error; as error) {
                            <p class="m-0 text-sm">
                                <i class="pi pi-exclamation-triangle mr-1 text-cantaloupe" aria-hidden="true"></i>
                                {{ error }}
                            </p>
                            @if (item.hint; as hint) {
                                <p class="m-0 text-sm text-muted-color">{{ hint }}</p>
                            }
                        } @else {
                            <ul class="m-0 list-disc pl-5 text-sm">
                                @for (line of item.lines; track line) {
                                    <li>{{ line }}</li>
                                }
                            </ul>
                        }
                    </li>
                } @empty {
                    <li class="text-sm text-muted-color">Nenhum cartão com a sincronização configurada.</li>
                }
            </ul>
            <p-button
                icon="pi pi-times"
                [text]="true"
                [rounded]="true"
                severity="secondary"
                size="small"
                ariaLabel="Fechar resultado da sincronização"
                styleClass="absolute top-2 right-2"
                (onClick)="dismissed.emit()"
            />
        </section>
    `,
})
export class CardSyncResultComponent {
    public readonly results = input.required<readonly CardSyncResult[]>();
    public readonly dismissed = output();

    protected readonly views = computed<ResultView[]>(() =>
        this.results().map((result) => ({
            cardId: result.cardId,
            cardName: result.cardName,
            lines: result.summary ? describeSyncSummary(result.summary) : [],
            error: result.error?.message ?? null,
            hint: result.error ? cardSyncErrorHint(result.error.code) : null,
        })),
    );
    protected readonly failed = computed(() => this.views().some((view) => view.error !== null));
}
