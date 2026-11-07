import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Tema visual da aplicação.
 * Parte do tema "Aura" do PrimeNG e troca apenas a cor principal.
 * Para mudar a identidade visual, altere a paleta abaixo (ex.: `{indigo.500}`).
 */
export const FinancasPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{emerald.50}',
            100: '{emerald.100}',
            200: '{emerald.200}',
            300: '{emerald.300}',
            400: '{emerald.400}',
            500: '{emerald.500}',
            600: '{emerald.600}',
            700: '{emerald.700}',
            800: '{emerald.800}',
            900: '{emerald.900}',
            950: '{emerald.950}',
        },
    },
});
