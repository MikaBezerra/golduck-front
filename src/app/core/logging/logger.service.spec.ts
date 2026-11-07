import { TestBed } from '@angular/core/testing';

import type { LogLevel } from '../../../environments/environment.model';
import { LOG_LEVEL, LoggerService } from './logger.service';

function createLogger(level: LogLevel): LoggerService {
    TestBed.configureTestingModule({ providers: [{ provide: LOG_LEVEL, useValue: level }] });

    return TestBed.inject(LoggerService);
}

describe('LoggerService', () => {
    afterEach(() => vi.restoreAllMocks());

    it('em produção (warn) esconde debug e info', () => {
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
        const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const logger = createLogger('warn');

        logger.debug('detalhe');
        logger.info('informação');
        logger.warn('cuidado');

        expect(debug).not.toHaveBeenCalled();
        expect(info).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledTimes(1);
        expect(logger.isEnabled('error')).toBe(true);
    });

    it('em desenvolvimento (debug) mostra tudo, com os dados e o erro original', () => {
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
        const logger = createLogger('debug');
        const cause = new Error('quebrou');

        logger.debug('carregando');
        logger.error('Falhou', { requestId: 'abc' }, cause);

        expect(debug).toHaveBeenCalledTimes(1);
        expect(error.mock.calls[0][0]).toContain('ERROR');
        expect(error.mock.calls[0][0]).toContain('Falhou');
        expect(error.mock.calls[0].slice(3)).toEqual([{ requestId: 'abc' }, cause]);
    });
});
