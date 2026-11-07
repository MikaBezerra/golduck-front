import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import localePt from '@angular/common/locales/pt';
import {
    ApplicationConfig,
    DEFAULT_CURRENCY_CODE,
    ErrorHandler,
    LOCALE_ID,
    provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { requestIdInterceptor } from './core/api/request-id.interceptor';
import { authInterceptor } from './core/auth/auth.interceptor';
import { PRIMENG_PT_BR } from './core/config/primeng-pt-br';
import { AppPreset } from './core/config/theme.preset';
import { GlobalErrorHandler } from './core/errors/global-error-handler';
import { AppTitleStrategy } from './core/layout/app-title.strategy';

registerLocaleData(localePt);

/**
 * Equivalente ao `app.module.ts` do NestJS: tudo o que a aplicação inteira
 * enxerga (rotas, HTTP, idioma, tema) é registrado aqui.
 */
export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
        provideRouter(routes, withComponentInputBinding()),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
        provideHttpClient(withFetch(), withInterceptors([requestIdInterceptor, authInterceptor])),
        { provide: LOCALE_ID, useValue: 'pt-BR' },
        { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' },
        providePrimeNG({
            theme: {
                preset: AppPreset,
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
