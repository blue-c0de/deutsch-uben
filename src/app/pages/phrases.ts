import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Card } from '../models';
import { SettingsService } from '../services/settings.service';
import { SpeechService } from '../services/speech.service';
import { StudyService } from '../services/study.service';
import { PracticeSwitch } from '../shared/practice-switch';
import { Verdict, cloze, foldGerman, initialsMask, isCorrect, judgeGerman, judgePhrase, maskAnswer, phraseTokens, shuffle } from '../utils/text';

type Mode = 'hueco' | 'ordenar' | 'memoria' | 'dictado' | 'funcion';
interface Chip {
  id: number;
  t: string;
}
interface Opt {
  text: string;
  sub: string | null;
  correct: boolean;
}

const MODES: { v: Mode; t: string; ayuda: string }[] = [
  { v: 'hueco', t: 'Huecos', ayuda: 'Completa la palabra que falta en la frase.' },
  { v: 'ordenar', t: 'Ordenar', ayuda: 'Pon las palabras en orden para formar la frase.' },
  { v: 'memoria', t: 'De memoria', ayuda: 'Lees la traducción y escribes la frase en alemán.' },
  { v: 'dictado', t: 'Dictado', ayuda: 'Escuchas la frase y la escribes.' },
  { v: 'funcion', t: 'Función', ayuda: 'Relaciona cada frase con lo que sirve para decir.' },
];

/** Palabras de la frase que se pueden ordenar. */
const orderTokens = (p: string): string[] => phraseTokens(p);

