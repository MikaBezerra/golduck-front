/**
 * Ids para ligar o que o usuário vê ao que está no log (do front e do back).
 *
 * - `newId()`: UUID aleatório (o mesmo formato que o back gera para o `x-request-id`).
 * - `supportCode(id)`: os 8 primeiros caracteres, curtos o bastante para o usuário ditar ao suporte.
 *   O log sempre guarda o id completo.
 */
export function newId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Sem crypto.randomUUID (páginas fora de HTTPS em navegadores antigos): 32 dígitos hexadecimais.
    const bytes = new Uint8Array(16);

    crypto.getRandomValues(bytes);

    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function supportCode(id: string): string {
    return id.slice(0, 8);
}
