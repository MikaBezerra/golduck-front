import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Message } from 'primeng/message';
import { Tag } from 'primeng/tag';

import {
    consentWarning,
    type CreditCardSync,
    describeConsentWarning,
    isPluggyProblem,
    pluggyStatusLabel,
} from '../data-access/credit-card.models';

/**
 * Situação da sincronização de um cartão com o Meu Pluggy (`sync` da resposta de `/credit-cards`):
 * situação do item, última atualização dos dados, erro da última tentativa e fim da autorização.
 * `compact` mostra uma linha só (tela de faturas); sem ele, a lista completa (cadastro do cartão).
 */
@Component({
    selector: 'app-credit-card-sync-status',
    imports: [DatePipe, Message, Tag],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (compact()) {
            <p class="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-color">
                @if (sync().status; as status) {
                    <p-tag [value]="statusLabel()" [severity]="problem() ? 'warn' : 'secondary'" />
                }
                @if (sync().dataUpdatedAt; as updatedAt) {
                    <span>Dados do banco de {{ updatedAt | date: 'dd/MM HH:mm' }}</span>
                } @else {
                    <span>Ainda sem dados do banco.</span>
                }
                @if (sync().syncedAt; as syncedAt) {
                    <span aria-hidden="true">·</span>
                    <span>sincronizado em {{ syncedAt | date: 'dd/MM HH:mm' }}</span>
                }
            </p>
        } @else {
            <dl class="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
                <dt class="text-muted-color">Situação</dt>
                <dd class="m-0">
                    @if (sync().status) {
                        <p-tag [value]="statusLabel()" [severity]="problem() ? 'warn' : 'success'" />
                    } @else {
                        Nunca sincronizado
                    }
                </dd>
                <dt class="text-muted-color">Dados do banco</dt>
                <dd class="m-0">{{ (sync().dataUpdatedAt | date: 'dd/MM/yyyy HH:mm') ?? '—' }}</dd>
                <dt class="text-muted-color">Última sincronização</dt>
                <dd class="m-0">{{ (sync().syncedAt | date: 'dd/MM/yyyy HH:mm') ?? '—' }}</dd>
                <dt class="text-muted-color">Autorização até</dt>
                <dd class="m-0">{{ (sync().consentExpiresAt | date: 'dd/MM/yyyy') ?? '—' }}</dd>
            </dl>
        }

        @if (sync().error; as error) {
            <p-message severity="error" styleClass="mt-2" size="small">
                Última tentativa falhou: {{ error }}
            </p-message>
        }
        @if (consentText(); as text) {
            <p-message [severity]="consentExpired() ? 'error' : 'warn'" styleClass="mt-2" size="small">
                {{ text }}
            </p-message>
        }
    `,
})
export class CreditCardSyncStatusComponent {
    public readonly sync = input.required<CreditCardSync>();
    public readonly compact = input(false);
    /** Agora (injetável nos testes): base do aviso de autorização perto do fim. */
    public readonly now = input<Date>(new Date());

    protected readonly statusLabel = computed(() => pluggyStatusLabel(this.sync().status));
    protected readonly problem = computed(() => isPluggyProblem(this.sync().status));
    private readonly consent = computed(() => consentWarning(this.sync(), this.now()));
    protected readonly consentExpired = computed(() => this.consent()?.expired ?? false);
    protected readonly consentText = computed(() => {
        const warning = this.consent();

        return warning ? describeConsentWarning(warning) : null;
    });
}