@Component({
  selector: 'app-phrases',
  imports: [PracticeSwitch],
  template: `
    <app-practice-switch />
    <div class="stack" style="--gap: 14px">
      <h1>Frases</h1>
      <div class="seg seg-scroll" role="tablist" aria-label="Modo de práctica">
        @for (m of modes(); track m.v) {
          <button type="button" role="tab" [attr.aria-selected]="mode() === m.v" [class.on]="mode() === m.v" (click)="setMode(m.v)">{{ m.t }}</button>
        }
      </div>
      <p class="muted small">{{ help() }}</p>

      <div class="field">
        <label for="fcat">Categoría</label>
        <select id="fcat" class="input" (change)="setCat($event)">
          <option value="todas" [selected]="s().categoria === 'todas'">Todas ({{ totalFrases() }})</option>
          @for (c of study.categoriasFrase(); track c.categoria) {
            <option [value]="c.categoria" [selected]="s().categoria === c.categoria">{{ c.espanol ?? c.categoria }} ({{ c.n }})</option>
          }
        </select>
      </div>

      @if (qs().length === 0) {
        <section class="panel stack">
          <h2>No hay frases para este modo</h2>
          <p>Con la fuente y los filtros actuales no hay frases que se puedan usar aquí. Cambia la categoría o el material en «Juegos».</p>
        </section>
      } @else if (finished()) {
        <section class="panel stack" style="--gap: 14px">
          <h2>Ronda terminada</h2>
          <p class="big">Acertaste <b>{{ score() }}</b> de <b>{{ qs().length }}</b>.</p>
          @if (wrong().length) {
            <div class="stack" style="--gap: 6px">
              <h3>Para repasar</h3>
              <ul class="fails">
                @for (w of wrong(); track w.id) {
                  <li>
                    <span class="de">{{ w.aleman }}</span>
                    <span class="muted">{{ tr(w) }}</span>
                  </li>
                }
              </ul>
            </div>
          }
          <div class="row">
            <button type="button" class="btn btn-primary" (click)="start()">Otra ronda</button>
          </div>
        </section>
      } @else {
        @if (cur(); as c) {
          <div class="row row-between">
            <span class="muted" aria-live="polite">Frase {{ idx() + 1 }} de {{ qs().length }}</span>
            <span class="muted">{{ score() }} bien</span>
          </div>
          <div class="meter" role="progressbar" aria-label="Avance" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100"><i [style.width.%]="pct()"></i></div>

          <article class="kk prompt">
            <div class="meta row">
              @if (mode() !== 'funcion' && c.categoria) {
                <span class="chip">{{ catLabel(c.categoria) }}</span>
              } @else {
                <span class="chip">{{ modeName() }}</span>
              }
            </div>
            <div class="content stack" style="--gap: 8px">
              @switch (mode()) {
                @case ('hueco') {
                  <p class="phrase">{{ masked() }}</p>
                  <p class="muted tr">{{ tr(c) }}</p>
                }
                @case ('ordenar') {
                  <p class="muted">Ordena las palabras para decir:</p>
                  <p class="tr big-tr">{{ tr(c) }}</p>
                }
                @case ('memoria') {
                  <p class="muted">Escribe en alemán:</p>
                  <p class="tr big-tr">{{ tr(c) }}</p>
                }
                @case ('dictado') {
                  <p class="muted">Escucha y escribe lo que oigas:</p>
                  <button type="button" class="btn btn-primary" (click)="speech.speak(c.aleman)">Escuchar la frase</button>
                }
                @case ('funcion') {
                  @if (dir() === 'f2c') {
                    <p class="phrase">{{ c.aleman }}</p>
                    <p class="muted">¿Para qué sirve esta frase?</p>
                  } @else {
                    <p class="phrase">{{ catLabel(c.categoria) }}</p>
                    @if (catDe(c.categoria)) {
                      <p class="muted">{{ catDe(c.categoria) }}</p>
                    }
                    <p class="muted">¿Qué frase usarías?</p>
                  }
                }
              }
            </div>
          </article>

          @if (mode() === 'hueco' || mode() === 'memoria' || mode() === 'dictado') {
            <div class="field">
              <label for="fresp">{{ mode() === 'hueco' ? 'Palabra que falta' : 'Tu respuesta' }}</label>
              <input
                id="fresp"
                class="input resp"
                type="text"
                lang="de"
                [value]="answer()"
                [readOnly]="checked()"
                (input)="onInput($event)"
                (keydown.enter)="enter($event)"
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                spellcheck="false"
                enterkeyhint="done"
              />
            </div>
            @if (!checked()) {
              @if (hintN() > 0) {
                <p class="hint" aria-live="polite">{{ hintText() }}</p>
              }
              <div class="row" role="group" aria-label="Letras alemanas">
                @for (ch of chars; track ch) {
                  <button type="button" class="btn btn-icon" (click)="insert(ch)">{{ ch }}</button>
                }
              </div>
              <div class="row">
                <button type="button" class="btn btn-primary" (click)="check()">Comprobar</button>
                <button type="button" class="btn" (click)="hint()" [disabled]="hintN() >= 3">Pista</button>
                <button type="button" class="btn btn-quiet" (click)="giveUp()">No lo sé</button>
              </div>
            }
          } @else if (mode() === 'ordenar') {
            <div class="built" aria-label="Tu frase" [class.done]="checked()">
              @for (ch of built(); track ch.id) {
                <button type="button" class="tok" [disabled]="checked()" (click)="take(ch)">{{ ch.t }}</button>
              } @empty {
                <span class="muted small">Toca las palabras de abajo para colocarlas aquí.</span>
              }
            </div>
            @if (!checked()) {
              <div class="bank" role="group" aria-label="Palabras disponibles">
                @for (ch of bank(); track ch.id) {
                  <button type="button" class="tok" (click)="put(ch)">{{ ch.t }}</button>
                }
              </div>
              <div class="row">
                <button type="button" class="btn btn-primary" [disabled]="bank().length > 0" (click)="check()">Comprobar</button>
                <button type="button" class="btn" (click)="reshuffle()">Empezar de nuevo</button>
                <button type="button" class="btn btn-quiet" (click)="giveUp()">No lo sé</button>
              </div>
            }
          } @else {
            <div class="opts" role="group" aria-label="Opciones">
              @for (o of options(); track $index; let i = $index) {
                <button
                  type="button"
                  class="opt"
                  [class.is-right]="checked() && o.correct"
                  [class.is-wrong]="checked() && picked() === i && !o.correct"
                  [disabled]="checked()"
                  (click)="choose(i)"
                >
                  <span class="key" aria-hidden="true">{{ i + 1 }}</span>
                  <span class="txt">{{ o.text }}@if (o.sub) {<small class="muted"> {{ o.sub }}</small>}</span>
                  @if (checked() && o.correct) {
                    <span class="sr-only">Respuesta correcta</span>
                    <span class="mark good" aria-hidden="true">✓</span>
                  }
                  @if (checked() && picked() === i && !o.correct) {
                    <span class="sr-only">Tu respuesta, incorrecta</span>
                    <span class="mark bad" aria-hidden="true">✗</span>
                  }
                </button>
              }
            </div>
          }

          @if (checked()) {
            <section class="panel stack" style="--gap: 8px" role="status">
              @if (verdict() === 'ok') {
                <p class="good verdict">¡Correcto!</p>
              } @else if (verdict() === 'typo') {
                <p class="good verdict">Casi perfecto</p>
              } @else {
                <p class="bad verdict">{{ gaveUp() ? 'Esta es la frase' : 'No coincide' }}</p>
              }
              <p class="disp full">{{ c.aleman }}</p>
              <p>{{ tr(c) }}</p>
              @if (c.categoria) {
                <p class="muted small">Sirve para: {{ catLabel(c.categoria) }}</p>
              }
              @if (c.ejemplo) {
                <p class="ej">
                  <b>{{ c.ejemplo }}</b><br />
                  <span class="muted">{{ c.ejemplo_es }}</span>
                </p>
              }
              @if (c.truco) {
                <p class="note">{{ c.truco }}</p>
              }
              <div class="row">
                <button type="button" class="btn btn-primary" (click)="next()">{{ idx() + 1 === qs().length ? 'Ver resultado' : 'Siguiente' }}</button>
                @if (!ok() && !gaveUp() && mode() !== 'funcion') {
                  <button type="button" class="btn" (click)="forgive()">Contar como correcta</button>
                }
                @if (speech.supported) {
                  <button type="button" class="btn btn-quiet" (click)="speech.speak(c.aleman)">Escuchar</button>
                }
              </div>
              @if (forgiven()) {
                <p class="muted small">Contada como correcta.</p>
              }
            </section>
          }
        }
      }
    </div>
  `,
  styles: `
    .big {
      font-size: 1.25rem;
    }
    .fails {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .fails li {
      display: grid;
      gap: 2px;
      padding: 8px 0;
      border-bottom: 1px solid var(--line);
    }
    .fails .de {
      font-weight: 600;
    }
    .prompt {
      min-height: 190px;
      padding: 0 22px 18px;
    }
    .meta {
      min-height: 54px;
      padding-top: 12px;
      align-items: flex-start;
    }
    .content {
      padding-top: 20px;
    }
    .phrase {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: clamp(1.7rem, 7vw, 2.4rem);
      line-height: 1.12;
      overflow-wrap: break-word;
    }
    .big-tr {
      font-size: 1.45rem;
      font-weight: 600;
      color: var(--ink);
      line-height: 1.25;
    }
    .resp {
      font-size: 1.2rem;
    }
    .resp[readonly] {
      background: var(--ink-soft);
    }
    .hint {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: 1.5rem;
      letter-spacing: 0.06em;
      color: var(--ink);
      overflow-wrap: anywhere;
    }
    .built,
    .bank {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px;
      min-height: 64px;
      align-items: center;
      border-radius: var(--radius);
    }
    .built {
      background: var(--card);
      border: 2px solid var(--ink);
    }
    .built.done {
      background: var(--ink-soft);
    }
    .bank {
      border: 2px dashed var(--line);
    }
    .tok {
      font: inherit;
      font-weight: 600;
      font-size: 1.1rem;
      min-height: 44px;
      padding: 0.3em 0.8em;
      color: var(--ink);
      background: var(--card);
      border: 2px solid var(--ink);
      border-radius: 4px;
      cursor: pointer;
    }
    .tok[disabled] {
      cursor: default;
      color: var(--text);
    }
    .opts {
      display: grid;
      gap: 10px;
    }
    .opt {
      font: inherit;
      font-size: 1.08rem;
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 58px;
      padding: 8px 14px 8px 8px;
      text-align: left;
      color: var(--text);
      background: var(--card);
      border: 2px solid var(--ink);
      border-radius: var(--radius);
      cursor: pointer;
    }
    .opt[disabled] {
      cursor: default;
      color: var(--text);
    }
    .opt:not([disabled]):hover {
      background: var(--ink-soft);
    }
    .key {
      flex: none;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      font-weight: 700;
      color: var(--ink);
      border: 1.5px solid var(--ink);
      border-radius: 4px;
    }
    .txt {
      flex: 1;
      min-width: 0;
      overflow-wrap: break-word;
    }
    .mark {
      font-weight: 700;
      font-size: 1.4rem;
    }
    .opt.is-right {
      border-color: var(--ok);
      background: color-mix(in srgb, var(--ok) 14%, var(--card));
    }
    .opt.is-wrong {
      border-color: var(--red);
      background: color-mix(in srgb, var(--red) 12%, var(--card));
      text-decoration: line-through;
      text-decoration-color: var(--red);
    }
    .verdict {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: 1.6rem;
      line-height: 1;
    }
    .full {
      font-size: 1.5rem;
      line-height: 1.2;
    }
    .ej {
      padding-left: 12px;
      border-left: 4px solid var(--ink);
    }
    .note {
      font-style: italic;
      padding: 6px 10px;
      border-left: 4px solid var(--mark);
      background: var(--ink-soft);
    }
  `,
})
export class Phrases {
  protected readonly study = inject(StudyService);
  protected readonly settings = inject(SettingsService);
  protected readonly speech = inject(SpeechService);
  protected readonly s = this.settings.state;
  protected readonly chars = ['ä', 'ö', 'ü', 'ß'];

