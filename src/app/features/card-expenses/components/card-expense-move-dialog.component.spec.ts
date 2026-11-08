import type { Signal } from '@angular/core';
import type { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aCardExpense } from '../../../../testing/fixtures';
import { notificationsMock } from '../../../../testing/mocks';
import type { CardExpense } from '../data-access/card-expense.models';
import { CardExpenseService } from '../data-access/card-expense.service';
import { CardExpenseMoveDialogComponent } from './card-expense-move-dialog.component';

interface Internals {
    readonly form: FormGroup;
    readonly allowed: Signal<boolean>;
    save(): void;
}

describe('CardExpenseMoveDialogComponent', () => {
    const cardExpenses = { move: vi.fn() };
    const notifications = notificationsMock();
    const installment = aCardExpense({
        id: 'ce-3',
        origin: 'SYNC',
        importId: null,
        month: '2026-11',
        installment: { number: 3, total: 5 },
    });

    function open(expense: CardExpense | null) {
        cardExpenses.move.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(CardExpenseMoveDialogComponent, { expense }, [
            { provide: CardExpenseService, useValue: cardExpenses },
            { provide: NotificationService, useValue: notifications },
        ]);
        const moved = vi.fn();
        fixture.componentInstance.moved.subscribe(moved);

        return { fixture, dialog: internals<Internals>(fixture), moved };
    }

    it('abre com a fatura e a parcela atuais e o aviso de que a compra inteira muda', () => {
        const { fixture, dialog } = open(installment);
        const text = (fixture.nativeElement as HTMLElement).ownerDocument.body.textContent ?? '';

        expect(dialog.form.getRawValue()).toEqual({
            month: new Date(2026, 10, 1),
            installmentNumber: 3,
            installmentTotal: 5,
        });
        expect(text).toContain('A compra inteira muda');
        expect(text).toContain('próximas sincronizações');
    });

    it('muda só o mês: parcela e total ficam de fora', () => {
        const { fixture, dialog, moved } = open(installment);
        cardExpenses.move.mockReturnValue(of([installment]));

        dialog.form.patchValue({ month: new Date(2026, 11, 1) });
        dialog.save();

        expect(cardExpenses.move).toHaveBeenCalledWith('ce-3', { month: '2026-12' });
        expect(notifications.success).toHaveBeenCalledWith(
            'Compra movida: esta parcela agora está na fatura de Dezembro de 2026.',
        );
        expect(moved).toHaveBeenCalledWith('2026-12');
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('muda a parcela no mesmo mês', () => {
        const { dialog } = open(installment);
        cardExpenses.move.mockReturnValue(of([installment]));

        dialog.form.patchValue({ installmentNumber: 1, installmentTotal: 6 });
        dialog.save();

        expect(cardExpenses.move).toHaveBeenCalledWith('ce-3', {
            month: '2026-11',
            installmentNumber: 1,
            installmentTotal: 6,
        });
    });

    it('sem mudança, só avisa e fecha', () => {
        const { dialog } = open(installment);

        dialog.save();

        expect(cardExpenses.move).not.toHaveBeenCalled();
        expect(notifications.info).toHaveBeenCalledWith('Nada foi alterado.');
    });

    it('compra de upload: formulário desligado e nada é enviado', () => {
        const { fixture, dialog } = open(aCardExpense({ origin: 'UPLOAD' }));
        const text = (fixture.nativeElement as HTMLElement).ownerDocument.body.textContent ?? '';

        expect(dialog.allowed()).toBe(false);
        expect(dialog.form.disabled).toBe(true);
        expect(text).toContain('fatura enviada por arquivo');

        dialog.save();
        expect(cardExpenses.move).not.toHaveBeenCalled();
    });

    it('sem despesa, não faz nada', () => {
        const { dialog } = open(null);

        dialog.save();

        expect(cardExpenses.move).not.toHaveBeenCalled();
    });

    it('valida a parcela antes de enviar', () => {
        const { dialog } = open(installment);

        dialog.form.patchValue({ installmentNumber: 6 });
        dialog.save();

        expect(dialog.form.hasError('installment')).toBe(true);
        expect(cardExpenses.move).not.toHaveBeenCalled();
    });

    it('erros do back: parcela inválida no campo, o resto vira aviso', () => {
        const { dialog } = open(installment);
        dialog.form.patchValue({ month: new Date(2026, 11, 1) });

        cardExpenses.move.mockReturnValue(apiError(422, 'CARD_EXPENSE_INSTALLMENT_INVALID', 'Parcela inválida'));
        dialog.save();
        expect(dialog.form.get('installmentNumber')?.getError('server')).toBe('Parcela inválida');

        dialog.form.patchValue({ installmentNumber: 2 });
        cardExpenses.move.mockReturnValue(apiError(409, 'CARD_EXPENSE_MOVE_NOT_ALLOWED', 'Não muda'));
        dialog.save();
        expect(notifications.error).toHaveBeenCalled();
    });
});
