import type { Topic } from '../../models';
import { CASOS } from './casos';
import { FUNDAMENTOS } from './fundamentos';
import { ORACION } from './oracion';
import { PRONOMBRES } from './pronombres';
import { VERBOS } from './verbos';

export { GRUPOS } from './helpers';

/** Todos los temas de la referencia, en el orden en que se muestran. */
export const TEMAS: Topic[] = [...CASOS, ...PRONOMBRES, ...VERBOS, ...ORACION, ...FUNDAMENTOS];
