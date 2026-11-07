import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { NotificationService } from '../../core/notification/notification.service';
import { notificationsMock, type NotificationsMock } from '../../../testing/mocks';
import { type RemoteData, remoteData } from './remote-data';

/** Cada mês pedido fica pendente num Subject até o teste responder. */
const pending = new Map<string, Subject<string[]>>();

@Component({
    selector: 'app-remote-data-host',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '',
})
class HostComponent {
    public readonly month = signal('2026-11');
    public readonly calls: string[] = [];
    public readonly data: RemoteData<string[]> = remoteData({
        params: () => this.month(),
        load: (month) => {
            this.calls.push(month);
            const subject = new Subject<string[]>();
            pending.set(month, subject);

            return subject;
        },
        initialValue: [],
    });
}

describe('remoteData', () => {
    let notifications: NotificationsMock;

    function respond(month: string, value: string[]): void {
        const subject = pending.get(month);
        subject?.next(value);
        subject?.complete();
    }

    function setup(): HostComponent {
        pending.clear();
        notifications = notificationsMock();
        TestBed.configureTestingModule({ providers: [{ provide: NotificationService, useValue: notifications }] });

        const fixture = TestBed.createComponent(HostComponent);
        TestBed.tick();

        return fixture.componentInstance;
    }

    it('carrega com os parâmetros iniciais e marca o carregamento', () => {
        const host = setup();

        expect(host.calls).toEqual(['2026-11']);
        expect(host.data.loading()).toBe(true);
        expect(host.data.value()).toEqual([]);

        respond('2026-11', ['aluguel']);

        expect(host.data.loading()).toBe(false);
        expect(host.data.value()).toEqual(['aluguel']);
    });

    it('recarrega quando o parâmetro muda e descarta a resposta do mês anterior', () => {
        const host = setup();

        host.month.set('2026-12');
        TestBed.tick();
        expect(host.calls).toEqual(['2026-11', '2026-12']);

        // A resposta de novembro chega atrasada: não pode aparecer na tela de dezembro.
        respond('2026-11', ['de novembro']);
        expect(host.data.value()).toEqual([]);
        expect(host.data.loading()).toBe(true);

        respond('2026-12', ['de dezembro']);
        expect(host.data.value()).toEqual(['de dezembro']);
    });

    it('reload busca de novo com os mesmos parâmetros', () => {
        const host = setup();
        respond('2026-11', ['v1']);

        host.data.reload();
        expect(host.calls).toEqual(['2026-11', '2026-11']);
        expect(host.data.loading()).toBe(true);

        respond('2026-11', ['v2']);
        expect(host.data.value()).toEqual(['v2']);
    });

    it('em erro, avisa, para de carregar e mantém o último valor', () => {
        const host = setup();
        respond('2026-11', ['v1']);

        host.data.reload();
        const error = new Error('falhou');
        pending.get('2026-11')?.error(error);

        expect(notifications.error).toHaveBeenCalledWith(error);
        expect(host.data.loading()).toBe(false);
        expect(host.data.value()).toEqual(['v1']);

        // Depois de um erro, novas buscas continuam funcionando.
        host.data.reload();
        respond('2026-11', ['v3']);
        expect(host.data.value()).toEqual(['v3']);
    });
});
