import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Nome da marca: "Gol" em branco, "uck" em laranja cantalupo e o "d" no meio como uma moeda
 * girando: a letra fica parada e a cor passa de um lado para o outro (branco → laranja → branco),
 * com um brilho fino na "borda" da moeda. Quem prefere menos movimento vê o degradê parado.
 *
 * O tamanho e o peso da fonte vêm de quem usa (ex.: `<h1><app-brand-name /></h1>`).
 */
@Component({
    selector: 'app-brand-name',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `Gol<span class="coin">d</span><span class="text-cantaloupe">uck</span>`,
    styles: `
        .coin {
            /*
             * Uma faixa 5× mais larga que a letra: branco | borda | laranja | borda | branco.
             * Mover a faixa da esquerda para a direita mostra cada face por vez, sempre no
             * mesmo sentido, como uma moeda dando voltas.
             */
            background-image: linear-gradient(
                90deg,
                var(--p-surface-50) 0% 30%,
                #ffe2d6 34%,
                var(--color-cantaloupe) 40% 60%,
                #ffe2d6 66%,
                var(--p-surface-50) 70% 100%
            );
            background-size: 500% 100%;
            background-clip: text;
            color: transparent;
            animation: coin-spin 4.8s ease-in-out infinite;
        }

        @keyframes coin-spin {
            0%,
            18% {
                background-position: 0% 0;
            }
            42%,
            62% {
                background-position: 50% 0;
            }
            86%,
            100% {
                background-position: 100% 0;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .coin {
                background-image: linear-gradient(90deg, var(--p-surface-50), var(--color-cantaloupe));
                background-size: 100% 100%;
                animation: none;
            }
        }
    `,
})
export class BrandNameComponent {}