  protected readonly mode = signal<Mode>('hueco');
  protected readonly qs = signal<Card[]>([]);
  protected readonly idx = signal(0);
  protected readonly checked = signal(false);
  protected readonly ok = signal(false);
  protected readonly gaveUp = signal(false);
  protected readonly forgiven = signal(false);
  protected readonly verdict = signal<Verdict | null>(null);
  protected readonly answer = signal('');
  protected readonly hintN = signal(0);
  protected readonly bank = signal<Chip[]>([]);
  protected readonly built = signal<Chip[]>([]);
  protected readonly options = signal<Opt[]>([]);
  protected readonly picked = signal<number | null>(null);
  protected readonly dir = signal<'f2c' | 'c2f'>('f2c');
  protected readonly score = signal(0);
  protected readonly wrong = signal<Card[]>([]);

  protected readonly modes = computed(() => MODES.filter((m) => m.v !== 'dictado' || this.speech.supported));
  protected readonly help = computed(() => MODES.find((m) => m.v === this.mode())?.ayuda ?? '');
  protected readonly modeName = computed(() => MODES.find((m) => m.v === this.mode())?.t ?? '');
  protected readonly lang = computed(() => this.s().lang);
  protected readonly frases = computed(() => this.study.pool().filter((c) => c.tipo === 'frase'));
  protected readonly totalFrases = computed(() => this.study.categoriasFrase().reduce((n, c) => n + c.n, 0));
  protected readonly cur = computed(() => this.qs()[this.idx()] ?? null);
  protected readonly finished = computed(() => this.qs().length > 0 && this.idx() >= this.qs().length);
  protected readonly pct = computed(() => (this.qs().length ? Math.round((this.idx() / this.qs().length) * 100) : 0));
  protected readonly masked = computed(() => {
    const c = this.cur();
    return c?.clave ? (cloze(c.aleman, c.clave) ?? c.aleman) : (c?.aleman ?? '');
  });
  protected readonly hintText = computed(() => {
    const c = this.cur();
    if (!c) return '';
    return this.mode() === 'hueco' && c.clave ? maskAnswer(c.clave, this.hintN()) : initialsMask(c.aleman, this.hintN());
  });

