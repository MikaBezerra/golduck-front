import { routes } from '../../app.routes';
import { SUMMARY_ROUTES } from '../../features/summary/summary.routes';
import { NAV_GROUPS, SUMMARY_ITEM } from './navigation';

/** Caminhos de primeiro nível dentro do layout (ex.: "despesas"). */
function shellPaths(): string[] {
    const shell = routes.find((route) => route.path === '' && route.children);

    return (shell?.children ?? []).map((route) => route.path ?? '');
}

describe('menu de navegação', () => {
    it('todo item do menu aponta para uma rota que existe', () => {
        const paths = shellPaths();

        for (const item of NAV_GROUPS.flatMap((group) => group.items)) {
            expect(paths, `rota de "${item.label}"`).toContain(item.route.replace(/^\//, ''));
        }
    });

    it('o Resumo aponta para uma rota da feature de resumo', () => {
        const summaryPaths = SUMMARY_ROUTES.map((route) => route.path);

        expect(summaryPaths).toContain(SUMMARY_ITEM.route.replace(/^\//, ''));
    });

    it('não repete rotas nem rótulos no menu', () => {
        const items = [SUMMARY_ITEM, ...NAV_GROUPS.flatMap((group) => group.items)];

        expect(new Set(items.map((item) => item.route)).size).toBe(items.length);
        expect(new Set(items.map((item) => item.label)).size).toBe(items.length);
    });
});
