import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';

import { FieldErrorComponent } from './field-error.component';

describe('FieldErrorComponent', () => {
    function render(control: FormControl, messages?: Record<string, string>): () => string {
        const fixture = TestBed.createComponent(FieldErrorComponent);
        fixture.componentRef.setInput('control', control);

        if (messages) {
            fixture.componentRef.setInput('messages', messages);
        }

        return () => {
            fixture.detectChanges();
            return (fixture.nativeElement as HTMLElement).textContent?.trim() ?? '';
        };
    }

    it('não mostra erro antes de o usuário mexer no campo', () => {
        const text = render(new FormControl('', Validators.required));

        expect(text()).toBe('');
    });

    it('mostra a mensagem padrão em português depois que o campo foi tocado', () => {
        const control = new FormControl('', Validators.required);
        const text = render(control);

        control.markAsTouched();

        expect(text()).toBe('Campo obrigatório');
    });

    it('usa o limite do validador na mensagem e some quando o erro é corrigido', () => {
        const control = new FormControl('abcdef', Validators.maxLength(3));
        const text = render(control);

        control.markAsDirty();
        expect(text()).toBe('Use no máximo 3 caracteres');

        control.setValue('abc');
        expect(text()).toBe('');
    });

    it('prefere a mensagem própria passada pela tela', () => {
        const control = new FormControl('x', Validators.pattern(/^\+\d+$/));
        const text = render(control, { pattern: 'Use o formato +5511999999999' });

        control.markAsTouched();

        expect(text()).toBe('Use o formato +5511999999999');
    });

    it('mostra o erro devolvido pelo back (chave server) como veio', () => {
        const control = new FormControl('Mercado');
        const text = render(control);

        control.setErrors({ server: 'Já existe uma categoria com esse nome' });
        control.markAsTouched();

        expect(text()).toBe('Já existe uma categoria com esse nome');
    });

    it('cai numa mensagem genérica para erros sem texto conhecido', () => {
        const control = new FormControl('x');
        const text = render(control);

        control.setErrors({ desconhecido: true });
        control.markAsTouched();

        expect(text()).toBe('Valor inválido');
    });
});
