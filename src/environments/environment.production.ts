import type { Environment } from './environment.model';

/**
 * Produção (projeto `golduck-front` na Vercel, `npm run build:production`, que é também o
 * `npm run build` padrão).
 *
 * A API fica em `/api` no próprio domínio do front: a Vercel repassa para o back de produção
 * (rota do `vercel.json` com a variável `API_ORIGIN` do projeto).
 */
export const environment: Environment = {
    apiBaseUrl: '/api',
    logLevel: 'warn',
};
