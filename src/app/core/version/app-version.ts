// Só a chave "version": o build inclui apenas esse campo do package.json no bundle.
import { version } from '../../../../package.json';

/**
 * Versão do front, a mesma do package.json. O release-please atualiza o package.json a cada
 * release, então esta constante acompanha a tag vX.Y.Z sem trabalho manual.
 */
export const APP_VERSION: string = version;
