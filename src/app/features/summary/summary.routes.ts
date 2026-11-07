import type { Routes } from '@angular/router';

import { SummaryPageComponent } from './pages/summary-page.component';
import { SummaryStatementPageComponent } from './pages/summary-statement-page.component';

/** Visão geral com gráficos (página inicial, aberta pelo logo) e o resumo do mês em tabela. */
export const SUMMARY_ROUTES: Routes = [
    { path: '', pathMatch: 'full', component: SummaryPageComponent, title: 'Visão geral' },
    { path: 'resumo', component: SummaryStatementPageComponent, title: 'Resumo' },
];
