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
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { Message } from 'primeng/message';
import { Password } from 'primeng/password';

import { ApiError } from '../../../core/api/api-error';
import { NotificationService } from '../../../core/notification/notification.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { revealFormErrors, setServerError } from '../../../shared/forms/form-errors';
import { dateToMonthKey, formatMonth, monthKeyToDate } from '../../../shared/month/month';
import { CardBankPipe } from '../../credit-cards/components/card-bank.pipe';
import type { CreditCard } from '../../credit-cards/data-access/credit-card.models';
import {
    BANKS_WITH_PDF_PASSWORD,
    type CardImportResult,
    describeImportSummary,
    MAX_STATEMENT_FILE_BYTES,
    STATEMENT_FILE_EXTENSION,
    STATEMENT_PASSWORD_MAX_LENGTH,
} from '../data-access/card-import.models';
import { CardImportService } from '../data-access/card-import.service';

/** Erros do back que dizem respeito ao arquivo: aparecem dentro do diálogo, junto do campo. */
const FILE_ERROR_CODES = new Set([
    'IMPORT_FILE_REQUIRED',
    'IMPORT_FILE_TOO_LARGE',
    'IMPORT_INVALID_FILE_TYPE',
    'IMPORT_UNSUPPORTED_FORMAT',
]);

/**
 * Envia o arquivo da fatura exportado pelo banco. O envio é "absoluto" para o mês:
 * o que não estiver no arquivo é removido daquele mês.
 */
@Component({
    selector: 'app-card-import-upload-dialog',
    imports: [ReactiveFormsModule, Button, DatePicker, Dialog, Message, Password, FieldErrorComponent, CardBankPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './card-import-upload-dialog.component.html',
})
export class CardImportUploadDialogComponent {
    public readonly visible = model(false);
    public readonly card = input.required<CreditCard>();
    /** Mês sugerido (`"AAAA-MM"`). */
    public readonly defaultMonth = input.required<string>();
    public readonly imported = output<CardImportResult>();

    private readonly cardImports = inject(CardImportService);
    private readonly notifications = inject(NotificationService);

    protected readonly form = new FormGroup({
        month: new FormControl<Date | null>(null, Validators.required),
        password: new FormControl('', {
            nonNullable: true,
            validators: [Validators.maxLength(STATEMENT_PASSWORD_MAX_LENGTH)],
        }),
    });
    protected readonly file = signal<File | null>(null);
    protected readonly fileError = signal<string | null>(null);
    protected readonly sending = signal(false);
    protected readonly result = signal<CardImportResult | null>(null);

    protected readonly extension = computed(() => STATEMENT_FILE_EXTENSION[this.card().bank]);
    /** Faturas em PDF protegido (Neon) pedem a senha para o back conseguir abrir o arquivo. */
    protected readonly asksPassword = computed(() => BANKS_WITH_PDF_PASSWORD.has(this.card().bank));
    protected readonly resultLines = computed(() => {
        const result = this.result();

        return result ? describeImportSummary(result.summary) : [];
    });
    protected readonly resultMonth = computed(() => {
        const result = this.result();

        return result ? formatMonth(result.import.month) : '';
    });

    public constructor() {
        effect(() => {
            // Só a abertura do diálogo reinicia o formulário (a página pode trocar de mês depois do envio).
            if (!this.visible()) {
                return;
            }

            untracked(() => {
                this.form.reset({ month: monthKeyToDate(this.defaultMonth()), password: '' });
                this.file.set(null);
                this.fileError.set(null);
                this.result.set(null);
            });
        });
    }

    protected onFileChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;

        this.file.set(file);
        this.fileError.set(file ? this.validateFile(file) : null);
    }

    protected send(): void {
        const file = this.file();

        if (this.form.invalid || !file) {
            revealFormErrors(this.form);
            this.fileError.set(file ? this.validateFile(file) : 'Escolha o arquivo da fatura');
            return;
        }

        const fileError = this.validateFile(file);

        if (fileError) {
            this.fileError.set(fileError);
            return;
        }

        this.sending.set(true);
        this.fileError.set(null);

        this.cardImports
            .upload({
                cardId: this.card().id,
                month: dateToMonthKey(this.form.controls.month.value ?? new Date()),
                file,
                password: this.asksPassword() ? this.form.controls.password.value : undefined,
            })
            .subscribe({
                next: (result) => {
                    this.sending.set(false);
                    this.result.set(result);
                    this.imported.emit(result);
                },
                error: (error: unknown) => {
                    this.sending.set(false);

                    const apiError = ApiError.from(error);

                    if (apiError.code === 'IMPORT_FILE_PASSWORD_INVALID') {
                        setServerError(this.form.controls.password, 'Senha incorreta ou não informada.');
                    } else if (FILE_ERROR_CODES.has(apiError.code)) {
                        this.fileError.set(apiError.message);
                    } else {
                        this.notifications.error(apiError);
                    }
                },
            });
    }

    /** As mesmas regras do back, conferidas antes de enviar para dar a resposta na hora. */
    private validateFile(file: File): string | null {
        if (!file.name.toLowerCase().endsWith(this.extension())) {
            return `Envie o arquivo ${this.extension()} exportado pelo banco deste cartão.`;
        }

        if (file.size === 0) {
            return 'O arquivo está vazio.';
        }

        if (file.size > MAX_STATEMENT_FILE_BYTES) {
            return 'O arquivo da fatura deve ter no máximo 2 MB.';
        }

        return null;
    }
}
