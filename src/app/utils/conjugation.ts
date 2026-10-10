import type { Verb } from '../models';

/* ============================================================================================
   Motor de conjugación. Usa las formas guardadas en la hoja «Verbos» y, si una celda está vacía,
   calcula la forma con las reglas de los verbos regulares.
   ============================================================================================ */

export const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'] as const;

/** v: verbo conjugado · a: auxiliar · r: pronombre reflexivo · p: prefijo separable · n: forma no conjugada */
export type Kind = 'v' | 'a' | 'r' | 'p' | 'n';
export interface Part {
  t: string;
  k: Kind;
}
export interface Line {
  pron: string;
  label?: string; // en el imperativo: du, ihr, Sie, wir
  parts: Part[];
  text: string; // lo que sigue al pronombre
}
export interface Tense {
  id: string;
  titulo: string;
  formacion: string;
  uso: string;
  lines: Line[];
}
export interface Group {
  id: string;
  titulo: string;
  tenses: Tense[];
}
export interface Conjugation {
  groups: Group[];
  forms: { label: string; text: string }[];
}

const REFL_AKK = ['mich', 'dich', 'sich', 'uns', 'euch', 'sich'];
const REFL_DAT = ['mir', 'dir', 'sich', 'uns', 'euch', 'sich'];

const INSEP_PREFIXES = ['be', 'emp', 'ent', 'er', 'ge', 'miss', 'ver', 'zer', 'über', 'unter', 'hinter', 'wider', 'voll'];
const WEAK_GE = new Set(['beten', 'bellen', 'ernten', 'erben', 'bessern']);

/* ---------- reglas de los verbos regulares ---------- */
export function stemOf(inf: string): string {
  if (inf.endsWith('eln') || inf.endsWith('ern')) return inf.slice(0, -1);
  if (inf.endsWith('en')) return inf.slice(0, -2);
  return inf.slice(0, -1);
}

export function needsE(st: string): boolean {
  if (/[dt]$/.test(st)) return true;
  return /(?:[^aeiouäöüylrh]|ch)[mn]$/.test(st) && !/(mm|nn)$/.test(st);
}

function baseInf(v: Verb): string {
  return v.prefijo && v.infinitivo.startsWith(v.prefijo) ? v.infinitivo.slice(v.prefijo.length) : v.infinitivo;
}

function regularPresent(inf: string): { ich: string; du: string; er: string; ihr: string } {
  const st = stemOf(inf);
  if (inf.endsWith('eln')) return { ich: inf.slice(0, -3) + 'le', du: st + 'st', er: st + 't', ihr: st + 't' };
  if (inf.endsWith('ern')) return { ich: st + 'e', du: st + 'st', er: st + 't', ihr: st + 't' };
  if (needsE(st)) return { ich: st + 'e', du: st + 'est', er: st + 'et', ihr: st + 'et' };
  if (/[sßxz]$/.test(st)) return { ich: st + 'e', du: st + 't', er: st + 't', ihr: st + 't' };
  return { ich: st + 'e', du: st + 'st', er: st + 't', ihr: st + 't' };
}

function regularPreterite(inf: string): string {
  const st = stemOf(inf);
  if (inf.endsWith('eln') || inf.endsWith('ern')) return st + 'te';
  return st + (needsE(st) ? 'ete' : 'te');
}

function inseparableWeak(inf: string): boolean {
  if (WEAK_GE.has(inf)) return false;
  if (inf.endsWith('ieren') || inf === 'wiederholen') return true;
  return INSEP_PREFIXES.some((p) => inf.startsWith(p));
}

function regularParticiple(v: Verb): string {
  const inf = baseInf(v);
  const st = stemOf(inf);
  const core = inf.endsWith('eln') || inf.endsWith('ern') ? st + 't' : st + (needsE(st) ? 'et' : 't');
  const base = inseparableWeak(inf) ? core : 'ge' + core;
  return (v.prefijo ?? '') + base;
}

function regularImperative(inf: string): string {
  const st = stemOf(inf);
  if (inf.endsWith('eln')) return inf.slice(0, -3) + 'le';
  if (inf.endsWith('ern')) return st + 'e';
  return needsE(st) || st.endsWith('ig') ? st + 'e' : st;
}

/* ---------- formas simples (sin prefijo ni reflexivo) ---------- */
export function presentForms(v: Verb): string[] {
  const inf = baseInf(v);
  const reg = regularPresent(inf);
  const wirSie = v.infinitivo === 'sein' ? 'sind' : inf;
  return [v.presente_ich ?? reg.ich, v.presente_du ?? reg.du, v.presente_er ?? reg.er, wirSie, v.presente_ihr ?? reg.ihr, wirSie];
}

