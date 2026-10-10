import type { Card, Lang } from '../models';

export const TIPO_LABEL: Record<string, string> = {
  sustantivo: 'Sustantivos',
  verbo: 'Verbos',
  adjetivo: 'Adjetivos',
  adverbio: 'Adverbios',
  pronombre: 'Pronombres',
  preposicion: 'Preposiciones',
  conjuncion: 'Conjunciones',
  frase: 'Frases',
  expresion: 'Expresiones',
};

export const TIPO_SING: Record<string, string> = {
  sustantivo: 'sustantivo',
  verbo: 'verbo',
  adjetivo: 'adjetivo',
  adverbio: 'adverbio',
  pronombre: 'pronombre',
  preposicion: 'preposición',
  conjuncion: 'conjunción',
  frase: 'frase',
  expresion: 'expresión',
};

export type Verdict = 'ok' | 'typo' | 'article' | 'ko';
export const isCorrect = (v: Verdict): boolean => v === 'ok' || v === 'typo';

const ART_RE = /^(der|die|das|des|dem|den)\s+(.+)$/i;

export function splitArticle(text: string): { article: string | null; rest: string } {
  const m = ART_RE.exec(text.trim());
  return m ? { article: m[1], rest: m[2] } : { article: null, rest: text.trim() };
}

export function genusOf(article: string | null): 'der' | 'die' | 'das' | 'x' {
  const a = article?.toLowerCase();
  if (a === 'der' || a === 'den') return 'der';
  if (a === 'die') return 'die';
  if (a === 'das') return 'das';
  return 'x';
}

/** Texto alemán comparable: minúsculas, ä→ae, ö→oe, ü→ue, ß→ss, sin puntuación. */
export function foldGerman(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[….,;:!?¿¡"“”„'’()[\]/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Texto en inglés/español comparable: sin tildes ni puntuación ni artículo inicial. */
export function foldTr(s: string, lang: Lang): string {
  const t = s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[….,;:!?¿¡"“”„'’()[\]/\-–]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return lang === 'ingles'
    ? t.replace(/^(to|the|a|an) /, '')
    : t.replace(/^(el|la|los|las|un|una|unos|unas) /, '');
}

/** Para buscar sin importar mayúsculas ni tildes. */
export function searchFold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

const tolerance = (candidate: string): number => (candidate.length >= 10 ? 2 : candidate.length >= 5 ? 1 : 0);

function withinTypo(input: string, candidates: string[]): boolean {
  return candidates.some((c) => levenshtein(input, c) <= tolerance(c));
}

/** Variantes aceptables de una respuesta alemana (p. ej. «der/das Sakko»). */
export function germanCandidates(target: string): string[] {
  const noParen = target.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const list = [target, noParen];
  const m = /^(der|die|das)\/(der|die|das)\s+(.+)$/i.exec(noParen);
  if (m) list.push(`${m[1]} ${m[3]}`, `${m[2]} ${m[3]}`);
  return [...new Set(list.map(foldGerman).filter(Boolean))];
}

/**
 * Evalúa una respuesta escrita en alemán.
 * `useArticle`: si es true y la respuesta correcta lleva artículo, se avisa cuando falta o es incorrecto.
 */
export function judgeGerman(input: string, target: string, useArticle = true): Verdict {
  const i = foldGerman(input);
  if (!i) return 'ko';
  const cands = germanCandidates(target);
  if (cands.includes(i)) return 'ok';

  if (useArticle) {
    const t = splitArticle(target);
    if (t.article) {
      const stem = foldGerman(t.rest);
      if (i === stem) return 'article';
      const u = splitArticle(input);
      if (u.article && foldGerman(u.rest) === stem) return 'article';
    }
  }
  return withinTypo(i, cands) ? 'typo' : 'ko';
}

export function translationCandidates(text: string, lang: Lang): string[] {
  const noParen = text.replace(/\([^)]*\)/g, ' ');
  const parts = noParen.split(/[/;,]/);
  const list = [noParen, text, ...parts].map((p) => foldTr(p, lang)).filter(Boolean);
  return [...new Set(list)];
}

export function judgeTranslation(input: string, text: string, lang: Lang): Verdict {
  const i = foldTr(input, lang);
  if (!i) return 'ko';
  const cands = translationCandidates(text, lang);
  if (cands.includes(i)) return 'ok';
  return withinTypo(i, cands) ? 'typo' : 'ko';
}

/** Muestra las primeras `shown` letras y oculta el resto: «die S_____». */
export function maskAnswer(answer: string, shown: number): string {
  let count = 0;
  return [...answer]
    .map((ch) => {
      if (/[\p{L}\p{N}]/u.test(ch)) {
        count++;
        return count <= shown ? ch : '_';
      }
      return ch;
    })
    .join('');
}

export function lettersIn(answer: string): number {
  return [...answer].filter((ch) => /[\p{L}\p{N}]/u.test(ch)).length;
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function translationOf(card: Card, lang: Lang): string {
  return card[lang];
}

export const LANG_NAME: Record<Lang, string> = {
  espanol: 'Español',
  ingles: 'Inglés',
};

/** Primera opción de una traducción con alternativas («a/b; c» → «a»). */
export function firstAlternative(text: string): string {
  return text.replace(/\([^)]*\)/g, ' ').split(/[/;,]/)[0].replace(/\s+/g, ' ').trim();
}

/** Permite que el navegador parta el texto después de una barra («Tauro/El Toro»). */
export function breakable(text: string): string {
  return text.replace(/\//g, '/\u200b');
}

/** Tamaño de letra según la longitud del texto: l (corto), m, s (largo). */
export function sizeFor(text: string): 'l' | 'm' | 's' {
  return text.length > 24 ? 's' : text.length > 12 ? 'm' : 'l';
}
