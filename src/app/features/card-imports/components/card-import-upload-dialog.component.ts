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
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import type { CardExpenseScope } from '../../card-expenses/data-access/card-expense.models';
import { CardBankPipe } from '../../credit-cards/components/card-bank.pipe';
import type { CreditCard } from '../../credit-cards/data-access/credit-card.models';
import {
    BANKS_WITH_PDF_PASSWORD,
    type CardImportExclusion,
    type CardImportOverride,
    type CardImportPreview,
    type CardImportResult,
    describeImportSummary,
    MAX_STATEMENT_FILE_BYTES,
    STATEMENT_FILE_EXTENSION,
    STATEMENT_PASSWORD_MAX_LENGTH,
} from '../data-access/card-import.models';
import { CardImportService, type UploadStatementRequest } from '../data-access/card-import.service';
import { CardImportReviewComponent, type ReviewRowForm } from './card-import-review.component';

/** Erros do back que dizem respeito ao arquivo: aparecem na etapa do arquivo, junto do campo. */
const FILE_ERROR_CODES = new Set([
    'IMPORT_FILE_REQUIRED',
    'IMPORT_FILE_TOO_LARGE',
    'IMPORT_INVALID_FILE_TYPE',
    'IMPORT_UNSUPPORTED_FORMAT',
]);

/** Erros ao salvar que pedem uma ação na revisão (e não apenas um aviso). */
const REVIEW_ERROR_CODES = new Set([
    'IMPORT_OVERRIDE_UNKNOWN_KEY',
    'CARD_EXPENSE_INACTIVE_CATEGORY',
    'CARD_EXPENSE_INACTIVE_PERSON',
]);

type Step = 'file' | 'review' | 'done';

/**
 * Envio da fatura em três etapas:
 * 1. escolher o arquivo → **pré-visualizar** (o back lê o arquivo e não grava nada);
 * 2. revisar as compras e escolher apelido, categoria e pessoa;
 * 3. **salvar** → o arquivo é enviado de novo com as escolhas, e aí sim vira um envio de fatura.
 */
