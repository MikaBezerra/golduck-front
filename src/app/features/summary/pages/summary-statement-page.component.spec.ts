import { type Signal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { SelectedMonthService } from '../../../core/month/selected-month.service';
import { NotificationService } from '../../../core/notification/notification.service';
import { internals, renderComponent } from '../../../../testing/components';
import { notificationsMock } from '../../../../testing/mocks';
import { SummaryDispatchService } from '../../summary-dispatch/data-access/summary-dispatch.service';
import type { SummaryStatement } from '../data-access/summary.models';
import { SummaryService } from '../data-access/summary.service';
import { SummaryStatementPageComponent } from './summary-statement-page.component';

interface Internals {
    readonly statement: Signal<SummaryStatement | null>;
    readonly isAdmin: Signal<boolean>;
    readonly dispatchDisabled: Signal<boolean>;
    readonly expandableIds: Signal<string[]>;
    readonly allOpen: Signal<boolean>;
    toggleAll(): void;
}

const STATEMENT = {
    month: '2026-11',
    columns: [{ id: 'p-ana', name: 'Ana', initial: 'A', inactive: false }],
    sections: [
        {
            id: 'shared',
            title: 'Compartilhado',
            hint: 'Dividido igualmente entre as pessoas ativas',
            rows: [
                {
                    id: 'shared-fixed',
                    label: 'Gastos fixos',
                    note: null,
                    total: '100.00',
                    cells: ['100.00'],
                    style: 'item',
                    children: [
                        {
                            id: 'e1',
                            label: 'Luz',
                            note: null,
                            total: '100.00',
                            cells: null,
                            style: 'detail',
                            children: [],
                        },
                    ],
                },
                {
                    id: 'shared-net',
                    label: 'Líquido',
                    note: null,
                    total: '-50.00',
                    cells: ['-50.00'],
                    style: 'highlight',
                    children: [],
                },
            ],
        },
    ],
    breakdown: [],
    reserve: { month: null, accumulated: '0.00' },
    hasPeople: true,
    incomeMissing: false,
} as SummaryStatement;

describe('SummaryStatementPageComponent (resumo do mês em tabela)', () => {
    const summary = { findStatement: vi.fn() };
    const dispatches = { preview: vi.fn(), dispatch: vi.fn(), email: vi.fn() };

    function render(role: 'ADMIN' | 'USER', enabled = true) {
        sessionStorage.clear();
        summary.findStatement.mockReset().mockReturnValue(of(STATEMENT));
        dispatches.preview.mockReset().mockReturnValue(
            of({
                month: '2026-11',
                enabled,
                recipients: [],
                lastDispatch: {
                    id: 'd-1',
                    month: '2026-11',
                    channel: 'EMAIL',
                    status: 'DONE',
                    startedAt: '2026-11-08T12:30:00.000Z',
                    finishedAt: '2026-11-08T12:30:05.000Z',
                    counts: { sent: 1, skipped: 1, failed: 0 },
                    items: [{}, {}],
                },
            }),
        );

        const fixture = renderComponent(SummaryStatementPageComponent, {}, [
            provideRouter([]),
            { provide: SummaryService, useValue: summary },
            { provide: SummaryDispatchService, useValue: dispatches },
            { provide: AuthService, useValue: { user: signal({ email: 'a@a.com', role }) } },
            { provide: NotificationService, useValue: notificationsMock() },
        ]);
        TestBed.inject(SelectedMonthService).set('2026-11');
        TestBed.tick();
        fixture.detectChanges();

        return {
            fixture,
            page: internals<Internals>(fixture),
            text: () => fixture.nativeElement.textContent as string,
        };
    }

    afterEach(() => sessionStorage.clear());

    it('mostra a tabela pronta do back, sem fazer contas', () => {
        const { page, text } = render('USER');

        expect(summary.findStatement).toHaveBeenCalledWith('2026-11');
        expect(page.statement()).toBe(STATEMENT);
        expect(text()).toContain('Gastos fixos');
        expect(text()).toContain('Compartilhado');
    });

    it('abre e fecha todos os detalhes', () => {
        const { page } = render('USER');

        expect(page.expandableIds()).toEqual(['shared-fixed']);
        page.toggleAll();
        expect(page.allOpen()).toBe(true);
        page.toggleAll();
        expect(page.allOpen()).toBe(false);
    });

    it('usuário comum: sem botão de envio e sem buscar a prévia', () => {
        const { page, text } = render('USER');

        expect(page.isAdmin()).toBe(false);
        expect(dispatches.preview).not.toHaveBeenCalled();
        expect(text()).not.toContain('Último envio');
    });

    it('ADMIN: mostra o último envio do mês abaixo do cabeçalho', () => {
        const { page, text } = render('ADMIN');

        expect(page.isAdmin()).toBe(true);
        expect(dispatches.preview).toHaveBeenCalledWith('2026-11');
        expect(text()).toMatch(/Último envio: 08\/11 \d{2}:30 · 1 de\s+2 entregues/);
        expect(page.dispatchDisabled()).toBe(false);
    });

    it('ADMIN com o envio desligado: botão desabilitado', () => {
        const { page, fixture } = render('ADMIN', false);
        const button = (fixture.nativeElement as HTMLElement).querySelector(
            'button[aria-label="Enviar por e-mail (envio de e-mail desligado)"]',
        ) as HTMLButtonElement;

        expect(page.dispatchDisabled()).toBe(true);
        expect(button.disabled).toBe(true);
    });
});
