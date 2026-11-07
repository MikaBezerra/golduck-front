import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Nome da marca: "Gol" em branco, "uck" em laranja cantalupo e o "d" no meio girando como uma
 * moeda: a letra dá voltas em torno do próprio eixo, com um lado branco e o outro laranja (cada
 * lado é uma cópia do "d"; a de trás já começa virada, para aparecer certa quando a moeda gira).
 * Quem prefere menos movimento vê o "d" parado, em degradê do branco para o laranja.
 *
 * O tamanho e o peso da fonte vêm de quem usa (ex.: `<h1><app-brand-name /></h1>`).
 */
@Component({
    selector: 'app-brand-name',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // Leitores de tela leem só "Golduck"; a parte animada (com o "d" duplicado) fica escondida deles.
    host: { class: 'whitespace-nowrap' },
    template: `<span class="sr-only">Golduck</span
        ><span aria-hidden="true"
            >Gol<span class="coin"><span class="face front">d</span><span class="face back">d</span></span
            ><span class="text-cantaloupe">uck</span></span
        >`,
    styles: `
        .coin {
            position: relative;
            display: inline-block;
            transform-style: preserve-3d;
            animation: coin-flip 4.8s ease-in-out infinite;
        }

        .face {
            display: inline-block;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
        }

        .front {
            color: var(--p-surface-50);
            transform: rotateY(0deg);
            animation: show-front 4.8s linear infinite;
        }

        .back {
            position: absolute;
            inset: 0;
            color: var(--color-cantaloupe);
            transform: rotateY(180deg);
            animation: show-back 4.8s linear infinite;
        }

        /* Uma volta a cada 4,8 s, sempre no mesmo sentido, parando em cada lado. */
        @keyframes coin-flip {
            0%,
            25% {
                transform: perspective(400px) rotateY(0deg);
            }
            50%,
            75% {
                transform: perspective(400px) rotateY(180deg);
            }
            100% {
                transform: perspective(400px) rotateY(360deg);
            }
        }

        /*
         * Troca do lado visível no instante em que o "d" fica de perfil (90° em 37,5% e 270° em 87,5%
         * da volta: o meio de cada giro, que é simétrico). Assim o lado de trás nunca aparece por
         * baixo, mesmo nos navegadores em que esconder o verso (backface-visibility) falha.
         */
        @keyframes show-front {
            0%,
            37.5% {
                opacity: 1;
            }
            37.51%,
            87.5% {
                opacity: 0;
            }
            87.51%,
            100% {
                opacity: 1;
            }
        }

        @keyframes show-back {
            0%,
            37.5% {
                opacity: 0;
            }
            37.51%,
            87.5% {
                opacity: 1;
            }
            87.51%,
            100% {
                opacity: 0;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            .coin,
            .face {
                animation: none;
            }

            .back {
                display: none;
            }

            .front {
                background-image: linear-gradient(90deg, var(--p-surface-50), var(--color-cantaloupe));
                background-clip: text;
                color: transparent;
            }
        }
    `,
})
export class BrandNameComponent {}
