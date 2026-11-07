import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { PRIMENG_PT_BR } from './core/config/primeng-pt-br';
import { FinancasPreset } from './core/config/theme.preset';

registerLocaleData(localePt);

/**
 * Equivalente ao `app.module.ts` do NestJS: tudo o que a aplicação inteira
 * enxerga (rotas, HTTP, idioma, tema) é registrado aqui.
 */
export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes, withComponentInputBinding()),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
        providePrimeNG({
            theme: {
                preset: FinancasPreset,
                options: {
                    darkModeSelector: '.app-dark',
                    cssLayer: {
                        name: 'primeng',
                        order: 'theme, base, primeng, components, utilities',
                    },
                },
            },
            translation: PRIMENG_PT_BR,
        }),
        MessageService,
        ConfirmationService,
    ],
};
