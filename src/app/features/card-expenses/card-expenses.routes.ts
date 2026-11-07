import type { Routes } from '@angular/router';

import { CardExpensesPageComponent } from './pages/card-expenses-page.component';

export const CARD_EXPENSES_ROUTES: Routes = [{ path: '', component: CardExpensesPageComponent, title: 'Faturas' }];
