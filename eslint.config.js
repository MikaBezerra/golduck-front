// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
    {
        // Gerado por `npm run api:types` a partir do OpenAPI do back.
        ignores: ['src/app/core/api/api-schema.d.ts'],
    },
    {
        files: ['**/*.ts'],
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended,
            tseslint.configs.stylistic,
            angular.configs.tsRecommended,
        ],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    prefix: 'app',
                    style: 'kebab-case',
                },
            ],
            // Mesmas convenções do back-end (configuração do ESLint do back)
            '@typescript-eslint/explicit-member-accessibility': [
                'error',
                { accessibility: 'explicit', overrides: { constructors: 'off' } },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-non-null-assertion': 'error',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'multi-line'],
            'no-console': ['error', { allow: ['error', 'warn'] }],
        },
    },
    {
        files: ['**/*.spec.ts'],
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
    {
        files: ['**/*.html'],
        extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
        rules: {
            '@angular-eslint/template/prefer-control-flow': 'error',
            '@angular-eslint/template/eqeqeq': 'error',
        },
    },
]);
