import { Component, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card, SessionItem } from '../models';
import { SettingsService } from '../services/settings.service';
import { SpeechService } from '../services/speech.service';
import { StudyService } from '../services/study.service';
import { GermanWord } from '../shared/german-word';
import { PracticeSwitch } from '../shared/practice-switch';
import {
  LANG_NAME,
  TIPO_SING,
  Verdict,
  firstAlternative,
  isCorrect,
  judgeGerman,
  judgeTranslation,
  lettersIn,
  maskAnswer,
  breakable,
  sizeFor,
} from '../utils/text';

@Component({
  selector: 'app-write',
  imports: [GermanWord, RouterLink, PracticeSwitch],
  template: `
    <app-practice-switch />
    @if (session().length === 0) {
      <section class="panel stack">
        <h2>No hay fichas para escribir</h2>
        <p>Con los filtros actuales no queda nada por practicar. Cambia «Qué estudiar» en el inicio.</p>
        <a class="btn btn-primary" routerLink="/">Ir al inicio</a>
      </section>
    } @else if (finished()) {
      <section class="panel stack" style="--gap: 14px">
        <h2>Práctica terminada</h2>
        <p class="big">
          Escribiste bien <b>{{ ok() }}</b> de <b>{{ session().length }}</b>.
        </p>
        @if (failed().length) {
          <div class="stack" style="--gap: 6px">
            <h3>Para repasar</h3>
            <ul class="fails">
              @for (c of failed(); track c.id) {
                <li>
                  <span class="disp de"><app-de [text]="c.aleman" [noun]="c.tipo === 'sustantivo'" /></span>
                  <span class="muted">{{ br(c[lang()]) }}</span>
                </li>
              }
            </ul>
          </div>
        }
        <div class="row">
          <button type="button" class="btn btn-primary" (click)="start()">Otra ronda</button>
          <a class="btn btn-quiet" routerLink="/">Volver al inicio</a>
        </div>
      </section>
    } @else {
      <div class="stack" style="--gap: 14px">
        <div class="row row-between">
          <span class="muted" aria-live="polite">Palabra {{ idx() + 1 }} de {{ session().length }}</span>
          <span class="muted">{{ ok() }} bien</span>
        </div>
        <div class="meter" role="progressbar" aria-label="Avance" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100">
          <i [style.width.%]="pct()"></i>
        </div>

        @if (skippedFrases()) {
          <p class="muted small">Las frases largas no entran en este modo. Si quieres practicarlas, elige «Frases» en «Qué estudiar».</p>
        }

        @for (it of visible(); track idx()) {
          <article class="kk prompt">
            <div class="meta row">
              <span class="chip">{{ it.dir === 'de-tr' ? 'Alemán' : langName() }}</span>
              <span class="chip">{{ tipo(it.card) }}</span>
            </div>
            <div class="content">
              @if (it.dir === 'de-tr') {
                <p class="word" [attr.data-size]="size(it.card.aleman)">
                  <app-de [text]="it.card.aleman" [noun]="it.card.tipo === 'sustantivo'" />
                </p>
              } @else {
                <p class="word" [attr.data-size]="size(it.card[lang()])">{{ br(it.card[lang()]) }}</p>
              }
            </div>
          </article>

          <div class="field">
            <label for="respuesta">
              {{ it.dir === 'tr-de' ? 'Escríbelo en alemán' : 'Escribe la traducción en ' + langName().toLowerCase() }}
            </label>
            <input
              #inp
              id="respuesta"
              class="input answer-input"
              type="text"
              [value]="answer()"
              [readOnly]="phase() === 'checked'"
              (input)="onInput($event)"
              (keydown.enter)="enter($event)"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="done"
              [attr.lang]="it.dir === 'tr-de' ? 'de' : null"
            />
          </div>

          @if (phase() === 'asking') {
            @if (it.dir === 'tr-de') {
              <div class="row umlauts" role="group" aria-label="Letras alemanas">
                @for (ch of chars; track ch) {
                  <button type="button" class="btn btn-icon" (click)="insert(ch)">{{ ch }}</button>
                }
              </div>
            }
            @if (hintN() > 0) {
              <p class="hint" aria-live="polite">{{ hintText() }}</p>
            }
            <div class="row">
              <button type="button" class="btn btn-primary" (click)="check()">Comprobar</button>
              <button type="button" class="btn" (click)="hint()" [disabled]="!canHint()">Pista</button>
              <button type="button" class="btn btn-quiet" (click)="giveUp()">No lo sé</button>
            </div>
          } @else {
            <section class="panel stack feedback" style="--gap: 8px" role="status">
              @switch (verdict()) {
                @case ('ok') {
                  <p class="good verdict">¡Correcto!</p>
                }
                @case ('typo') {
                  <p class="good verdict">Casi perfecto</p>
                  <p>Se escribe «{{ shown(it) }}».</p>
                }
                @case ('article') {
                  <p class="bad verdict">Fíjate en el artículo</p>
                  <p>Es «{{ shown(it) }}».</p>
                }
                @default {
                  <p class="bad verdict">{{ gaveUp() ? 'Esta es la respuesta' : 'No coincide' }}</p>
                  <p class="disp answer">
                    @if (it.dir === 'tr-de') {
                      <app-de [text]="it.card.aleman" [noun]="it.card.tipo === 'sustantivo'" />
                    } @else {
                      {{ br(shown(it)) }}
                    }
                  </p>
                }
              }
              @if (it.card.formas && it.dir === 'tr-de') {
                <p class="muted small">{{ it.card.formas === '-' ? 'Sin plural' : it.card.formas }}</p>
              }
              @if (it.card.nota) {
                <p class="note">{{ it.card.nota }}</p>
              }
              <div class="row">
                <button type="button" class="btn btn-primary" (click)="next()">
                  {{ idx() + 1 === session().length ? 'Ver resultado' : 'Siguiente' }}
                </button>
                @if (verdict() === 'ko' && !gaveUp() && !forgiven()) {
                  <button type="button" class="btn" (click)="forgive()">Contar como correcta</button>
                }
                @if (speech.supported) {
                  <button type="button" class="btn btn-quiet" (click)="speech.speak(it.card.aleman)">Escuchar</button>
                }
              </div>
              @if (forgiven()) {
                <p class="muted small">Contada como correcta.</p>
              }
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
      overflow-wrap: anywhere;
    }
    .word[data-size='m'] {
      font-size: clamp(1.8rem, 7vw, 2.4rem);
    }
    .word[data-size='s'] {
      font-size: clamp(1.4rem, 5.5vw, 1.8rem);
      line-height: 1.12;
    }
    .answer-input {
      font-size: 1.3rem;
    }
    .answer-input[readonly] {
      background: var(--ink-soft);
    }
    .umlauts .btn {
      font-size: 1.2rem;
      min-height: 44px;
    }
    .hint {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: 1.7rem;
      letter-spacing: 0.08em;
      color: var(--ink);
    }
    .verdict {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: 1.6rem;
      line-height: 1;
    }
    .answer {
      font-size: 1.7rem;
      line-height: 1.15;
    }
    .note {
      font-style: italic;
      padding: 6px 10px;
      border-left: 4px solid var(--mark);
      background: var(--ink-soft);
    }
  `,
})
export class Write {
  protected readonly study = inject(StudyService);
  protected readonly settings = inject(SettingsService);
  protected readonly speech = inject(SpeechService);
  private readonly inp = viewChild<ElementRef<HTMLInputElement>>('inp');

