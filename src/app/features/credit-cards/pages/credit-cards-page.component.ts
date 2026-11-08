import { ChangeDetectionStrategy, Component, inject, type OnInit, signal } from '@angular/core';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Tooltip } from 'primeng/tooltip';

import { ConfirmService } from '../../../core/notification/confirm.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { PageHeaderComponent } from '../../../shared/ui/page-header.component';
import { CardBankPipe } from '../components/card-bank.pipe';
import { CreditCardFormDialogComponent } from '../components/credit-card-form-dialog.component';
import { consentWarning, type CreditCard, isPluggyProblem } from '../data-access/credit-card.models';
import { CreditCardService } from '../data-access/credit-card.service';

@Component({
    selector: 'app-credit-cards-page',
    imports: [Button, TableModule, Tag, Tooltip, PageHeaderComponent, CardBankPipe, CreditCardFormDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './credit-cards-page.component.html',
})
export class CreditCardsPageComponent implements OnInit {
    private readonly creditCardService = inject(CreditCardService);
    private readonly notifications = inject(NotificationService);
    private readonly confirm = inject(ConfirmService);

    protected readonly cards = signal<CreditCard[]>([]);
    protected readonly loading = signal(true);
    protected readonly dialogVisible = signal(false);
    protected readonly editing = signal<CreditCard | null>(null);

    public ngOnInit(): void {
        this.load();
    }

    protected load(): void {
        this.loading.set(true);

        this.creditCardService.findAll().subscribe({
            next: (cards) => {
                this.cards.set(cards);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.notifications.error(error);
            },
        });
    }

    /** Item com problema no Meu Pluggy ou autorização perto do fim. */
    protected needsAttention(card: CreditCard): boolean {
        return isPluggyProblem(card.sync.status) || consentWarning(card.sync) !== null;
    }

    protected openCreate(): void {
        this.editing.set(null);
        this.dialogVisible.set(true);
    }

    protected openEdit(card: CreditCard): void {
        this.editing.set(card);
        this.dialogVisible.set(true);
    }

    protected async deactivate(card: CreditCard): Promise<void> {
        const confirmed = await this.confirm.danger({
            header: 'Desativar cartão',
            message: `Desativar "${card.name}"? Ele sai da lista e não poderá mais ser usado.`,
            acceptLabel: 'Desativar',
        });

        if (!confirmed) {
            return;
        }

        this.creditCardService.update(card.id, { active: false }).subscribe({
            next: () => {
                this.notifications.success(`Cartão "${card.name}" desativado.`);
                this.load();
            },
            error: (error: unknown) => this.notifications.error(error),
        });
    }
}
