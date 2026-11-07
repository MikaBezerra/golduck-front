import type { Environment } from './environment.model';

/**
 * Produção (`npm run build:production`, que é também o `npm run build` padrão).
 *
 * TODO: endereço provisório. Troque pelo domínio do back de produção na Vercel e libere o
 * domínio deste front na variável `API_CORS_ORIGINS` do back.
 */
export const environment: Environment = {
    apiBaseUrl: 'https://CHANGE_ME.vercel.app/api',
    logLevel: 'warn',
};
