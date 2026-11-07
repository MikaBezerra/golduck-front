import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { type FormArray, FormControl, type FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';

import { IsoDatePipe } from '../../../shared/date/iso-date.pipe';
import { sumAmounts } from '../../../shared/money/money';
import { BrlPipe } from '../../../shared/money/brl.pipe';
import { CARD_EXPENSE_NICKNAME_MAX_LENGTH } from '../../card-expenses/data-access/card-expense.models';
import { ExpenseLookupsService } from '../../manual-expenses/data-access/expense-lookups.service';
import { type CardImportPreview, describeImportSummary } from '../data-access/card-import.models';

/** Campos que o usuário pode mudar em cada compra da fatura. */
export type ReviewRowForm = FormGroup<{
    nickname: FormControl<string>;
    categoryId: FormControl<string>;
    personId: FormControl<string | null>;
}>;

/** No seletor em lote, `null` significa "não mexer"; este valor remove a pessoa. */
const NO_PERSON = '__no_person__';

interface SelectOption {
    readonly label: string;
    readonly value: string;
}

/**
 * Etapa de revisão da fatura: mostra o que o envio vai fazer e deixa escolher
 * apelido, categoria e pessoa de cada compra antes de salvar.
 * Os campos ficam no `FormArray` recebido (uma linha por compra, na ordem do arquivo).
 */
@Component({
    selector: 'app-card-import-review',
    imports: [
        FormsModule,
        ReactiveFormsModule,
        Button,
        Checkbox,
        InputText,
        Message,
        Select,
        Tag,
        BrlPipe,
        IsoDatePipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './card-import-review.component.html',
})
export class CardImportReviewComponent {
    public readonly preview = input.required<CardImportPreview>();
    public readonly rows = input.required<FormArray<ReviewRowForm>>();

    private readonly lookups = inject(ExpenseLookupsService);

    protected readonly nicknameMaxLength = CARD_EXPENSE_NICKNAME_MAX_LENGTH;
    protected readonly summaryLines = computed(() => describeImportSummary(this.preview().summary, 'preview'));
    protected readonly total = computed(() => sumAmounts(this.preview().transactions.map((tx) => tx.amount)));
    protected readonly selected = signal<ReadonlySet<string>>(new Set());
    protected readonly allSelected = computed(
        () => this.preview().transactions.length > 0 && this.selected().size === this.preview().transactions.length,
    );

    /** Categorias ativas + as sugeridas pelo back que já foram desativadas (para aparecerem com nome). */
    protected readonly categoryOptions = computed<SelectOption[]>(() => {
        const options = this.lookups
            .activeCategories()
            .map((category) => ({ label: category.name, value: category.id }));
        const known = new Set(options.map((option) => option.value));
        const inactive = [...new Set(this.preview().transactions.map((tx) => tx.categoryId))]
            .filter((id) => !known.has(id))
            .map((id) => ({
                label: `${this.lookups.categoryById().get(id)?.name ?? 'Categoria'} (desativada)`,
                value: id,
            }));

        return [...options, ...inactive];
    });

    protected readonly personOptions = computed<SelectOption[]>(() => {
        const options = this.lookups.activePeople().map((person) => ({ label: person.name, value: person.id }));
        const known = new Set(options.map((option) => option.value));
        const inactive = [...new Set(this.preview().transactions.map((tx) => tx.personId))]
            .filter((id): id is string => id !== null && !known.has(id))
            .map((id) => ({ label: `${this.lookups.personById().get(id)?.name ?? 'Pessoa'} (desativada)`, value: id }));

        return [...options, ...inactive];
    });

    protected readonly bulkCategoryOptions = computed(() =>
        this.lookups.activeCategories().map((category) => ({ label: category.name, value: category.id })),
    );
    protected readonly bulkPersonOptions = computed(() => [
        { label: 'Ninguém (remover pessoa)', value: NO_PERSON },
        ...this.lookups.activePeople().map((person) => ({ label: person.name, value: person.id })),
    ]);
    protected readonly bulkCategory = new FormControl<string | null>(null);
    protected readonly bulkPerson = new FormControl<string | null>(null);

    protected isSelected(key: string): boolean {
        return this.selected().has(key);
    }

    protected toggle(key: string, checked: boolean): void {
        this.selected.update((current) => {
            const next = new Set(current);

            if (checked) {
                next.add(key);
            } else {
                next.delete(key);
            }

            return next;
        });
    }

    protected toggleAll(checked: boolean): void {
        this.selected.set(checked ? new Set(this.preview().transactions.map((tx) => tx.key)) : new Set());
    }

    /** Aplica a categoria e/ou a pessoa escolhidas a todas as compras marcadas. */
    protected applyToSelected(): void {
        const category = this.bulkCategory.value;
        const person = this.bulkPerson.value;

        this.preview().transactions.forEach((tx, index) => {
            if (!this.selected().has(tx.key)) {
                return;
            }

            const row = this.rows().at(index);

            if (category) {
                row.controls.categoryId.setValue(category);
            }

            if (person) {
                row.controls.personId.setValue(person === NO_PERSON ? null : person);
            }

            row.markAsDirty();
        });

        this.bulkCategory.reset();
        this.bulkPerson.reset();
        this.selected.set(new Set());
    }
}
