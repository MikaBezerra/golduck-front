import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AppComponent } from './app.component';

describe('AppComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AppComponent],
            providers: [provideRouter([]), MessageService, ConfirmationService],
        }).compileComponents();
    });

    it('cria a aplicação', () => {
        const fixture = TestBed.createComponent(AppComponent);

        expect(fixture.componentInstance).toBeTruthy();
    });
});
