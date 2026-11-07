import type { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aPerson } from '../../../../testing/fixtures';
import { notificationsMock } from '../../../../testing/mocks';
import type { Person } from '../data-access/person.models';
import { PersonService } from '../data-access/person.service';
import { PersonFormDialogComponent } from './person-form-dialog.component';

interface Internals {
    readonly form: FormGroup;
    save(): void;
}

describe('PersonFormDialogComponent', () => {
    const people = { create: vi.fn(), update: vi.fn() };
    const notifications = notificationsMock();

    function open(person: Person | null = null) {
        people.create.mockReset();
        people.update.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(PersonFormDialogComponent, { person }, [
            { provide: PersonService, useValue: people },
            { provide: NotificationService, useValue: notifications },
        ]);
        const saved = vi.fn();
        fixture.componentInstance.saved.subscribe(saved);

        return { fixture, form: internals<Internals>(fixture), saved };
    }

    it('abre vazio para cadastrar e preenchido (com o celular formatado) para editar', () => {
        expect(open().form.form.getRawValue()).toEqual({ name: '', email: '', phone: '' });

        const editing = open(aPerson({ name: 'Ana', email: 'ana@exemplo.com', phone: '+5511999999999' }));
        expect(editing.form.form.getRawValue()).toEqual({
            name: 'Ana',
            email: 'ana@exemplo.com',
            phone: '+55 (11) 99999-9999',
        });
    });

    it('não envia com nome em branco nem com e-mail ou celular inválidos', () => {
        const { form } = open();

        form.form.setValue({ name: '   ', email: 'nao-e-email', phone: '123' });
        form.save();

        expect(people.create).not.toHaveBeenCalled();
        expect(form.form.get('name')?.hasError('required')).toBe(true);
        expect(form.form.get('email')?.invalid).toBe(true);
        expect(form.form.get('phone')?.invalid).toBe(true);
        expect(form.form.get('name')?.touched).toBe(true);
    });

    it('cadastra limpando os campos: espaços, e-mail minúsculo, vazios como null e celular no formato da API', () => {
        const { fixture, form, saved } = open();
        people.create.mockReturnValue(of(aPerson({ name: 'Bruno' })));

        form.form.setValue({ name: '  Bruno  ', email: 'Bruno@Exemplo.COM', phone: '(11) 98888-7777' });
        form.save();

        expect(people.create).toHaveBeenCalledWith({
            name: 'Bruno',
            email: 'bruno@exemplo.com',
            phone: '+5511988887777',
        });
        expect(notifications.success).toHaveBeenCalledWith('Pessoa cadastrada.');
        expect(saved).toHaveBeenCalledWith(aPerson({ name: 'Bruno' }));
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('na edição, apaga e-mail e celular enviando null', () => {
        const { form } = open(aPerson({ id: 'person-7', email: 'velho@exemplo.com', phone: '+5511999999999' }));
        people.update.mockReturnValue(of(aPerson()));

        form.form.patchValue({ email: '', phone: '' });
        form.save();

        expect(people.update).toHaveBeenCalledWith('person-7', { name: 'Ana', email: null, phone: null });
        expect(notifications.success).toHaveBeenCalledWith('Pessoa atualizada.');
    });

    it('mostra no campo o erro de validação devolvido pelo back', () => {
        const { fixture, form } = open();
        people.create.mockReturnValue(
            apiError(400, 'VALIDATION_ERROR', 'Os dados enviados são inválidos', [
                { field: 'email', code: 'string.email', message: 'E-mail inválido para o back' },
            ]),
        );

        form.form.setValue({ name: 'Bruno', email: 'bruno@exemplo.com', phone: '' });
        form.save();

        expect(form.form.get('email')?.getError('server')).toBe('E-mail inválido para o back');
        expect(notifications.error).not.toHaveBeenCalled();
        expect(fixture.componentInstance.visible()).toBe(true);
    });

    it('avisa erros que não são de um campo e mantém o diálogo aberto', () => {
        const { fixture, form } = open();
        people.create.mockReturnValue(apiError(500, 'INTERNAL_ERROR', 'Erro interno do servidor'));

        form.form.setValue({ name: 'Bruno', email: '', phone: '' });
        form.save();

        expect(notifications.error).toHaveBeenCalled();
        expect(fixture.componentInstance.visible()).toBe(true);
    });
});
