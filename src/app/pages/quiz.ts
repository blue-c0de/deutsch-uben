import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card, Direction } from '../models';
import { DataService } from '../services/data.service';
import { SettingsService } from '../services/settings.service';
import { SpeechService } from '../services/speech.service';
import { StudyService } from '../services/study.service';
import { GermanWord } from '../shared/german-word';
import { PracticeSwitch } from '../shared/practice-switch';
import { LANG_NAME, TIPO_SING, breakable, shuffle, sizeFor } from '../utils/text';

interface Question {
  card: Card;
  dir: Direction;
  options: Card[];
}

@Component({
  selector: 'app-quiz',
  imports: [GermanWord, RouterLink, PracticeSwitch],
  template: `
    <app-practice-switch />
    @if (questions().length === 0) {
      <section class="panel stack">
        <h2>No hay fichas para el test</h2>
        <p>Con los filtros actuales no queda nada por practicar. Cambia «Qué estudiar» en el inicio.</p>
        <a class="btn btn-primary" routerLink="/">Ir al inicio</a>
      </section>
    } @else if (finished()) {
      <section class="panel stack" style="--gap: 14px">
        <h2>Test terminado</h2>
        <p class="big">
          Has acertado <b>{{ score() }}</b> de <b>{{ questions().length }}</b>.
        </p>
        @if (wrong().length) {
          <div class="stack" style="--gap: 6px">
            <h3>Para repasar</h3>
            <ul class="fails">
              @for (c of wrong(); track c.id) {
                <li>
                  <span class="disp de"><app-de [text]="c.aleman" [noun]="c.tipo === 'sustantivo'" /></span>
                  <span class="muted">{{ br(c[lang()]) }}</span>
                </li>
              }
            </ul>
          </div>
        }
        <div class="row">
          <button type="button" class="btn btn-primary" (click)="start()">Otro test</button>
          <a class="btn btn-quiet" routerLink="/">Volver al inicio</a>
        </div>
      </section>
    } @else {
      <div class="stack" style="--gap: 14px">
        <div class="row row-between">
          <span class="muted" aria-live="polite">Pregunta {{ idx() + 1 }} de {{ questions().length }}</span>
          <span class="muted">{{ score() }} {{ score() === 1 ? 'acierto' : 'aciertos' }}</span>
        </div>
        <div class="meter" role="progressbar" aria-label="Avance del test" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100">
          <i [style.width.%]="pct()"></i>
        </div>

        @for (q of visible(); track idx()) {
          <article class="kk prompt">
            <div class="meta row">
              <span class="chip">{{ q.dir === 'de-tr' ? 'Alemán' : langName() }}</span>
              <span class="chip">{{ tipo(q.card) }}</span>
            </div>
            <div class="content">
              @if (q.dir === 'de-tr') {
                <p class="word" [attr.data-size]="size(q.card.aleman)">
                  <app-de [text]="q.card.aleman" [noun]="q.card.tipo === 'sustantivo'" />
                </p>
              } @else {
                <p class="word" [attr.data-size]="size(q.card[lang()])">{{ br(q.card[lang()]) }}</p>
              }
            </div>
          </article>

          <div class="opts" role="group" [attr.aria-label]="q.dir === 'de-tr' ? 'Elige la traducción' : 'Elige la palabra en alemán'">
            @for (o of q.options; track o.id; let i = $index) {
              <button
                type="button"
                class="opt"
                [class.is-right]="selected() !== null && o.id === q.card.id"
                [class.is-wrong]="selected() === i && o.id !== q.card.id"
                [disabled]="selected() !== null"
                (click)="choose(i)"
              >
                <span class="key" aria-hidden="true">{{ i + 1 }}</span>
                <span class="txt">
                  @if (q.dir === 'de-tr') {
                    {{ br(o[lang()]) }}
                  } @else {
                    <app-de [text]="o.aleman" [noun]="o.tipo === 'sustantivo'" />
                  }
                </span>
                @if (selected() !== null && o.id === q.card.id) {
                  <span class="sr-only">Respuesta correcta</span>
                  <span class="mark good" aria-hidden="true">✓</span>
                }
                @if (selected() === i && o.id !== q.card.id) {
                  <span class="sr-only">Tu respuesta, incorrecta</span>
                  <span class="mark bad" aria-hidden="true">✗</span>
                }
              </button>
            }
          </div>

          @if (selected() !== null) {
            <section class="panel stack feedback" style="--gap: 8px" role="status">
              @if (acierto()) {
                <p class="good verdict">¡Correcto!</p>
              } @else {
                <p class="bad verdict">No era esa.</p>
              }
              <p class="disp answer">
                <app-de [text]="q.card.aleman" [noun]="q.card.tipo === 'sustantivo'" />
                <span class="muted eq">significa</span>
                {{ br(q.card[lang()]) }}
              </p>
              @if (q.card.formas) {
                <p class="muted small">{{ q.card.formas === '-' ? 'Sin plural' : q.card.formas }}</p>
              }
              @if (q.card.nota) {
                <p class="note">{{ q.card.nota }}</p>
              }
              <div class="row">
                <button type="button" class="btn btn-primary" (click)="next()">
                  {{ idx() + 1 === questions().length ? 'Ver resultado' : 'Siguiente' }}
                </button>
                @if (speech.supported) {
                  <button type="button" class="btn btn-quiet" (click)="speech.speak(q.card.aleman)">Escuchar</button>
                }
              </div>
            </section>
          }
        }
      </div>
    }
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
      display: flex;
      flex-wrap: wrap;
      gap: 2px 14px;
      align-items: baseline;
      padding: 6px 0;
      border-bottom: 1px solid var(--line);
    }
    .fails .de {
      font-size: 1.35rem;
      color: var(--text);
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
    .word {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      line-height: 1.04;
      font-size: clamp(2.3rem, 10vw, 3.4rem);
      overflow-wrap: break-word;
    }
    .word[data-size='m'] {
      font-size: clamp(1.8rem, 7vw, 2.4rem);
    }
    .word[data-size='s'] {
      font-size: clamp(1.4rem, 5.5vw, 1.8rem);
      line-height: 1.12;
    }
    .opts {
      display: grid;
      gap: 10px;
    }
    .opt {
      font: inherit;
      font-size: 1.12rem;
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
      opacity: 1;
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
    .answer {
      font-size: 1.5rem;
      line-height: 1.2;
    }
    .eq {
      font-family: 'Barlow', sans-serif;
      font-weight: 400;
      font-size: 1rem;
      margin: 0 6px;
    }
    .note {
      font-style: italic;
      padding: 6px 10px;
      border-left: 4px solid var(--mark);
      background: var(--ink-soft);
    }
  `,
})
export class Quiz {
  private readonly data = inject(DataService);
  protected readonly study = inject(StudyService);
  protected readonly settings = inject(SettingsService);
  protected readonly speech = inject(SpeechService);