function endingsPast(base: string): string[] {
  if (base.endsWith('e')) return [base, base + 'st', base, base + 'n', base + 't', base + 'n'];
  const du = /[sßxz]$/.test(base) ? base + 't' : /[dt]$/.test(base) ? base + 'est' : base + 'st';
  const ihr = /[dt]$/.test(base) ? base + 'et' : base + 't';
  return [base, du, base, base + 'en', ihr, base + 'en'];
}

export function preteriteForms(v: Verb): string[] {
  return endingsPast(v.preterito ?? regularPreterite(baseInf(v)));
}

export function konj2Forms(v: Verb): string[] {
  const base = v.konj2 ?? v.preterito ?? regularPreterite(baseInf(v));
  const f = endingsPast(base);
  if (v.infinitivo === 'sein') f[1] = 'wärst', (f[4] = 'wärt');
  return f;
}

export function konj1Forms(v: Verb): string[] {
  const inf = baseInf(v);
  if (v.infinitivo === 'sein') return ['sei', 'seist', 'sei', 'seien', 'seiet', 'seien'];
  const st = v.infinitivo === 'tun' ? 'tu' : stemOf(inf);
  if (inf.endsWith('eln')) return [inf.slice(0, -3) + 'le', st + 'st', inf.slice(0, -3) + 'le', inf, st + 't', inf];
  if (inf.endsWith('ern')) return [st + 'e', st + 'st', st + 'e', inf, st + 't', inf];
  return [st + 'e', st + 'est', st + 'e', inf, st + 'et', inf];
}

export function participle2(v: Verb): string {
  return v.participio2 ?? regularParticiple(v);
}
export function auxiliary(v: Verb): 'haben' | 'sein' {
  return v.auxiliar ?? 'haben';
}
export function imperativeDu(v: Verb): string | null {
  if (v.tipo === 'modal') return null;
  return v.imperativo_du ?? regularImperative(baseInf(v));
}
export function verbLabel(v: Verb): string {
  return (v.reflexivo ? 'sich ' : '') + v.infinitivo;
}
export function zuInfinitive(v: Verb): string {
  const zu = v.prefijo ? v.prefijo + 'zu' + baseInf(v) : 'zu ' + v.infinitivo;
  return (v.reflexivo ? 'sich ' : '') + zu;
}
export function participle1(v: Verb): string {
  if (v.infinitivo === 'sein') return 'seiend';
  if (v.infinitivo === 'tun') return 'tuend';
  return v.infinitivo + 'd';
}

/* ---------- auxiliares ---------- */
const HABEN_PRES = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'];
const SEIN_PRES = ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'];
const WERDEN_PRES = ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'];
const HABEN_PAST = ['hatte', 'hattest', 'hatte', 'hatten', 'hattet', 'hatten'];
const SEIN_PAST = ['war', 'warst', 'war', 'waren', 'wart', 'waren'];
const WURDE = ['wurde', 'wurdest', 'wurde', 'wurden', 'wurdet', 'wurden'];
const WUERDE = ['würde', 'würdest', 'würde', 'würden', 'würdet', 'würden'];
const HAETTE = ['hätte', 'hättest', 'hätte', 'hätten', 'hättet', 'hätten'];
const WAERE = ['wäre', 'wärst', 'wäre', 'wären', 'wärt', 'wären'];
const HABEN_K1 = ['habe', 'habest', 'habe', 'haben', 'habet', 'haben'];
const SEIN_K1 = ['sei', 'seist', 'sei', 'seien', 'seiet', 'seien'];

/* ---------- construcción de líneas ---------- */
function reflexive(v: Verb, i: number): Part[] {
  if (!v.reflexivo) return [];
  return [{ t: (v.reflexivo === 'dat' ? REFL_DAT : REFL_AKK)[i], k: 'r' }];
}
function mk(pron: string, parts: Part[], label?: string): Line {
  return { pron, label, parts, text: parts.map((p) => p.t).join(' ') };
}
/** Forma conjugada simple: verbo + reflexivo + prefijo al final (ich komme an). */
function simple(v: Verb, forms: string[]): Line[] {
  return PERSONS.map((pr, i) =>
    mk(pr, [{ t: forms[i], k: 'v' }, ...reflexive(v, i), ...(v.prefijo ? [{ t: v.prefijo, k: 'p' as Kind }] : [])]),
  );
}
/** Auxiliar + (reflexivo) + forma(s) no conjugada(s). */
function compound(v: Verb, aux: string[], tail: string[]): Line[] {
  return PERSONS.map((pr, i) =>
    mk(pr, [{ t: aux[i], k: 'a' }, ...reflexive(v, i), ...tail.map((t) => ({ t, k: 'n' as Kind }))]),
  );
}

