import type { Routes } from '@angular/router';

import { PeoplePageComponent } from './pages/people-page.component';

export const PEOPLE_ROUTES: Routes = [{ path: '', component: PeoplePageComponent, title: 'Pessoas' }];
