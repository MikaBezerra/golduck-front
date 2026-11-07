import type { Routes } from '@angular/router';

import { ManualExpensesPageComponent } from './pages/manual-expenses-page.component';

export const MANUAL_EXPENSES_ROUTES: Routes = [{ path: '', component: ManualExpensesPageComponent, title: 'Despesas' }];
