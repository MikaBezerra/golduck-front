import { defineConfig } from 'vitest/config';

/**
 * Configuração extra do Vitest, carregada pelo builder de testes do Angular (`runnerConfig` no
 * angular.json). O resto da configuração dos testes fica no angular.json.
 *
 * Só serve para as metas de cobertura por arquivo/pasta: o `coverageThresholds` do angular.json
 * aceita apenas números globais. Os arquivos que casam com estes padrões têm metas próprias
 * (mais altas) e ficam fora da meta global. Suba as metas conforme os testes forem crescendo.
 */
export default defineConfig({
    test: {
        coverage: {
            thresholds: {
                // Contas com dinheiro em centavos: o coração dos cálculos.
                'src/app/shared/money/money.ts': { statements: 95, branches: 95, functions: 95, lines: 95 },
                // Cliente HTTP central (envelope { data } e ApiError).
                'src/app/core/api/**': { statements: 80, branches: 80, functions: 70, lines: 80 },
                // Login, renovação do token e interceptor.
                'src/app/core/auth/**': { statements: 65, branches: 60, functions: 55, lines: 65 },
                // Contas puras do resumo (tabela por pessoa e gráficos).
                'src/app/features/summary/data-access/summary-{statement,view}.ts': {
                    statements: 95,
                    branches: 75,
                    functions: 95,
                    lines: 95,
                },
            },
        },
    },
});
