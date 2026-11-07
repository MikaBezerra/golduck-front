import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { TokenStorageService } from './token-storage.service';

/** Só deixa entrar quem tem sessão; os demais vão para o login e voltam depois. */
export const authGuard: CanActivateFn = (_route, state) => {
    if (inject(TokenStorageService).hasSession()) {
        return true;
    }

    return inject(Router).createUrlTree(['/login'], { queryParams: { redirect: state.url } });
};

/** A tela de login só faz sentido para quem ainda não entrou. */
export const guestGuard: CanActivateFn = () => {
    if (inject(TokenStorageService).hasSession()) {
        return inject(Router).createUrlTree(['/']);
    }

    return true;
};
