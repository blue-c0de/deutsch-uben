import type { Block, DrillSpec, Topic } from '../../models';

/** Ayudas para escribir el contenido de la referencia de forma compacta. */
export const p = (text: string): Block => ({ t: 'p', text });
export const ul = (...items: string[]): Block => ({ t: 'list', items });
export const note = (text: string): Block => ({ t: 'note', text });
export const warn = (text: string): Block => ({ t: 'warn', text });
export const ex = (...items: [string, string][]): Block => ({ t: 'ex', items: items.map(([de, es]) => ({ de, es })) });
export const table = (
  title: string,
  head: string[],
  rows: string[][],
  opts: { drill?: DrillSpec | true; genus?: boolean; art?: 'der' | 'die' | 'das' } = {},
): Block => ({ t: 'table', title, head, rows, ...opts });
export const topic = (id: string, grupo: string, titulo: string, resumen: string, blocks: Block[]): Topic => ({
  id,
  grupo,
  titulo,
  resumen,
  blocks,
});

export const G_CASOS = 'Casos y artículos';
export const G_PRON = 'Pronombres y preposiciones';
export const G_ADJ = 'Adjetivos y palabras pequeñas';
export const G_VERBOS = 'Verbos';
export const G_ORACION = 'La oración';
export const G_BASE = 'Fundamentos';
export const GRUPOS = [G_CASOS, G_PRON, G_ADJ, G_VERBOS, G_ORACION, G_BASE];