@Component({
    selector: 'app-card-import-upload-dialog',
    imports: [
        ReactiveFormsModule,
        Button,
        DatePicker,
        Dialog,
        Message,
        Password,
        FieldErrorComponent,
        CardBankPipe,
        CardImportReviewComponent,
    ],
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

    protected readonly step = signal<Step>('file');
    protected readonly form = new FormGroup({
        month: new FormControl<Date | null>(null, Validators.required),
        password: new FormControl('', {
            nonNullable: true,
            validators: [Validators.maxLength(STATEMENT_PASSWORD_MAX_LENGTH)],
        }),
    });
    protected readonly file = signal<File | null>(null);
    protected readonly fileError = signal<string | null>(null);
    protected readonly loading = signal(false);

    protected readonly preview = signal<CardImportPreview | null>(null);
    protected readonly rows = new FormArray<ReviewRowForm>([]);
    protected readonly reviewError = signal<{ message: string; repreview: boolean } | null>(null);

    protected readonly result = signal<CardImportResult | null>(null);

    protected readonly extension = computed(() => STATEMENT_FILE_EXTENSION[this.card().bank]);
    /** Faturas em PDF protegido (Neon) pedem a senha para o back conseguir abrir o arquivo. */
    protected readonly asksPassword = computed(() => BANKS_WITH_PDF_PASSWORD.has(this.card().bank));
    protected readonly header = computed(() => {
        switch (this.step()) {
            case 'review':
                return `Revisar fatura de ${formatMonth(this.preview()?.month ?? this.defaultMonth())}`;
            case 'done':
                return 'Fatura salva';
            default:
                return 'Enviar fatura';
        }
    });
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
            // Só a abertura do diálogo reinicia tudo (a página pode trocar de mês depois de salvar).
            if (!this.visible()) {
                return;
            }

            untracked(() => {
                this.step.set('file');
                this.form.reset({ month: monthKeyToDate(this.defaultMonth()), password: '' });
                this.file.set(null);
                this.fileError.set(null);
                this.preview.set(null);
                this.rows.clear();
                this.reviewError.set(null);
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

    /** Etapa 1 → 2: o back lê o arquivo e devolve o que faria, sem gravar. */
    protected runPreview(): void {
        const request = this.buildRequest();

        if (!request) {
            return;
        }

        this.loading.set(true);
        this.fileError.set(null);
        this.reviewError.set(null);

        this.cardImports.preview(request).subscribe({
            next: (preview) => {
                this.loading.set(false);
                this.preview.set(preview);
                this.buildRows(preview);
                this.step.set('review');
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.step.set('file');
                this.handleFileStepError(error);
            },
        });
    }

    protected backToFile(): void {
        this.reviewError.set(null);
        this.step.set('file');
    }

    /** Etapa 2 → 3: grava de verdade, reenviando o arquivo com as escolhas. */
    protected save(): void {
        const request = this.buildRequest();
        const preview = this.preview();

        if (!request || !preview) {
            return;
        }

        if (this.rows.invalid) {
            revealFormErrors(this.rows);
            return;
        }

        const overrides = this.collectOverrides(preview);
        const exclusions = this.collectExclusions(preview);

        this.loading.set(true);
        this.reviewError.set(null);

        this.cardImports.save({ ...request, overrides, exclusions }).subscribe({
            next: (result) => {
                this.loading.set(false);
                this.result.set(result);
                this.step.set('done');
                this.imported.emit(result);
            },
            error: (error: unknown) => {
                this.loading.set(false);

                const apiError = ApiError.from(error);

                if (REVIEW_ERROR_CODES.has(apiError.code)) {
                    this.reviewError.set({
                        message: apiError.message,
                        repreview: apiError.code === 'IMPORT_OVERRIDE_UNKNOWN_KEY',
                    });
                } else if (FILE_ERROR_CODES.has(apiError.code) || apiError.code === 'IMPORT_FILE_PASSWORD_INVALID') {
                    this.step.set('file');
                    this.handleFileStepError(apiError);
                } else if (!this.applyOverrideErrors(apiError, overrides, preview)) {
                    this.notifications.error(apiError);
                }
            },
        });
    }

    /**
     * Só vão para o back as compras em que o usuário mudou algo. As demais ficam com a
     * sugestão do back — inclusive uma categoria sugerida que foi desativada, que o back
     * recusaria se fosse enviada como escolha.
     */
    private collectOverrides(preview: CardImportPreview): CardImportOverride[] {
        return preview.transactions.flatMap((tx, index) => {
            const { nickname, categoryId, personId } = this.rows.at(index).getRawValue();
            const chosen = { nickname: nickname.trim() || null, categoryId, personId: personId ?? null };
            const changed =
                chosen.nickname !== tx.nickname ||
                chosen.categoryId !== tx.categoryId ||
                chosen.personId !== tx.personId;

            return changed ? [{ key: tx.key, ...chosen }] : [];
        });
    }

    /**
     * Decisões de exclusão, só para o que muda em relação ao estado atual:
     * - excluir uma compra que não estava excluída;
     * - restaurar uma que estava excluída;
     * - manter excluída marcando "não perguntar de novo".
     * Uma compra excluída salva sem decisão continua excluída (é o padrão do back).
     */
    private collectExclusions(preview: CardImportPreview): CardImportExclusion[] {
        return preview.transactions.flatMap((tx, index): CardImportExclusion[] => {
            const { exclude, remember, scope } = this.rows.at(index).getRawValue();

            if (exclude && (!tx.excluded || remember)) {
                return [{ key: tx.key, action: 'exclude', scope, remember }];
            }

            if (!exclude && tx.excluded) {
                return [{ key: tx.key, action: 'restore', scope, remember: false }];
            }

            return [];
        });
    }

    /** Erros de validação em `overrides[i].campo`: leva a mensagem para a compra certa. */
    private applyOverrideErrors(
        error: ApiError,
        overrides: readonly CardImportOverride[],
        preview: CardImportPreview,
    ): boolean {
        let applied = false;

        for (const detail of error.details) {
            const match = /^overrides\[(\d+)\]\.(nickname|categoryId|personId)$/.exec(detail.field);
            const key = match ? overrides[Number(match[1])]?.key : undefined;
            const index = key ? preview.transactions.findIndex((tx) => tx.key === key) : -1;

            if (match && index >= 0) {
                setServerError(this.rows.at(index).get(match[2]), detail.message);
                applied = true;
            }
        }

        return applied;
    }

    private buildRows(preview: CardImportPreview): void {
        this.rows.clear();

        for (const tx of preview.transactions) {
            this.rows.push(
                new FormGroup({
                    nickname: new FormControl(tx.nickname ?? '', { nonNullable: true }),
                    categoryId: new FormControl(tx.categoryId, {
                        nonNullable: true,
                        validators: [Validators.required],
                    }),
                    personId: new FormControl<string | null>(tx.personId),
                    exclude: new FormControl(tx.excluded, { nonNullable: true }),
                    remember: new FormControl(false, { nonNullable: true }),
                    scope: new FormControl<CardExpenseScope>('all', { nonNullable: true }),
                }),
            );
        }
    }

    /** Valida o formulário do arquivo e monta a requisição (usada na pré-visualização e ao salvar). */
    private buildRequest(): UploadStatementRequest | null {
        const file = this.file();

        if (this.form.invalid || !file) {
            revealFormErrors(this.form);
            this.fileError.set(file ? this.validateFile(file) : 'Escolha o arquivo da fatura');
            this.step.set('file');
            return null;
        }

        const fileError = this.validateFile(file);

        if (fileError) {
            this.fileError.set(fileError);
            this.step.set('file');
            return null;
        }

        return {
            cardId: this.card().id,
            month: dateToMonthKey(this.form.controls.month.value ?? new Date()),
            file,
            password: this.asksPassword() ? this.form.controls.password.value : undefined,
        };
    }

    private handleFileStepError(error: unknown): void {
        const apiError = ApiError.from(error);

        if (apiError.code === 'IMPORT_FILE_PASSWORD_INVALID') {
            setServerError(this.form.controls.password, 'Senha incorreta ou não informada.');
        } else if (FILE_ERROR_CODES.has(apiError.code)) {
            this.fileError.set(apiError.message);
        } else {
            this.notifications.error(apiError);
        }
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
