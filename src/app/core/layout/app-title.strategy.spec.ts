import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import type { RouterStateSnapshot } from '@angular/router';

import { AppTitleStrategy } from './app-title.strategy';

describe('AppTitleStrategy', () => {
    it('monta "Página · Golduck" com o título da rota e só "Golduck" sem ele', () => {
        const strategy = TestBed.inject(AppTitleStrategy);
        const title = TestBed.inject(Title);
        const buildTitle = vi.spyOn(strategy, 'buildTitle');

        buildTitle.mockReturnValue('Categorias');
        strategy.updateTitle({} as RouterStateSnapshot);
        expect(title.getTitle()).toBe('Categorias · Golduck');

        buildTitle.mockReturnValue(undefined);
        strategy.updateTitle({} as RouterStateSnapshot);
        expect(title.getTitle()).toBe('Golduck');
    });
});
