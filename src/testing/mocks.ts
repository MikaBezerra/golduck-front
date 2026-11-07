import type { Mock } from 'vitest';

/*
 * Dublês dos serviços de interface (avisos e confirmações), para os testes conferirem o que a tela
 * mostraria sem abrir toast nem diálogo de verdade.
 */

export interface NotificationsMock {
    readonly success: Mock<(message: string) => void>;
    readonly info: Mock<(message: string) => void>;
    readonly error: Mock<(error: unknown) => void>;
    readonly unexpected: Mock<(code: string) => void>;
}

export function notificationsMock(): NotificationsMock {
    return { success: vi.fn(), info: vi.fn(), error: vi.fn(), unexpected: vi.fn() };
}

export interface ConfirmMock {
    readonly danger: Mock<(options: unknown) => Promise<boolean>>;
}

/** Confirmação que responde sempre `answer` (sim, por padrão). */
export function confirmMock(answer = true): ConfirmMock {
    return { danger: vi.fn(async () => answer) };
}