  constructor() {
    this.start();
  }

  protected tr(c: Card): string {
    return c[this.lang()];
  }
  protected catLabel(cat: string | null): string {
    return cat ? (this.study.catEs(cat) ?? cat) : '';
  }
  protected catDe(cat: string | null): string | null {
    return cat && this.study.catEs(cat) ? cat : null;
  }

  protected setMode(m: Mode): void {
    this.mode.set(m);
    this.start();
  }
  protected setCat(e: Event): void {
    this.settings.patch({ categoria: (e.target as HTMLSelectElement).value });
    this.start();
  }

  private usable(c: Card, m: Mode): boolean {
    switch (m) {
      case 'hueco':
        return !!c.clave && cloze(c.aleman, c.clave) !== null;
      case 'ordenar': {
        const n = orderTokens(c.aleman).length;
        return n >= 3 && n <= 12;
      }
      case 'funcion':
        return !!c.categoria;
      default:
        return true;
    }
  }

  start(): void {
    const m = this.mode();
    const size = Math.min(this.s().sessionSize, 20);
    const base = this.frases().filter((c) => this.usable(c, m));
    this.qs.set(this.study.buildSession(size, this.s().estado, base));
    this.idx.set(0);
    this.score.set(0);
    this.wrong.set([]);
    this.prepare();
  }

