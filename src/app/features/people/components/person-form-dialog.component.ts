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
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { InputText } from 'primeng/inputtext';

import { NotificationService } from '../../../core/notification/notification.service';
import { FieldErrorComponent } from '../../../shared/forms/field-error.component';
import { applyServerErrors, revealFormErrors } from '../../../shared/forms/form-errors';
import { formatPhone, normalizePhone, phoneValidator } from '../../../shared/phone/phone';
import { type Person, PERSON_EMAIL_MAX_LENGTH, PERSON_NAME_MAX_LENGTH } from '../data-access/person.models';
import { PersonService } from '../data-access/person.service';

/** Diálogo para cadastrar ou editar uma pessoa. */
@Component({
    selector: 'app-person-form-dialog',
    imports: [ReactiveFormsModule, Button, Dialog, InputText, FieldErrorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './person-form-dialog.component.html',
})
export class PersonFormDialogComponent {
    public readonly visible = model(false);
    /** Pessoa a editar; `null` para cadastrar uma nova. */
    public readonly person = input<Person | null>(null);
    public readonly saved = output<Person>();

    private readonly people = inject(PersonService);
    private readonly notifications = inject(NotificationService);

    protected readonly nameMaxLength = PERSON_NAME_MAX_LENGTH;
    protected readonly emailMaxLength = PERSON_EMAIL_MAX_LENGTH;
    protected readonly isEdit = computed(() => this.person() !== null);
    protected readonly saving = signal(false);
    protected readonly form = inject(NonNullableFormBuilder).group({
        name: ['', [Validators.required, Validators.maxLength(PERSON_NAME_MAX_LENGTH)]],
        email: ['', [Validators.email, Validators.maxLength(PERSON_EMAIL_MAX_LENGTH)]],
        phone: ['', [phoneValidator]],
    });

    public constructor() {
        effect(() => {
            if (this.visible()) {
                const person = this.person();

                untracked(() =>
                    this.form.reset({
                        name: person?.name ?? '',
                        email: person?.email ?? '',
                        phone: person?.phone ? formatPhone(person.phone) : '',
                    }),
                );
            }
        });
    }

    protected save(): void {
        if (!this.form.controls.name.value.trim()) {
            this.form.controls.name.setValue('');
        }

        if (this.form.invalid) {
            revealFormErrors(this.form);
            return;
        }

        const { name, email, phone } = this.form.getRawValue();
        // Campos opcionais vazios vão como `null`: no back, `null` apaga o valor salvo.
        const body = {
            name: name.trim(),
            email: email.trim() ? email.trim().toLowerCase() : null,
            phone: normalizePhone(phone),
        };

        const current = this.person();
        const request = current ? this.people.update(current.id, body) : this.people.create(body);

        this.saving.set(true);

        request.subscribe({
            next: (person) => {
                this.saving.set(false);
                this.notifications.success(current ? 'Pessoa atualizada.' : 'Pessoa cadastrada.');
                this.saved.emit(person);
                this.visible.set(false);
            },
            error: (error: unknown) => {
                this.saving.set(false);

                if (!applyServerErrors(this.form, error)) {
                    this.notifications.error(error);
                }
            },
        });
    }
}
