import { DatePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    effect,
    inject,
    input,
    model,
    output,
    signal,
    untracked,
} from '@angular/core';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tooltip } from 'primeng/tooltip';

import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { formatMonth } from '../../../shared/month/month';
import { MonthPipe } from '../../../shared/month/month.pipe';
import type { CreditCard } from '../../credit-cards/data-access/credit-card.models';
import type { CardImport } from '../data-access/card-import.models';
import { CardImportService } from '../data-access/card-import.service';

/** Envios de fatura do cartão, do mais recente para o mais antigo, com opção de excluir. */
@Component({
    selector: 'app-card-import-history-dialog',
    imports: [DatePipe, Button, Dialog, TableModule, Tooltip, MonthPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './card-import-history-dialog.component.html',
})
export class CardImportHistoryDialogComponent {
    public readonly visible = model(false);
    public readonly card = input.required<CreditCard>();
    /** Avisa a página que despesas mudaram (um envio foi excluído). */
    public readonly changed = output();

    private readonly cardImports = inject(CardImportService);
    private readonly notifications = inject(NotificationService);
    private readonly confirm = inject(ConfirmService);

    protected readonly imports = signal<CardImport[]>([]);
    protected readonly loading = signal(false);

    public constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => this.load());
            }
        });
    }

    protected async remove(cardImport: CardImport): Promise<void> {
        const despesas = cardImport.expenseCount === 1 ? '1 despesa' : `${cardImport.expenseCount} despesas`;
        const confirmed = await this.confirm.danger({
            header: 'Excluir envio',
            message:
                `Excluir o envio de ${formatMonth(cardImport.month)} (${cardImport.fileName})? ` +
                `As ${despesas} gravadas por ele serão apagadas, e a situação anterior não é restaurada.`,
            acceptLabel: 'Excluir',
        });

        if (!confirmed) {
            return;
        }

        this.cardImports.delete(cardImport.id).subscribe({
            next: () => {
                this.notifications.success('Envio excluído.');
                this.changed.emit();
                this.load();
            },
            error: (error: unknown) => this.notifications.error(error),
        });
    }

    private load(): void {
        this.loading.set(true);

        this.cardImports.findAll({ cardId: this.card().id }).subscribe({
            next: (imports) => {
                this.imports.set(imports);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.notifications.error(error);
            },
        });
    }
}
