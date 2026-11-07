import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { type RouterStateSnapshot, TitleStrategy } from '@angular/router';

const APP_NAME = 'Finanças';

/** Título da aba do navegador: "Categorias · Finanças". O texto vem do `title` de cada rota. */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
    private readonly title = inject(Title);

    public override updateTitle(snapshot: RouterStateSnapshot): void {
        const pageTitle = this.buildTitle(snapshot);

        this.title.setTitle(pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME);
    }
}
