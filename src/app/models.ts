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
