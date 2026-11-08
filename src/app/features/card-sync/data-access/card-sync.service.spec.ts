import type { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { aCardSync } from '../../../../testing/fixtures';
import { expectApiCall, respondData, setupHttpTesting } from '../../../../testing/http-testing';
import type { CardSyncResult } from './card-sync.models';
import { CardSyncService } from './card-sync.service';

const RESULT: CardSyncResult = {
    cardId: 'card-1',
    cardName: 'C6',
    summary: { created: 2, updated: 1, unchanged: 5, removed: 0, replacedManual: 0, ignored: 1 },
    error: null,
    sync: aCardSync({ configured: true, status: 'UPDATED' }),
};

describe('CardSyncService (contrato com /api/credit-cards/{id}/sync e /api/card-sync)', () => {
    let http: HttpTestingController;
    let service: CardSyncService;

    beforeEach(() => {
        http = setupHttpTesting();
        service = TestBed.inject(CardSyncService);
    });

    afterEach(() => http.verify());

    it('sincroniza um cartão com POST sem corpo', async () => {
        const result = firstValueFrom(service.syncCard('card-1'));
        const request = expectApiCall(http, 'POST', 'credit-cards/card-1/sync');

        expect(request.request.body).toBeNull();
        respondData(request, RESULT);

        await expect(result).resolves.toEqual(RESULT);
    });

    it('sincroniza todos os cartões', async () => {
        const result = firstValueFrom(service.syncAll());
        respondData(expectApiCall(http, 'POST', 'card-sync'), [RESULT]);

        await expect(result).resolves.toEqual([RESULT]);
    });
});