  protected readonly chars = ['ä', 'ö', 'ü', 'ß'];
  protected readonly session = signal<SessionItem[]>([]);
  protected readonly idx = signal(0);
  protected readonly answer = signal('');
  protected readonly phase = signal<'asking' | 'checked'>('asking');
  protected readonly verdict = signal<Verdict | null>(null);
  protected readonly gaveUp = signal(false);
  protected readonly forgiven = signal(false);
  protected readonly hintN = signal(0);
  protected readonly ok = signal(0);
  protected readonly failed = signal<Card[]>([]);
  protected readonly skippedFrases = signal(false);

  protected readonly lang = computed(() => this.settings.state().lang);
  protected readonly langName = computed(() => LANG_NAME[this.lang()]);
  protected readonly current = computed(() => this.session()[this.idx()] ?? null);
  protected readonly visible = computed(() => {
    const c = this.current();
    return c ? [c] : [];
  });
  protected readonly finished = computed(() => this.session().length > 0 && this.idx() >= this.session().length);
  protected readonly pct = computed(() =>
    this.session().length ? Math.round((this.idx() / this.session().length) * 100) : 0,
  );
  protected readonly hintText = computed(() => {
    const it = this.current();
    return it ? maskAnswer(this.target(it), this.hintN()) : '';
  });
  protected readonly canHint = computed(() => {
    const it = this.current();
    return !!it && this.hintN() < lettersIn(this.target(it)) - 1;
  });