const META: Record<string, { titulo: string; formacion: string; uso: string }> = {
  presente: { titulo: 'Präsens', formacion: 'raíz + terminaciones (-e, -st, -t, -en, -t, -en)', uso: 'Lo que pasa ahora, hábitos y futuro cercano con una expresión de tiempo.' },
  preterito: { titulo: 'Präteritum', formacion: 'raíz + -te (débiles) o cambio de vocal (fuertes)', uso: 'Narración escrita y noticias; en el habla, sobre todo sein, haben y los modales.' },
  perfekt: { titulo: 'Perfekt', formacion: 'haben/sein (Präsens) + Partizip II', uso: 'Pasado en el habla y en mensajes: lo que ya ha ocurrido.' },
  plusquamperfekt: { titulo: 'Plusquamperfekt', formacion: 'hatte/war + Partizip II', uso: 'Un pasado anterior a otro pasado.' },
  futur1: { titulo: 'Futur I', formacion: 'werden (Präsens) + Infinitiv', uso: 'Planes, promesas y suposiciones sobre el presente.' },
  futur2: { titulo: 'Futur II', formacion: 'werden + Partizip II + haben/sein', uso: 'Acción terminada en el futuro y suposiciones sobre el pasado.' },
  konj1: { titulo: 'Konjunktiv I (Präsens)', formacion: 'raíz + -e, -est, -e, -en, -et, -en', uso: 'Estilo indirecto (noticias, textos formales); sobre todo la 3.ª persona.' },
  konj1perf: { titulo: 'Konjunktiv I (Perfekt)', formacion: 'habe/sei + Partizip II', uso: 'Estilo indirecto de algo ocurrido antes.' },
  konj2: { titulo: 'Konjunktiv II (Präteritum)', formacion: 'Präteritum con vocal modificada + -e', uso: 'Deseos irreales, cortesía y condiciones irreales (poco usado con verbos fuertes largos).' },
  konj2wuerde: { titulo: 'Konjunktiv II (würde + Infinitiv)', formacion: 'würde + Infinitiv', uso: 'Sustituye al Konjunktiv II sintético en la mayoría de los verbos.' },
  konj2perf: { titulo: 'Konjunktiv II (Plusquamperfekt)', formacion: 'hätte/wäre + Partizip II', uso: 'Irreal del pasado: lo que habría pasado.' },
  imperativ: { titulo: 'Imperativ', formacion: 'du: raíz · ihr: raíz + -t · Sie y wir: Infinitiv + pronombre', uso: 'Órdenes, instrucciones y peticiones.' },
  passivPres: { titulo: 'Passiv Präsens', formacion: 'werden (Präsens) + Partizip II', uso: 'El sujeto recibe la acción (solo verbos transitivos).' },
  passivPret: { titulo: 'Passiv Präteritum', formacion: 'wurde + Partizip II', uso: 'Pasivo en la narración escrita.' },
  passivPerf: { titulo: 'Passiv Perfekt', formacion: 'sein (Präsens) + Partizip II + worden', uso: 'Pasivo en el pasado hablado.' },
  passivPlus: { titulo: 'Passiv Plusquamperfekt', formacion: 'war + Partizip II + worden', uso: 'Pasivo de un pasado anterior.' },
  passivFut: { titulo: 'Passiv Futur I', formacion: 'werden + Partizip II + werden', uso: 'Pasivo de futuro.' },
};

export const FORM_IDS = ['presente', 'preterito', 'perfekt', 'plusquamperfekt', 'futur1', 'futur2', 'konj2', 'imperativ', 'partizip2'] as const;
export type FormId = (typeof FORM_IDS)[number];
export const FORM_LABEL: Record<FormId, string> = {
  presente: 'Präsens',
  preterito: 'Präteritum',
  perfekt: 'Perfekt',
  plusquamperfekt: 'Plusquamperfekt',
  futur1: 'Futur I',
  futur2: 'Futur II',
  konj2: 'Konjunktiv II',
  imperativ: 'Imperativ',
  partizip2: 'Partizip II',
};

