import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/*
 * Identidade visual: preto meia-noite (#02070A) de fundo, azul elétrico (#0297DE) como cor
 * principal, laranja cantalupo (#FC734D) para destaques e texto quase branco.
 * A aplicação usa só o modo escuro (classe `app-dark` no <html>, ver index.html).
 *
 * Os componentes do PrimeNG leem estes "tokens" (como variáveis de ambiente do tema):
 * trocar uma cor aqui muda botões, campos, tabelas e diálogos de uma vez.
 */

/** Azul elétrico: o 500 é a cor da marca. */
const ELECTRIC = {
    50: '#e6f6fd',
    100: '#c2e8fa',
    200: '#8dd3f5',
    300: '#52bcee',
    400: '#22a8e6',
    500: '#0297de',
    600: '#0280be',
    700: '#02679a',
    800: '#034f75',
    900: '#043a55',
    950: '#032537',
};

/** Superfícies: do quase branco ao preto meia-noite, puxadas para o azul. */
const MIDNIGHT = {
    0: '#ffffff',
    50: '#eef4f8',
    100: '#d5e1ea',
    200: '#afc2d0',
    300: '#8ba2b3',
    400: '#6a8396',
    500: '#4d6577',
    600: '#36495a',
    700: '#233444',
    800: '#142330',
    900: '#0a1822',
    950: '#02070a',
};

export const AppPreset = definePreset(Aura, {
    primitive: {
        // Cantos mais arredondados que o padrão do Aura (visual mais moderno).
        borderRadius: { none: '0', xs: '4px', sm: '6px', md: '10px', lg: '14px', xl: '20px' },
    },
    semantic: {
        primary: ELECTRIC,
        colorScheme: {
            dark: {
                surface: MIDNIGHT,
                primary: {
                    color: '{primary.500}',
                    contrastColor: '#02070a',
                    hoverColor: '{primary.400}',
                    activeColor: '{primary.300}',
                },
                highlight: {
                    background: 'color-mix(in srgb, {primary.500}, transparent 80%)',
                    focusBackground: 'color-mix(in srgb, {primary.500}, transparent 70%)',
                    color: '#ffffff',
                    focusColor: '#ffffff',
                },
                mask: { background: 'rgba(2, 7, 10, 0.72)', color: '{surface.200}' },
                text: {
                    color: '{surface.50}',
                    hoverColor: '{surface.0}',
                    // 300 (e não 400) para o texto secundário passar no contraste AA sobre os cartões.
                    mutedColor: '{surface.300}',
                    hoverMutedColor: '{surface.200}',
                },
                content: {
                    background: '{surface.900}',
                    hoverBackground: '{surface.800}',
                    borderColor: 'color-mix(in srgb, {primary.200}, transparent 86%)',
                    color: '{text.color}',
                    hoverColor: '{text.hover.color}',
                },
                formField: {
                    background: 'color-mix(in srgb, {surface.950}, transparent 30%)',
                    disabledBackground: '{surface.800}',
                    filledBackground: '{surface.800}',
                    filledHoverBackground: '{surface.800}',
                    filledFocusBackground: '{surface.800}',
                    borderColor: '{surface.700}',
                    hoverBorderColor: '{surface.500}',
                    focusBorderColor: '{primary.color}',
                    invalidBorderColor: '{red.400}',
                    color: '{surface.50}',
                    disabledColor: '{surface.400}',
                    placeholderColor: '{surface.400}',
                    invalidPlaceholderColor: '{red.300}',
                    floatLabelColor: '{surface.400}',
                    floatLabelFocusColor: '{primary.color}',
                    floatLabelActiveColor: '{surface.400}',
                    floatLabelInvalidColor: '{form.field.invalid.placeholder.color}',
                    iconColor: '{surface.400}',
                    shadow: 'none',
                },
                overlay: {
                    select: { background: '{surface.900}', borderColor: '{surface.700}', color: '{text.color}' },
                    popover: { background: '{surface.900}', borderColor: '{surface.700}', color: '{text.color}' },
                    modal: { background: '{surface.900}', borderColor: '{surface.700}', color: '{text.color}' },
                },
            },
        },
    },
    components: {
        // Seletores de opção (ex.: Mês | Ano): a opção marcada fica azul, bem visível no escuro.
        togglebutton: {
            colorScheme: {
                dark: {
                    root: {
                        background: '{surface.950}',
                        checkedBackground: '{surface.950}',
                        hoverBackground: '{surface.950}',
                        borderColor: '{surface.700}',
                        checkedBorderColor: '{surface.700}',
                        color: '{surface.300}',
                        hoverColor: '{surface.100}',
                        checkedColor: '#02070a',
                    },
                    content: { checkedBackground: '{primary.500}' },
                    icon: { color: '{surface.300}', hoverColor: '{surface.100}', checkedColor: '#02070a' },
                },
            },
        },
        // As tabelas ficam sobre cartões translúcidos: sem fundo próprio, só linhas.
        datatable: {
            header: { background: 'transparent' },
            headerCell: { background: 'transparent' },
            row: { background: 'transparent' },
            footerCell: { background: 'transparent' },
            footer: { background: 'transparent' },
        },
    },
});
