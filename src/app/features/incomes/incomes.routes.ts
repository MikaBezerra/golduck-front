import type { Routes } from '@angular/router';

import { IncomesPageComponent } from './pages/incomes-page.component';

export const INCOMES_ROUTES: Routes = [{ path: '', component: IncomesPageComponent, title: 'Entradas' }];
