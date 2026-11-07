import { defineConfig } from 'vitest/config';

/**
 * Configuração extra do Vitest, carregada pelo builder de testes do Angular (`runnerConfig` no
 * angular.json). O resto da configuração dos testes fica no angular.json.
 *
 * Aqui ficam as metas de cobertura por área: o `coverageThresholds` do angular.json aceita apenas
 * números globais. Os arquivos que casam com estes padrões têm metas próprias e ficam fora da meta
 * global, que vale só para "o resto" (layout, gráficos e telas do resumo). As metas ficam um pouco
 * abaixo do que os testes cobrem hoje: se uma mudança derrubar a cobertura de uma área, o `verify`
 * e o CI falham. Ao testar uma área nova, acrescente a meta dela aqui (veja docs/testes.md).
 */
export default defineConfig({
    test: {
        coverage: {
            thresholds: {
                // Contas com dinheiro em centavos: o coração dos cálculos.
                'src/app/shared/money/money.ts': { statements: 95, branches: 95, functions: 95, lines: 95 },
                // Utilitários compartilhados: mês, datas, telefone, formulários, paginação e remoteData.
                'src/app/shared/**': { statements: 85, branches: 80, functions: 65, lines: 85 },
                // Núcleo: cliente HTTP, sessão, erros, logs, mês selecionado, avisos e versões.
                'src/app/core/{api,auth,errors,logging,month,notification,storage,version}/**': {
                    statements: 90,
                    branches: 80,
                    functions: 85,
                    lines: 90,
                },
                // Contrato com o back: cada service chama a rota, o método, a query e o corpo certos.
                'src/app/features/{people,categories,credit-cards,incomes,reserves,manual-expenses,card-expenses,card-imports}/data-access/**':
                    { statements: 95, branches: 95, functions: 95, lines: 95 },
                // Formulários: validação (as mesmas regras do back), o que é enviado e os erros do back nos campos.
                'src/app/features/{people,categories,credit-cards,incomes,manual-expenses,card-expenses}/components/**':
                    {
                        statements: 90,
                        branches: 85,
                        functions: 70,
                        lines: 90,
                    },
                // Envio de fatura: arquivo, revisão, fatura manual e histórico.
                'src/app/features/card-imports/components/**': {
                    statements: 70,
                    branches: 70,
                    functions: 55,
                    lines: 70,
                },
                // Telas de login, cadastros, entradas e despesas.
                'src/app/features/{auth,people,categories,credit-cards,incomes,manual-expenses}/pages/**': {
                    statements: 80,
                    branches: 80,
                    functions: 70,
                    lines: 80,
                },
                // Contas do resumo feitas no front. Saem quando o back entregar os valores prontos
                // (front "burro", veja docs/arquitetura.md); aí esta meta sai junto.
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
