export type Lang = 'espanol' | 'ingles';
export type Direction = 'de-tr' | 'tr-de';
export type DirectionMode = Direction | 'mix';
export type Estado = 'recomendado' | 'todas' | 'nuevas' | 'dificiles';
export type Theme = 'auto' | 'claro' | 'oscuro';

export interface Card {
  id: number;
  aleman: string;
  formas: string | null;
  ingles: string;
  espanol: string;
  tipo: string;
  categoria: string | null;
  fuente: string;
  modulo: number | null;
  pagina: number | null;
  seccion: string | null;
  nota: string | null;
  revisar: boolean;
}

/** Estado de repaso de una tarjeta (sistema de cajas Leitner). */
export interface Progress {
  box: number; // 1..5 (0 = nunca vista, no se guarda)
  due: number; // timestamp: cuándo toca repasarla
  seen: number;
  ok: number;
  ko: number;
  last: number;
}

export interface AktivPassivRow {
  id: number;
  nota?: string | null;
  modo: string | null;
  tiempo: string | null;
  tipo_verbo: string | null;
  voz: string | null;
  estructura: string | null;
  ejemplo_aleman: string | null;
  ejemplo_espanol: string | null;
}

export interface DeclRow {
  id: number;
  genero?: string | null;
  nominativ: string | null;
  akkusativ: string | null;
  genitiv: string | null;
  dativ: string | null;
  nota: string | null;
}

export interface Settings {
  lang: Lang;
  direction: DirectionMode;
  estado: Estado;
  tipos: string[]; // vacío = todos
  fuente: string; // 'todas' o nombre de la fuente
  sessionSize: number;
  autoSpeak: boolean;
  includeReview: boolean;
  theme: Theme;
}

export interface SessionItem {
  card: Card;
  dir: Direction;
  retry: boolean;
}

/** Fila de la hoja «Verbos»: formas principales de un verbo. Lo que está vacío se calcula con las reglas regulares. */
export interface Verb {
  id: number;
  infinitivo: string; // sin «sich»
  reflexivo: 'akk' | 'dat' | null;
  prefijo: string | null; // solo verbos separables
  presente_ich: string | null;
  presente_du: string | null;
  presente_er: string | null;
  presente_ihr: string | null;
  preterito: string | null; // forma «ich»
  konj2: string | null; // forma «ich»
  participio2: string | null; // completo, con prefijo
  auxiliar: 'haben' | 'sein' | null;
  imperativo_du: string | null;
  tipo: string; // regular, irregular, mixto, modal, auxiliar
  espanol: string | null;
  ingles: string | null;
  nota: string | null;
  vocab_ids: string | null;
  origen: string | null;
  revisar: boolean;
}

/* ---------- Referencia de gramática ---------- */
/** Qué columnas se piden al practicar una tabla: se muestra la columna `from` y se pregunta cada una de las de `to`. */
export interface DrillSpec {
  from?: number;
  to?: number[];
}
export type Block =
  | { t: 'p'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'table'; title?: string; head: string[]; rows: string[][]; drill?: DrillSpec | true; genus?: boolean; art?: 'der' | 'die' | 'das' }
  | { t: 'ex'; items: { de: string; es: string }[] }
  | { t: 'note'; text: string }
  | { t: 'warn'; text: string };
export interface Topic {
  id: string;
  grupo: string;
  titulo: string;
  resumen: string;
  blocks: Block[];
}
