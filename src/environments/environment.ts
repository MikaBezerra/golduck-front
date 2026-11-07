import type { Environment } from './environment.model';

/**
 * Desenvolvimento local (`ng serve`, `npm test`): a API fica em `/api` e o `proxy.conf.json`
 * repassa para http://localhost:3000.
 *
 * Os builds publicados trocam este arquivo por `environment.develop.ts` ou
 * `environment.production.ts` (`fileReplacements` no angular.json).
 */
export const environment: Environment = {
    apiBaseUrl: '/api',
};
