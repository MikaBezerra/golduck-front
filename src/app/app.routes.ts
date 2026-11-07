import type { Routes } from '@angular/router';

import { HomePageComponent } from './core/layout/home-page.component';
import { ShellComponent } from './core/layout/shell.component';

/**
 * Mapa de telas da aplicação.
 * Cada feature é carregada sob demanda (`loadChildren`): o código de
 * "Categorias" só é baixado quando o usuário abre essa tela.
 */
export const routes: Routes = [
    {
        path: '',
        component: ShellComponent,
        children: [{ path: '', component: HomePageComponent, title: 'Início' }],
    },
    { path: '**', redirectTo: '' },
];
