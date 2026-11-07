import type { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guard';
import { ShellComponent } from './core/layout/shell.component';

/**
 * Mapa de telas da aplicação.
 * Cada feature é carregada sob demanda (`loadChildren`): o código de
 * "Categorias" só é baixado quando o usuário abre essa tela.
 */
export const routes: Routes = [
    {
        path: 'login',
        canActivate: [guestGuard],
        loadChildren: async () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
    },
    {
        path: '',
        component: ShellComponent,
        canActivate: [authGuard],
        canActivateChild: [authGuard],
        children: [
            {
                path: 'despesas',
                loadChildren: async () =>
                    import('./features/manual-expenses/manual-expenses.routes').then((m) => m.MANUAL_EXPENSES_ROUTES),
            },
            {
                path: 'faturas',
                loadChildren: async () =>
                    import('./features/card-expenses/card-expenses.routes').then((m) => m.CARD_EXPENSES_ROUTES),
            },
            {
                path: 'entradas',
                loadChildren: async () => import('./features/incomes/incomes.routes').then((m) => m.INCOMES_ROUTES),
            },
            {
                path: 'cartoes',
                loadChildren: async () =>
                    import('./features/credit-cards/credit-cards.routes').then((m) => m.CREDIT_CARDS_ROUTES),
            },
            {
                path: 'categorias',
                loadChildren: async () =>
                    import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
            },
            {
                path: 'pessoas',
                loadChildren: async () => import('./features/people/people.routes').then((m) => m.PEOPLE_ROUTES),
            },
            {
                // Visão geral (/) e Resumo (/resumo). Por último: só é carregado quando nenhuma outra rota serve.
                path: '',
                loadChildren: async () => import('./features/summary/summary.routes').then((m) => m.SUMMARY_ROUTES),
            },
        ],
    },
    { path: '**', redirectTo: '' },
];
