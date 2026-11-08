import { renderComponent } from '../../../../testing/components';
import { aCardSync } from '../../../../testing/fixtures';
import type { CreditCardSync } from '../data-access/credit-card.models';
import { CreditCardSyncStatusComponent } from './credit-card-sync-status.component';

describe('CreditCardSyncStatusComponent', () => {
    const now = new Date('2026-11-08T12:00:00.000Z');

    function render(sync: CreditCardSync, compact = false): string {
        const fixture = renderComponent(CreditCardSyncStatusComponent, { sync, compact, now }, []);

        return (fixture.nativeElement as HTMLElement).textContent ?? '';
    }

    it('completo: situação, datas e autorização', () => {
        const text = render(
            aCardSync({
                status: 'UPDATED',
                dataUpdatedAt: '2026-11-08T13:30:00.000Z',
                syncedAt: '2026-11-08T14:00:00.000Z',
                consentExpiresAt: '2027-06-01T00:00:00.000Z',
            }),
        );

        expect(text).toContain('Atualizado');
        expect(text).toMatch(/Dados do banco\s*08\/11\/2026/);
        expect(text).toContain('Autorização até');
        expect(text).not.toContain('Open Finance');
    });

    it('nunca sincronizado mostra traços', () => {
        const text = render(aCardSync());

        expect(text).toContain('Nunca sincronizado');
        expect(text).toContain('—');
    });

    it('mostra o erro da última tentativa e avisa a autorização perto do fim', () => {
        const text = render(
            aCardSync({
                status: 'LOGIN_ERROR',
                error: 'Pluggy fora do ar',
                consentExpiresAt: '2026-11-20T12:00:00.000Z',
            }),
        );

        expect(text).toContain('Última tentativa falhou: Pluggy fora do ar');
        expect(text).toContain('vence em 12 dias');
    });

    it('avisa a autorização vencida', () => {
        expect(render(aCardSync({ consentExpiresAt: '2026-11-01T12:00:00.000Z' }))).toContain('venceu');
    });

    it('compacto: uma linha com os dados do banco e a última sincronização', () => {
        const text = render(
            aCardSync({
                status: 'OUTDATED',
                dataUpdatedAt: '2026-11-08T13:30:00.000Z',
                syncedAt: '2026-11-08T14:00:00.000Z',
            }),
            true,
        );

        expect(text).toContain('Desatualizado');
        expect(text).toContain('Dados do banco de 08/11');
        expect(text).toContain('sincronizado em 08/11');
    });

    it('compacto sem dados ainda', () => {
        expect(render(aCardSync(), true)).toContain('Ainda sem dados do banco.');
    });
});
