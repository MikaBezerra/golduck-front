import { computed, inject, type Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, combineLatest, map, type Observable, of, switchMap, tap } from 'rxjs';

import { NotificationService } from '../../core/notification/notification.service';

export interface RemoteData<T> {
    /** Último resultado carregado. */
    readonly value: Signal<T>;
    readonly loading: Signal<boolean>;
    /** Busca de novo com os mesmos parâmetros (ex.: depois de salvar algo). */
    reload(): void;
}

export interface RemoteDataOptions<P, T> {
    /** Parâmetros da busca. Lidos de signals: quando mudam, a busca é refeita. */
    readonly params: () => P;
    readonly load: (params: P) => Observable<T>;
    readonly initialValue: T;
}

/**
 * Carrega dados da API e recarrega sozinho quando os parâmetros mudam.
 * Se o usuário trocar de mês rápido, a resposta antiga é descartada (`switchMap`),
 * então a tela nunca mostra dados de um mês que já não está selecionado.
 *
 * Precisa ser criado no corpo da classe do componente (contexto de injeção).
 * Faz o papel do `rxResource` do Angular, que ainda é experimental na v21.
 */
export function remoteData<P, T>(options: RemoteDataOptions<P, T>): RemoteData<T> {
    const notifications = inject(NotificationService);
    const value = signal(options.initialValue);
    const loading = signal(true);
    const reload$ = new BehaviorSubject<void>(undefined);

    combineLatest([toObservable(computed(options.params)), reload$])
        .pipe(
            tap(() => loading.set(true)),
            switchMap(([params]) =>
                options.load(params).pipe(
                    map((result) => ({ ok: true as const, result })),
                    catchError((error: unknown) => of({ ok: false as const, error })),
                ),
            ),
            takeUntilDestroyed(),
        )
        .subscribe((outcome) => {
            loading.set(false);

            if (outcome.ok) {
                value.set(outcome.result);
            } else {
                notifications.error(outcome.error);
            }
        });

    return {
        value: value.asReadonly(),
        loading: loading.asReadonly(),
        reload: () => reload$.next(),
    };
}
