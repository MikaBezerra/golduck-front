import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Nome da marca: "Gol" em branco, o "d" fazendo a transição em degradê e "uck" em laranja cantalupo.
 * O tamanho e o peso da fonte vêm de quem usa (ex.: `<h1><app-brand-name /></h1>`).
 */
@Component({
    selector: 'app-brand-name',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `Gol<span class="bg-linear-90 from-surface-50 to-cantaloupe bg-clip-text text-transparent">d</span
        ><span class="text-cantaloupe">uck</span>`,
})
export class BrandNameComponent {}
