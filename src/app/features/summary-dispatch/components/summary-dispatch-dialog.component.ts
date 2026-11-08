import { DatePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    model,
    output,
    signal,
    untracked,
} from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Skeleton } from 'primeng/skeleton';
import { finalize, type Observable } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { formatMonth } from '../../../shared/month/month';
import {
    DISPATCH_ITEM_STATUS,
    type SummaryDispatch,
    type SummaryDispatchItem,
    type SummaryDispatchPreview,
    type SummaryDispatchRecipient,
} from '../data-access/summary-dispatch.models';
import { SummaryDispatchService } from '../data-access/summary-dispatch.service';

/** Prévia do e-mail de uma pessoa, já liberada para o `srcdoc` do iframe. */
interface EmailView {
    readonly name: string;
    readonly subject: string;
    readonly html: SafeHtml;
}

/**
 * Envia o resumo do mês por e-mail. Ao abrir, busca quem vai receber (prévia) e mostra a
 * confirmação; depois do envio, mostra o resultado de cada pessoa.
 *
 * Envio único (como uma rota idempotente no back): cada abertura do diálogo gera uma
 * `Idempotency-Key`, reaproveitada em cliques repetidos e em novas tentativas depois de erro de rede.
 * Assim o back nunca envia duas vezes o mesmo pedido. "Tentar de novo para quem falhou" é outro
 * pedido, então usa uma chave nova.
 */
@Component({
    selector: 'app-summary-dispatch-dialog',
    imports: [DatePipe, RouterLink, Button, Dialog, Skeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './summary-dispatch-dialog.component.html',
})
export class SummaryDispatchDialogComponent {
    public readonly visible = model(false);
    public readonly month = input.required<string>();
    /** Um envio terminou (a página atualiza o "Último envio"). */
    public readonly dispatched = output<SummaryDispatch>();

    private readonly dispatches = inject(SummaryDispatchService);
    private readonly notifications = inject(NotificationService);
    private readonly sanitizer = inject(DomSanitizer);

    /** Chave do envio de todos (gerada a cada abertura) e do reenvio para quem falhou (a cada resultado). */
    private sendKey = '';
    private retryKey = '';

    protected readonly preview = signal<SummaryDispatchPreview | null>(null);
    protected readonly loading = signal(false);
    protected readonly loadFailed = signal(false);
    protected readonly sending = signal(false);
    /** Situação de cada pessoa no último resultado (vazio = ainda não enviou). */
    protected readonly items = signal<readonly SummaryDispatchItem[]>([]);
    protected readonly email = signal<EmailView | null>(null);
    protected readonly loadingEmailFor = signal<string | null>(null);

    protected readonly statuses = DISPATCH_ITEM_STATUS;
    /** "novembro de 2026", para o título. */
    protected readonly monthLabel = computed(() => formatMonth(this.month()).toLowerCase());
    protected readonly failedIds = computed(() =>
        this.items()
            .filter((item) => item.status === 'FAILED')
            .map((item) => item.personId),
    );
    protected readonly canSend = computed(() => {
        const preview = this.preview();

        return (
            preview !== null &&
            preview.enabled &&
            preview.recipients.some((recipient) => recipient.hasEmail) &&
            !this.sending()
        );
    });

    public constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => this.start());
            }
        });
    }

    protected loadPreview(): void {
        this.loading.set(true);
        this.loadFailed.set(false);

        this.dispatches
            .preview(this.month())
            .pipe(finalize(() => this.loading.set(false)))
            .subscribe({
                next: (preview) => this.preview.set(preview),
                error: (error: unknown) => {
                    this.loadFailed.set(true);
                    this.notifications.error(error);
                },
            });
    }

    /** Envia para todas as pessoas ativas. Cliques enquanto envia são ignorados. */
    protected send(): void {
        if (this.sending()) {
            return;
        }

        this.run(this.dispatches.dispatch(this.month(), this.sendKey));
    }

    /** Novo envio só para quem falhou, com uma chave nova (é outro pedido). */
    protected retryFailed(): void {
        const failed = this.failedIds();

        if (this.sending() || failed.length === 0) {
            return;
        }

        this.run(this.dispatches.dispatch(this.month(), this.retryKey, failed));
    }

    protected viewEmail(recipient: SummaryDispatchRecipient): void {
        this.loadingEmailFor.set(recipient.personId);

        this.dispatches
            .email(this.month(), recipient.personId)
            .pipe(finalize(() => this.loadingEmailFor.set(null)))
            .subscribe({
                next: (email) =>
                    this.email.set({
                        name: recipient.name,
                        subject: email.subject,
                        // HTML montado pelo nosso back. O iframe tem `sandbox` vazio: sem scripts, sem
                        // formulários e sem acesso a esta página. O sanitizador do Angular tiraria os
                        // estilos inline do e-mail, então ele é liberado aqui.
                        html: this.sanitizer.bypassSecurityTrustHtml(email.html),
                    }),
                error: (error: unknown) => this.notifications.error(error),
            });
    }

    protected closeEmail(): void {
        this.email.set(null);
    }

    protected close(): void {
        this.visible.set(false);
    }

    private start(): void {
        this.sendKey = crypto.randomUUID();
        this.retryKey = crypto.randomUUID();
        this.preview.set(null);
        this.items.set([]);
        this.email.set(null);
        this.loadPreview();
    }

    private run(request: Observable<SummaryDispatch>): void {
        this.sending.set(true);

        request.pipe(finalize(() => this.sending.set(false))).subscribe({
            next: (dispatch) => {
                this.items.set(this.mergeItems(dispatch.items));
                this.retryKey = crypto.randomUUID();
                this.notify(dispatch);
                this.dispatched.emit(dispatch);
            },
            // A chave é mantida: repetir depois de um erro de rede não envia duas vezes.
            error: (error: unknown) => this.notifications.error(error),
        });
    }

    /** No reenvio, a situação nova de cada pessoa substitui a anterior; as outras ficam como estavam. */
    private mergeItems(received: readonly SummaryDispatchItem[]): readonly SummaryDispatchItem[] {
        const current = this.items();

        if (current.length === 0) {
            return received;
        }

        return current.map((item) => received.find((next) => next.personId === item.personId) ?? item);
    }

    private notify(dispatch: SummaryDispatch): void {
        const message = `${dispatch.counts.sent} de ${dispatch.items.length} enviados.`;

        if (dispatch.counts.failed > 0 || dispatch.counts.skipped > 0) {
            this.notifications.info(message);
        } else {
            this.notifications.success(message);
        }
    }
}
