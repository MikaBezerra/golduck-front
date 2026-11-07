import type { Environment } from './environment.model';

/**
 * Ambiente develop (preview na Vercel, `npm run build:develop`).
 *
 * TODO: endereço provisório. Troque pelo domínio do back de develop na Vercel e libere o
 * domínio deste front na variável `API_CORS_ORIGINS` do back.
 */
export const environment: Environment = {
    apiBaseUrl: 'https://CHANGE_ME-develop.vercel.app/api',
    logLevel: 'info',
};