  /** Prepara el estado de la pregunta actual. */
  private prepare(): void {
    this.answer.set('');
    this.hintN.set(0);
    this.checked.set(false);
    this.ok.set(false);
    this.gaveUp.set(false);
    this.forgiven.set(false);
    this.verdict.set(null);
    this.picked.set(null);
    const c = this.cur();
    if (!c) return;
    if (this.mode() === 'ordenar') this.reshuffle();
    if (this.mode() === 'funcion') this.buildOptions(c);
    if (this.mode() === 'dictado' && this.s().autoSpeak) this.speech.speak(c.aleman);
  }

  /* ----- ordenar ----- */
  protected reshuffle(): void {
    const c = this.cur();
    if (!c) return;
    const toks = orderTokens(c.aleman);
    let chips: Chip[] = toks.map((t, i) => ({ id: i, t }));
    for (let k = 0; k < 6; k++) {
      chips = shuffle(chips);
      if (chips.some((x, i) => x.id !== i)) break;
    }
    this.bank.set(chips);
    this.built.set([]);
  }
  protected put(ch: Chip): void {
    this.bank.update((b) => b.filter((x) => x.id !== ch.id));
    this.built.update((b) => [...b, ch]);
  }
  protected take(ch: Chip): void {
    this.built.update((b) => b.filter((x) => x.id !== ch.id));
    this.bank.update((b) => [...b, ch]);
  }

