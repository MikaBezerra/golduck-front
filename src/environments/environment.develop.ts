import type { Environment } from './environment.model';

/**
 * Ambiente develop (projeto `golduck-front-develop` na Vercel, `npm run build:develop`).
 *
 * A API fica em `/api` no próprio domínio do front: a Vercel repassa para o back de develop
 * (rota do `vercel.json` com a variável `API_ORIGIN` do projeto). Assim front e API são o mesmo
 * site para o navegador e o cookie da sessão funciona.
 */
export const environment: Environment = {
    apiBaseUrl: '/api',
    logLevel: 'info',
};