  constructor() {
    this.start();
    effect(() => {
      const el = this.inp()?.nativeElement;
      if (el && this.phase() === 'asking') queueMicrotask(() => el.focus());
    });
  }

  start(): void {
    const s = this.settings.state();
    let pool = this.study.pool();
    // Las frases largas no se piden por escrito salvo que las elijas en el filtro.
    this.skippedFrases.set(false);
    if (s.tipos.length === 0) {
      const sinFrases = pool.filter((c) => c.tipo !== 'frase');
      this.skippedFrases.set(sinFrases.length < pool.length);
      pool = sinFrases;
    }
    const cards = this.study.buildSession(s.sessionSize, s.estado, pool);
    this.session.set(cards.map((card) => ({ card, dir: this.study.pickDir(), retry: false })));
    this.idx.set(0);
    this.ok.set(0);
    this.failed.set([]);
    this.resetQuestion();
  }

  private resetQuestion(): void {
    this.answer.set('');
    this.phase.set('asking');
    this.verdict.set(null);
    this.gaveUp.set(false);
    this.forgiven.set(false);
    this.hintN.set(0);
  }

  /** Texto que se muestra como respuesta correcta. */
  protected shown(it: SessionItem): string {
    return it.dir === 'tr-de' ? it.card.aleman : it.card[this.lang()];
  }

  /** Texto usado para las pistas (una sola opción si hay alternativas). */
  private target(it: SessionItem): string {
    return it.dir === 'tr-de' ? it.card.aleman : firstAlternative(it.card[this.lang()]);
  }

  onInput(e: Event): void {
    this.answer.set((e.target as HTMLInputElement).value);
  }

  insert(ch: string): void {
    const el = this.inp()?.nativeElement;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const value = el.value.slice(0, start) + ch + el.value.slice(end);
    this.answer.set(value);
    el.value = value;
    el.focus();
    el.setSelectionRange(start + 1, start + 1);
  }

  hint(): void {
    if (this.canHint()) this.hintN.update((n) => n + 1);
  }

  enter(e: Event): void {
    e.preventDefault();
    if (this.phase() === 'asking') this.check();
    else this.next();
  }

  check(): void {
    const it = this.current();
    if (!it || this.phase() !== 'asking') return;
    if (!this.answer().trim()) return;
    const v =
      it.dir === 'tr-de'
        ? judgeGerman(this.answer(), it.card.aleman, it.card.tipo === 'sustantivo')
        : judgeTranslation(this.answer(), it.card[this.lang()], this.lang());
    this.verdict.set(v);
    this.phase.set('checked');
  }

  giveUp(): void {
    if (this.phase() !== 'asking') return;
    this.gaveUp.set(true);
    this.verdict.set('ko');
    this.phase.set('checked');
  }

  forgive(): void {
    this.forgiven.set(true);
    this.verdict.set('ok');
  }

  next(): void {
    const it = this.current();
    if (!it || this.phase() !== 'checked') return;
    const v = this.verdict();
    const correct = v !== null && isCorrect(v);
    this.study.progress.grade(it.card.id, correct);
    if (correct) {
      this.ok.update((n) => n + 1);
    } else {
      this.failed.update((f) => [...f, it.card]);
    }
    if (this.settings.state().autoSpeak) this.speech.speak(it.card.aleman);
    this.resetQuestion();
    this.idx.update((i) => i + 1);
  }

  protected tipo(c: Card): string {
    return TIPO_SING[c.tipo] ?? c.tipo;
  }

  protected readonly size = sizeFor;
  protected readonly br = breakable;

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    // Con la comprobación hecha, Enter en cualquier parte pasa a la siguiente palabra.
    const target = e.target as HTMLElement | null;
    if (e.key === 'Enter' && this.phase() === 'checked' && !target?.closest('button, a, input')) {
      e.preventDefault();
      this.next();
    }
  }
}