  /* ----- función ----- */
  private buildOptions(c: Card): void {
    const all = this.study.pool().filter((x) => x.tipo === 'frase' && x.categoria);
    const dir = Math.random() < 0.5 ? 'f2c' : 'c2f';
    this.dir.set(dir);
    if (dir === 'f2c') {
      const cats = shuffle(this.study.categoriasFrase().filter((x) => x.categoria !== c.categoria)).slice(0, 3);
      const mine = this.study.categoriasFrase().find((x) => x.categoria === c.categoria);
      const opts: Opt[] = [{ text: mine?.espanol ?? c.categoria!, sub: mine?.espanol ? c.categoria : null, correct: true }];
      for (const x of cats) opts.push({ text: x.espanol ?? x.categoria, sub: x.espanol ? x.categoria : null, correct: false });
      this.options.set(shuffle(opts));
    } else {
      const others = shuffle(all.filter((x) => x.categoria !== c.categoria && x.aleman !== c.aleman));
      const seen = new Set<string>([c.categoria!]);
      const picked: Card[] = [];
      for (const x of others) {
        if (!seen.has(x.categoria!)) {
          seen.add(x.categoria!);
          picked.push(x);
        }
        if (picked.length === 3) break;
      }
      this.options.set(shuffle([{ text: c.aleman, sub: null, correct: true }, ...picked.map((x) => ({ text: x.aleman, sub: null, correct: false }))]));
    }
  }
  protected choose(i: number): void {
    if (this.checked()) return;
    this.picked.set(i);
    const good = this.options()[i].correct;
    this.finish(good, good ? 'ok' : 'ko');
  }

  /* ----- escribir ----- */
  protected onInput(e: Event): void {
    this.answer.set((e.target as HTMLInputElement).value);
  }
  protected insert(ch: string): void {
    this.answer.update((v) => v + ch);
  }
  protected hint(): void {
    this.hintN.update((n) => Math.min(3, n + 1));
  }
  protected enter(e: Event): void {
    e.preventDefault();
    if (this.checked()) this.next();
    else this.check();
  }

  protected check(): void {
    const c = this.cur();
    if (!c || this.checked()) return;
    let v: Verdict;
    switch (this.mode()) {
      case 'hueco':
        if (!this.answer().trim() || !c.clave) return;
        // Frases «hermanas» con el mismo hueco (großartig / hervorragend): vale la clave de cualquiera.
        v = this.clavesDelHueco(c).reduce<Verdict>((best, k) => {
          const r = judgeGerman(this.answer(), k, false, true);
          return best === 'ok' || (best === 'typo' && r !== 'ok') ? best : r;
        }, 'ko');
        break;
      case 'memoria':
      case 'dictado':
        if (!this.answer().trim()) return;
        v = judgePhrase(this.answer(), c.aleman);
        break;
      case 'ordenar': {
        if (this.bank().length) return;
        const want = orderTokens(c.aleman).map(foldGerman);
        const got = this.built().map((x) => foldGerman(x.t));
        v = want.length === got.length && want.every((t, i) => t === got[i]) ? 'ok' : 'ko';
        break;
      }
      default:
        return;
    }
    this.finish(isCorrect(v), v);
  }
  private clavesDelHueco(c: Card): string[] {
    const hueco = c.clave ? cloze(c.aleman, c.clave) : null;
    const claves = new Set<string>(c.clave ? [c.clave] : []);
    for (const x of this.frases()) if (x.clave && hueco !== null && cloze(x.aleman, x.clave) === hueco) claves.add(x.clave);
    return [...claves];
  }

  protected giveUp(): void {
    if (this.checked()) return;
    this.gaveUp.set(true);
    this.finish(false, 'ko');
  }
  protected forgive(): void {
    this.ok.set(true);
    this.verdict.set('ok');
    this.forgiven.set(true);
  }

  private finish(ok: boolean, v: Verdict): void {
    this.ok.set(ok);
    this.verdict.set(v);
    this.checked.set(true);
  }

  protected next(): void {
    const c = this.cur();
    if (!c || !this.checked()) return;
    this.study.progress.grade(c.id, this.ok());
    if (this.ok()) this.score.update((n) => n + 1);
    else this.wrong.update((w) => [...w, c]);
    this.idx.update((i) => i + 1);
    this.prepare();
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, select, textarea')) return;
    if (this.mode() === 'funcion' && !this.checked() && ['1', '2', '3', '4'].includes(e.key)) {
      if (Number(e.key) <= this.options().length) this.choose(Number(e.key) - 1);
    } else if (e.key === 'Enter' && this.checked() && !t?.closest('button, a')) {
      e.preventDefault();
      this.next();
    }
  }
}