function imperativeLines(v: Verb): Line[] {
  const du = imperativeDu(v);
  if (!du) return [];
  const ihr = presentForms(v)[4];
  const inf = baseInf(v);
  const pre: Part[] = v.prefijo ? [{ t: v.prefijo, k: 'p' }] : [];
  const refl = (i: number) => reflexive(v, i);
  const plural = v.infinitivo === 'sein' ? 'seien' : inf;
  // Mayúscula inicial y signo de exclamación: «Kommen Sie an!»
  const fin = (parts: Part[]): Part[] => {
    const p = parts.map((x) => ({ ...x }));
    p[0].t = p[0].t.charAt(0).toUpperCase() + p[0].t.slice(1);
    p[p.length - 1].t += '!';
    return p;
  };
  return [
    mk('', fin([{ t: du, k: 'v' }, ...refl(1), ...pre]), 'du'),
    mk('', fin([{ t: ihr, k: 'v' }, ...refl(4), ...pre]), 'ihr'),
    mk('', fin([{ t: plural, k: 'v' }, { t: 'Sie', k: 'n' }, ...refl(5), ...pre]), 'Sie'),
    mk('', fin([{ t: plural, k: 'v' }, { t: 'wir', k: 'n' }, ...refl(3), ...pre]), 'wir'),
  ];
}

/** Líneas de una forma concreta (se usa también en los ejercicios). */
export function formLines(v: Verb, id: FormId): Line[] {
  const aux = auxiliary(v);
  const p2 = participle2(v);
  const inf = v.infinitivo;
  switch (id) {
    case 'presente':
      return simple(v, presentForms(v));
    case 'preterito':
      return simple(v, preteriteForms(v));
    case 'perfekt':
      return compound(v, aux === 'sein' ? SEIN_PRES : HABEN_PRES, [p2]);
    case 'plusquamperfekt':
      return compound(v, aux === 'sein' ? SEIN_PAST : HABEN_PAST, [p2]);
    case 'futur1':
      return compound(v, WERDEN_PRES, [inf]);
    case 'futur2':
      return compound(v, WERDEN_PRES, [p2, aux]);
    case 'konj2':
      return simple(v, konj2Forms(v));
    case 'imperativ':
      return imperativeLines(v);
    case 'partizip2':
      return [mk('', [{ t: p2, k: 'n' }])];
  }
}

function tense(v: Verb, key: keyof typeof META, lines: Line[]): Tense {
  return { id: key, ...META[key], lines };
}

export function canPassive(v: Verb): boolean {
  return !v.reflexivo && v.tipo !== 'modal' && v.tipo !== 'auxiliar';
}

export function conjugate(v: Verb): Conjugation {
  const aux = auxiliary(v);
  const p2 = participle2(v);
  const groups: Group[] = [
    {
      id: 'indikativ',
      titulo: 'Indikativ',
      tenses: [
        tense(v, 'presente', formLines(v, 'presente')),
        tense(v, 'preterito', formLines(v, 'preterito')),
        tense(v, 'perfekt', formLines(v, 'perfekt')),
        tense(v, 'plusquamperfekt', formLines(v, 'plusquamperfekt')),
        tense(v, 'futur1', formLines(v, 'futur1')),
        tense(v, 'futur2', formLines(v, 'futur2')),
      ],
    },
    {
      id: 'konjunktiv',
      titulo: 'Konjunktiv',
      tenses: [
        tense(v, 'konj1', simple(v, konj1Forms(v))),
        tense(v, 'konj1perf', compound(v, aux === 'sein' ? SEIN_K1 : HABEN_K1, [p2])),
        tense(v, 'konj2', formLines(v, 'konj2')),
        tense(v, 'konj2wuerde', compound(v, WUERDE, [v.infinitivo])),
        tense(v, 'konj2perf', compound(v, aux === 'sein' ? WAERE : HAETTE, [p2])),
      ],
    },
  ];
  const imp = imperativeLines(v);
  if (imp.length) groups.push({ id: 'imperativ', titulo: 'Imperativ', tenses: [tense(v, 'imperativ', imp)] });
  if (canPassive(v)) {
    groups.push({
      id: 'passiv',
      titulo: 'Passiv',
      tenses: [
        tense(v, 'passivPres', compound(v, WERDEN_PRES, [p2])),
        tense(v, 'passivPret', compound(v, WURDE, [p2])),
        tense(v, 'passivPerf', compound(v, SEIN_PRES, [p2, 'worden'])),
        tense(v, 'passivPlus', compound(v, SEIN_PAST, [p2, 'worden'])),
        tense(v, 'passivFut', compound(v, WERDEN_PRES, [p2, 'werden'])),
      ],
    });
  }
  const forms = [
    { label: 'Infinitiv', text: verbLabel(v) },
    { label: 'zu-Infinitiv', text: zuInfinitive(v) },
    { label: 'Partizip I', text: participle1(v) },
    { label: 'Partizip II', text: p2 },
    { label: 'Perfekt-Infinitiv', text: `${p2} ${aux}` },
    { label: 'Hilfsverb', text: aux },
  ];
  return { groups, forms };
}
