import { aCardSync, aCreditCard } from '../../../../testing/fixtures';
import {
    billDateRange,
    canMarkBillPaid,
    consentWarning,
    describeConsentWarning,
    hasBillingCycle,
    isPluggyProblem,
    limitUsage,
    pluggyStatusLabel,
} from './credit-card.models';

describe('credit-card.models', () => {
    const now = new Date('2026-11-08T12:00:00.000Z');

    describe('consentWarning', () => {
        it('sem data de fim da autorização, não avisa', () => {
            expect(consentWarning(aCardSync(), now)).toBeNull();
            expect(consentWarning(aCardSync({ consentExpiresAt: 'não é data' }), now)).toBeNull();
        });

        it('longe do fim (mais de 30 dias), não avisa', () => {
            expect(consentWarning(aCardSync({ consentExpiresAt: '2026-12-09T12:00:00.000Z' }), now)).toBeNull();
        });

        it('a 30 dias ou menos, avisa com os dias que faltam', () => {
            expect(consentWarning(aCardSync({ consentExpiresAt: '2026-12-08T12:00:00.000Z' }), now)).toEqual({
                daysLeft: 30,
                expired: false,
            });
            expect(consentWarning(aCardSync({ consentExpiresAt: '2026-11-09T06:00:00.000Z' }), now)).toEqual({
                daysLeft: 1,
                expired: false,
            });
        });

        it('vencida, avisa como vencida', () => {
            expect(consentWarning(aCardSync({ consentExpiresAt: '2026-11-01T12:00:00.000Z' }), now)).toEqual({
                daysLeft: -7,
                expired: true,
            });
        });
    });

    it('descreve o aviso da autorização', () => {
        expect(describeConsentWarning({ daysLeft: 12, expired: false })).toContain('vence em 12 dias');
        expect(describeConsentWarning({ daysLeft: 1, expired: false })).toContain('vence amanhã');
        expect(describeConsentWarning({ daysLeft: 0, expired: true })).toContain('venceu');
    });

    it('traduz a situação do item e destaca as que impedem os dados de chegar', () => {
        expect(pluggyStatusLabel('UPDATED')).toBe('Atualizado');
        expect(pluggyStatusLabel('NOVA_SITUACAO')).toBe('NOVA_SITUACAO');
        expect(pluggyStatusLabel(null)).toBe('—');
        expect(isPluggyProblem('LOGIN_ERROR')).toBe(true);
        expect(isPluggyProblem('UPDATED')).toBe(false);
        expect(isPluggyProblem(null)).toBe(false);
    });

    it('o ciclo da fatura precisa de vencimento e melhor dia', () => {
        expect(hasBillingCycle(aCreditCard({ dueDay: 1, bestPurchaseDay: 25 }))).toBe(true);
        expect(hasBillingCycle(aCreditCard({ dueDay: 1 }))).toBe(false);
        expect(hasBillingCycle(aCreditCard({ bestPurchaseDay: 25 }))).toBe(false);
    });

    it('o melhor dia da fatura vai do início do mês anterior ao fim do mês da fatura', () => {
        expect(billDateRange('2026-11')).toEqual({ min: '2026-10-01', max: '2026-11-30' });
        expect(billDateRange('2027-01')).toEqual({ min: '2026-12-01', max: '2027-01-31' });
        expect(billDateRange('2028-02')).toEqual({ min: '2028-01-01', max: '2028-02-29' });
    });

    it('canMarkBillPaid: só fatura fechada ou vencida pode ser marcada como paga', () => {
        expect(canMarkBillPaid('closed')).toBe(true);
        expect(canMarkBillPaid('overdue')).toBe(true);
        expect(canMarkBillPaid('open')).toBe(false);
        expect(canMarkBillPaid('paid')).toBe(false);
    });

    it('limitUsage: parte ocupada do limite (0 a 100%), estourado e sem limite', () => {
        expect(limitUsage('5000.00', '3500.00')).toEqual({ usedPercent: 30, exceeded: false });
        expect(limitUsage('5000.00', '6000.00')).toEqual({ usedPercent: 0, exceeded: false });
        expect(limitUsage('500.00', '-100.00')).toEqual({ usedPercent: 100, exceeded: true });
        expect(limitUsage(null, null)).toBeNull();
        expect(limitUsage('0.00', '0.00')).toEqual({ usedPercent: 0, exceeded: false });
    });
});
