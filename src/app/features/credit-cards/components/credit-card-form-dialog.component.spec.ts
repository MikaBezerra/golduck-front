import type { FormGroup } from '@angular/forms';
import { of } from 'rxjs';

import { NotificationService } from '../../../core/notification/notification.service';
import { apiError, internals, openDialog } from '../../../../testing/components';
import { aCardSync, aCreditCard, aSyncedCreditCard } from '../../../../testing/fixtures';
import { notificationsMock } from '../../../../testing/mocks';
import type { CreditCard } from '../data-access/credit-card.models';
import { CreditCardService } from '../data-access/credit-card.service';
import { CreditCardFormDialogComponent } from './credit-card-form-dialog.component';

interface Internals {
    readonly form: FormGroup;
    save(): void;
}

const ITEM_ID = '11111111-2222-4333-8444-555555555555';
const EMPTY_BILLING = { dueDay: null, bestPurchaseDay: null, pluggyItemId: '', syncFromMonth: null };

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

    it('cadastra só com nome e banco: os campos opcionais vazios ficam de fora', () => {
        const { fixture, form } = open();
        creditCards.create.mockReturnValue(of(aCreditCard({ name: 'C6 preto', bank: 'C6' })));

        form.form.setValue({ name: ' C6 preto ', bank: 'C6', ...EMPTY_BILLING });
        form.save();

        expect(creditCards.create).toHaveBeenCalledWith({ name: 'C6 preto', bank: 'C6' });
        expect(notifications.success).toHaveBeenCalledWith('Cartão cadastrado.');
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('cadastra com o ciclo da fatura e a sincronização', () => {
        const { form } = open();
        creditCards.create.mockReturnValue(of(aSyncedCreditCard()));

        form.form.setValue({
            name: 'C6',
            bank: 'C6',
            dueDay: 1,
            bestPurchaseDay: 25,
            pluggyItemId: ` ${ITEM_ID.toUpperCase()} `,
            syncFromMonth: new Date(2026, 10, 1),
        });
        form.save();

        expect(creditCards.create).toHaveBeenCalledWith({
            name: 'C6',
            bank: 'C6',
            dueDay: 1,
            bestPurchaseDay: 25,
            pluggyItemId: ITEM_ID,
            syncFromMonth: '2026-11',
        });
    });

    it('com o item do Meu Pluggy, exige vencimento, melhor dia e primeira fatura', () => {
        const { form } = open();

        form.form.setValue({ name: 'C6', bank: 'C6', ...EMPTY_BILLING, pluggyItemId: ITEM_ID });
        form.save();

        expect(creditCards.create).not.toHaveBeenCalled();
        expect(form.form.hasError('syncSettings')).toBe(true);
    });

    it('valida o id do item e os dias (1 a 31)', () => {
        const { form } = open();

        form.form.patchValue({ pluggyItemId: 'abc', dueDay: 0, bestPurchaseDay: 32 });

        expect(form.form.get('pluggyItemId')?.hasError('pattern')).toBe(true);
        expect(form.form.get('dueDay')?.hasError('min')).toBe(true);
        expect(form.form.get('bestPurchaseDay')?.hasError('max')).toBe(true);
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

    it('na edição abre com o ciclo e o item; apagar o item desliga a sincronização (null)', () => {
        const { form } = open(aSyncedCreditCard({ id: 'card-5' }));
        creditCards.update.mockReturnValue(of(aCreditCard()));

        expect(form.form.getRawValue()).toMatchObject({
            dueDay: 1,
            bestPurchaseDay: 25,
            pluggyItemId: ITEM_ID,
            syncFromMonth: new Date(2026, 10, 1),
        });

        form.form.patchValue({ pluggyItemId: '', syncFromMonth: null, bestPurchaseDay: 20 });
        form.save();

        expect(creditCards.update).toHaveBeenCalledWith('card-5', {
            bestPurchaseDay: 20,
            pluggyItemId: null,
            syncFromMonth: null,
        });
    });

    it('na edição, vencimento e melhor dia já informados não podem ser apagados', () => {
        const { form } = open(aSyncedCreditCard());

        form.form.patchValue({ dueDay: null });
        form.save();

        expect(creditCards.update).not.toHaveBeenCalled();
        expect(form.form.get('dueDay')?.hasError('required')).toBe(true);
    });

    it('na edição sem mudanças, só avisa e fecha', () => {
        const { fixture, form } = open(aSyncedCreditCard({ sync: aCardSync({ error: 'Pluggy fora do ar' }) }));

        form.save();

        expect(creditCards.update).not.toHaveBeenCalled();
        expect(notifications.info).toHaveBeenCalledWith('Nada foi alterado.');
        expect(fixture.componentInstance.visible()).toBe(false);
    });

    it('na edição mostra a situação da sincronização', () => {
        const { fixture } = open(
            aSyncedCreditCard({ sync: aCardSync({ status: 'LOGIN_ERROR', error: 'Item com erro de login' }) }),
        );
        const text = (fixture.nativeElement as HTMLElement).ownerDocument.body.textContent ?? '';

        expect(text).toContain('Autorização vencida ou recusada');
        expect(text).toContain('Última tentativa falhou: Item com erro de login');
    });

    it('reabre para cadastrar com o banco liberado de novo', () => {
        open(aCreditCard());
        const { form } = open();

        expect(form.form.get('bank')?.enabled).toBe(true);
        expect(form.form.getRawValue()).toEqual({ name: '', bank: null, ...EMPTY_BILLING });
    });

    it('erros do back vão para o campo ou viram aviso', () => {
        const { form } = open();
        form.form.setValue({ name: 'Cartão', bank: 'NUBANK', ...EMPTY_BILLING });

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
