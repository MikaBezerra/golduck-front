import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { LOG_LEVEL } from '../logging/logger.service';
import { APP_VERSION } from './app-version';
import { VersionService } from './version.service';

describe('VersionService', () => {
    let service: VersionService;
    let backend: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), { provide: LOG_LEVEL, useValue: 'error' }],
        });
        service = TestBed.inject(VersionService);
        backend = TestBed.inject(HttpTestingController);
    });

    afterEach(() => backend.verify());

    it('usa a versão do package.json e busca a da API uma vez só', () => {
        service.load();
        service.load();

        backend.expectOne('/api/version').flush({
            data: { name: 'golduck-back', version: '0.3.0', commit: 'abc1234def', environment: 'develop' },
        });

        expect(service.appVersion).toBe(APP_VERSION);
        expect(service.appVersion).toMatch(/^\d+\.\d+\.\d+/);
        expect(service.apiVersion()).toMatchObject({ version: '0.3.0', commit: 'abc1234def' });
    });

    it('sem a versão da API, só não mostra (nenhum erro na tela)', () => {
        service.load();

        backend.expectOne('/api/version').flush('não existe', { status: 404, statusText: 'Not Found' });

        expect(service.apiVersion()).toBeNull();
    });
});
