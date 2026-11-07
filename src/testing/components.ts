import type { EnvironmentProviders, Provider, Type } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';

import { ApiError } from '../app/core/api/api-error';
import type { ApiErrorDetail } from '../app/core/api/api.types';

/*
 * Auxiliares para testar componentes (páginas e diálogos) com os services trocados por dublês:
 * abrir com os inputs da tela, mexer no formulário e conferir o que seria enviado ao back.
 * Os membros `protected` do componente (form, save...) são acessados por um tipo de teste
 * (`internals`), sem mudar o componente.
 */

type Providers = (Provider | EnvironmentProviders)[];

/** Cria o componente com os inputs informados e roda a primeira detecção de mudanças (ngOnInit). */
export function renderComponent<T>(
    component: Type<T>,
    inputs: Record<string, unknown>,
    providers: Providers,
): ComponentFixture<T> {
    // Permite criar mais de uma vez no mesmo teste (ex.: cadastrar e depois editar).
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [component], providers });

    const fixture = TestBed.createComponent(component);

    for (const [name, value] of Object.entries(inputs)) {
        fixture.componentRef.setInput(name, value);
    }

    fixture.detectChanges();

    return fixture;
}

/** Abre o diálogo (`visible = true`) com os inputs informados, como a tela faria. */
export function openDialog<T>(
    component: Type<T>,
    inputs: Record<string, unknown>,
    providers: Providers,
): ComponentFixture<T> {
    return renderComponent(component, { ...inputs, visible: true }, providers);
}

/** Acesso de teste aos membros internos (protected) do componente. */
export function internals<T>(fixture: ComponentFixture<unknown>): T {
    return fixture.componentInstance as T;
}

/** Erro como o `ApiService` entregaria, para simular respostas de erro do back. */
export function apiError(status: number, code: string, message: string, details: ApiErrorDetail[] = []) {
    return throwError(() => new ApiError(status, code, message, 'req-teste', details));
}