  protected readonly questions = signal<Question[]>([]);
  protected readonly idx = signal(0);
  protected readonly selected = signal<number | null>(null);
  protected readonly score = signal(0);
  protected readonly wrong = signal<Card[]>([]);

  protected readonly lang = computed(() => this.settings.state().lang);
  protected readonly langName = computed(() => LANG_NAME[this.lang()]);
  protected readonly finished = computed(() => this.questions().length > 0 && this.idx() >= this.questions().length);
  protected readonly visible = computed(() => {
    const q = this.questions()[this.idx()];
    return q ? [q] : [];
  });
  protected readonly pct = computed(() =>
    this.questions().length ? Math.round((this.idx() / this.questions().length) * 100) : 0,
  );
  protected readonly acierto = computed(() => {
    const q = this.questions()[this.idx()];
    const sel = this.selected();
    return !!q && sel !== null && q.options[sel].id === q.card.id;
  });

  constructor() {
    this.start();
  }

  start(): void {
    const size = Math.min(this.settings.state().sessionSize, 20);
    const cards = this.study.buildSession(size);
    const filtered = this.study.pool();
    const pool = filtered.length >= 8 ? filtered : this.data.cards();
    this.questions.set(cards.map((card) => this.makeQuestion(card, pool)));
    this.idx.set(0);
    this.selected.set(null);
    this.score.set(0);
    this.wrong.set([]);
  }

  private makeQuestion(card: Card, pool: Card[]): Question {
    const dir = this.study.pickDir();
    const lang = this.lang();
    const textOf = (c: Card): string => (dir === 'de-tr' ? c[lang] : c.aleman);
    const correct = textOf(card);
    const candidates = pool.filter((c) => c.id !== card.id && textOf(c) !== correct);
    const ordered = [
      ...shuffle(candidates.filter((c) => c.tipo === card.tipo)),
      ...shuffle(candidates.filter((c) => c.tipo !== card.tipo)),
    ];
    const seen = new Set([correct]);
    const picked: Card[] = [];
    for (const c of ordered) {
      const t = textOf(c);
      if (!seen.has(t)) {
        seen.add(t);
        picked.push(c);
        if (picked.length === 3) break;
      }
    }
    return { card, dir, options: shuffle([card, ...picked]) };
  }

  choose(i: number): void {
    const q = this.questions()[this.idx()];
    if (!q || this.selected() !== null || i >= q.options.length) return;
    this.selected.set(i);
    const correct = q.options[i].id === q.card.id;
    this.study.progress.grade(q.card.id, correct);
    if (correct) {
      this.score.update((n) => n + 1);
    } else {
      this.wrong.update((w) => [...w, q.card]);
    }
    if (this.settings.state().autoSpeak) this.speech.speak(q.card.aleman);
  }

  next(): void {
    if (this.selected() === null) return;
    this.selected.set(null);
    this.idx.update((i) => i + 1);
  }

  protected tipo(c: Card): string {
    return TIPO_SING[c.tipo] ?? c.tipo;
  }

  protected readonly size = sizeFor;
  protected readonly br = breakable;

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, select, textarea')) return;
    if (['1', '2', '3', '4'].includes(e.key)) {
      this.choose(Number(e.key) - 1);
    } else if ((e.key === 'Enter' || e.key === ' ') && this.selected() !== null && !target?.closest('button, a')) {
      e.preventDefault();
      this.next();
    }
  }
}
