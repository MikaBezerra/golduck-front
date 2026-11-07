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
} from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';

import { ApiError } from '../../../core/api/api-error';
import { NotificationService } from '../../../core/notification/notification.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors, setServerError } from '../../../shared/forms/form-errors';
import { type Category, CATEGORY_NAME_MAX_LENGTH } from '../data-access/category.models';
import { CategoryService } from '../data-access/category.service';

/** Diálogo para criar uma categoria ou renomear uma existente. */
@Component({
    selector: 'app-category-form-dialog',
    imports: [ReactiveFormsModule, Button, Dialog, InputText, FieldErrorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog
            [header]="isEdit() ? 'Renomear categoria' : 'Nova categoria'"
            [visible]="visible()"
            (visibleChange)="visible.set($event)"
            [modal]="true"
            [draggable]="false"
            [style]="{ width: '28rem' }"
            [breakpoints]="{ '640px': '95vw' }"
        >
            <form [formGroup]="form" (ngSubmit)="save()" id="category-form" class="flex flex-col gap-2" novalidate>
                <label for="category-name" class="font-medium">Nome</label>
                <input
                    pInputText
                    id="category-name"
                    formControlName="name"
                    [maxlength]="maxLength"
                    placeholder="Ex.: Mercado"
                    autocomplete="off"
                    [fluid]="true"
                />
                <app-field-error [control]="form.controls.name" />
            </form>

            <ng-template #footer>
                <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="visible.set(false)" />
                <p-button type="submit" form="category-form" label="Salvar" icon="pi pi-check" [loading]="saving()" />
            </ng-template>
        </p-dialog>
    `,
})
export class CategoryFormDialogComponent {
    public readonly visible = model(false);
    /** Categoria a renomear; `null` para criar uma nova. */
    public readonly category = input<Category | null>(null);
    public readonly saved = output<Category>();

    private readonly categories = inject(CategoryService);
    private readonly notifications = inject(NotificationService);

    protected readonly maxLength = CATEGORY_NAME_MAX_LENGTH;
    protected readonly isEdit = computed(() => this.category() !== null);
    protected readonly saving = signal(false);
    protected readonly form = inject(NonNullableFormBuilder).group({
        name: ['', [Validators.required, Validators.maxLength(CATEGORY_NAME_MAX_LENGTH)]],
    });

    public constructor() {
        // Toda vez que o diálogo abre, o formulário começa limpo (ou com o nome atual).
        effect(() => {
            if (this.visible()) {
                this.form.reset({ name: this.category()?.name ?? '' });
            }
        });
    }

    protected save(): void {
        const name = this.form.controls.name.value.trim();

        if (!name) {
            this.form.controls.name.setValue('');
        }

        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        const current = this.category();
        const request = current ? this.categories.update(current.id, { name }) : this.categories.create({ name });

        this.saving.set(true);

        request.subscribe({
            next: (category) => {
                this.saving.set(false);
                this.notifications.success(current ? 'Categoria renomeada.' : 'Categoria criada.');
                this.saved.emit(category);
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);

                const apiError = ApiError.from(error);

                if (apiError.code === 'CATEGORY_NAME_CONFLICT') {
                    setServerError(this.form.controls.name, apiError.message);
                } else if (!applyServerErrors(this.form, apiError)) {
                    this.notifications.error(apiError);
                }
            },
        });
    }
}
