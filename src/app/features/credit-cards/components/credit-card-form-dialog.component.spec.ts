import type { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aCreditCard } from '../../../../testing/fixtures';
import { notificationsMock } from '../../../../testing/mocks';
import type { CreditCard } from '../data-access/credit-card.models';
import { CreditCardService } from '../data-access/credit-card.service';
import { CreditCardFormDialogComponent } from './credit-card-form-dialog.component';

interface Internals {
    readonly form: FormGroup;
    save(): void;
}

describe('CreditCardFormDialogComponent', () => {
    const creditCards = { create: vi.fn(), update: vi.fn() };
    const notifications = notificationsMock();

    function open(card: CreditCard | null = null) {
        creditCards.create.mockReset();
        creditCards.update.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(CreditCardFormDialogComponent, { card }, [
            { provide: CreditCardService, useValue: creditCards },
            { provide: NotificationService, useValue: notifications },
        ]);

        return { fixture, form: internals<Internals>(fixture) };
    }

    it('para cadastrar, exige nome e banco', () => {
        const { form } = open();

        form.save();

        expect(creditCards.create).not.toHaveBeenCalled();
        expect(form.form.get('name')?.hasError('required')).toBe(true);
        expect(form.form.get('bank')?.hasError('required')).toBe(true);
    });

    it('cadastra com nome e banco escolhidos', () => {
        const { fixture, form } = open();
        creditCards.create.mockReturnValue(of(aCreditCard({ name: 'C6 preto', bank: 'C6' })));

        form.form.setValue({ name: ' C6 preto ', bank: 'C6' });
        form.save();

        expect(creditCards.create).toHaveBeenCalledWith({ name: 'C6 preto', bank: 'C6' });
        expect(notifications.success).toHaveBeenCalledWith('Cartão cadastrado.');
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('na edição o banco fica travado e só o nome é enviado', () => {
        const { form } = open(aCreditCard({ id: 'card-3', name: 'Roxinho', bank: 'NUBANK' }));
        creditCards.update.mockReturnValue(of(aCreditCard({ name: 'Roxo' })));

        expect(form.form.get('bank')?.disabled).toBe(true);

        form.form.patchValue({ name: 'Roxo' });
        form.save();

        expect(creditCards.update).toHaveBeenCalledWith('card-3', { name: 'Roxo' });
        expect(notifications.success).toHaveBeenCalledWith('Cartão atualizado.');
    });

    it('reabre para cadastrar com o banco liberado de novo', () => {
        open(aCreditCard());
        const { form } = open();

        expect(form.form.get('bank')?.enabled).toBe(true);
        expect(form.form.getRawValue()).toEqual({ name: '', bank: null });
    });

    it('erros do back vão para o campo ou viram aviso', () => {
        const { form } = open();
        form.form.setValue({ name: 'Cartão', bank: 'NUBANK' });

        creditCards.create.mockReturnValue(
            apiError(400, 'VALIDATION_ERROR', 'Inválido', [
                { field: 'name', code: 'string.max', message: 'Nome longo' },
            ]),
        );
        form.save();
        expect(form.form.get('name')?.getError('server')).toBe('Nome longo');

        // O erro do back fica no campo até o usuário editá-lo; só então dá para tentar de novo.
        form.save();
        expect(creditCards.create).toHaveBeenCalledTimes(1);

        form.form.get('name')?.setValue('Cartão novo');
        creditCards.create.mockReturnValue(apiError(500, 'INTERNAL_ERROR', 'Erro interno do servidor'));
        form.save();
        expect(notifications.error).toHaveBeenCalled();
    });
});
