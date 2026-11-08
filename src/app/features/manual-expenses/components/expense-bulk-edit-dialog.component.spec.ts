import type { Signal } from '@angular/core';
import type { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aManualExpense, aPerson } from '../../../../testing/fixtures';
import { lookupsWith } from '../../../../testing/lookups';
import { notificationsMock } from '../../../../testing/mocks';
import { ExpenseLookupsService } from '../data-access/expense-lookups.service';
import { ManualExpenseService } from '../data-access/manual-expense.service';
import { ExpenseBulkEditDialogComponent } from './expense-bulk-edit-dialog.component';

interface Internals {
    readonly form: FormGroup;
    readonly nothingToChange: Signal<boolean>;
    readonly personOptions: Signal<{ label: string; value: string }[]>;
    save(): void;
}

describe('ExpenseBulkEditDialogComponent (várias despesas de uma vez)', () => {
    const expenses = { updateMany: vi.fn() };
    const notifications = notificationsMock();
    const selected = [aManualExpense({ id: 'e-1' }), aManualExpense({ id: 'e-2' })];

    function open() {
        expenses.updateMany.mockReset();
        Object.values(notifications).forEach((mock) => mock.mockReset());

        const fixture = openDialog(ExpenseBulkEditDialogComponent, { expenses: selected }, [
            { provide: ManualExpenseService, useValue: expenses },
            { provide: NotificationService, useValue: notifications },
            {
                provide: ExpenseLookupsService,
                useValue: lookupsWith([], [aPerson({ id: 'p-ana', name: 'Ana' })]),
            },
        ]);

        return { fixture, dialog: internals<Internals>(fixture) };
    }

    it('começa vazio, sem categoria, com "Compartilhada" como primeira opção de pessoa', () => {
        const { dialog } = open();

        expect(dialog.form.getRawValue()).toEqual({ title: '', amount: null, personId: null });
        expect(dialog.personOptions()[0]).toEqual({ label: 'Compartilhada', value: 'SHARED' });
    });

    it('sem nada preenchido, pede para escolher algo', () => {
        const { dialog } = open();

        dialog.save();

        expect(expenses.updateMany).not.toHaveBeenCalled();
        expect(dialog.nothingToChange()).toBe(true);
    });

    it('envia só os campos preenchidos para todas as selecionadas', () => {
        const { fixture, dialog } = open();
        expenses.updateMany.mockReturnValue(of(selected));

        dialog.form.patchValue({ title: ' Conta de luz ', amount: 180, personId: 'SHARED' });
        dialog.save();

        expect(expenses.updateMany).toHaveBeenCalledWith({
            ids: ['e-1', 'e-2'],
            changes: { title: 'Conta de luz', amount: '180.00', split: 'SHARED' },
        });
        expect(notifications.success).toHaveBeenCalledWith('2 despesas atualizadas.');
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('valor zerado é recusado antes de enviar', () => {
        const { dialog } = open();

        dialog.form.patchValue({ amount: 0 });
        dialog.save();

        expect(expenses.updateMany).not.toHaveBeenCalled();
        expect(dialog.form.get('amount')?.hasError('min')).toBe(true);
    });

    it('erros do back vão para o campo certo (inclusive changes.*)', () => {
        const { dialog } = open();
        dialog.form.patchValue({ personId: 'p-ana' });

        expenses.updateMany.mockReturnValue(apiError(400, 'MANUAL_EXPENSE_INACTIVE_PERSON', 'Pessoa desativada'));
        dialog.save();
        expect(dialog.form.get('personId')?.getError('server')).toBe('Pessoa desativada');

        dialog.form.patchValue({ personId: null, title: 'x' });
        expenses.updateMany.mockReturnValue(
            apiError(400, 'VALIDATION_ERROR', 'Inválido', [
                { field: 'changes.title', code: 'string.max', message: 'Título longo demais' },
            ]),
        );
        dialog.save();
        expect(dialog.form.get('title')?.getError('server')).toBe('Título longo demais');
        expect(notifications.error).not.toHaveBeenCalled();
    });
});
