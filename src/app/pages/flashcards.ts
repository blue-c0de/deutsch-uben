import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card, SessionItem } from '../models';
import { SettingsService } from '../services/settings.service';
import { SpeechService } from '../services/speech.service';
import { StudyService } from '../services/study.service';
import { GermanWord } from '../shared/german-word';
import { LANG_NAME, TIPO_SING, breakable, sizeFor } from '../utils/text';

@Component({
  selector: 'app-flashcards',
  imports: [GermanWord, RouterLink],
  template: `
    @if (session().length === 0) {
      <section class="panel stack">
        <h2>No hay fichas para estudiar</h2>
        <p>Con los filtros actuales no queda nada por practicar. Cambia «Qué estudiar» en el inicio.</p>
        <a class="btn btn-primary" routerLink="/">Ir al inicio</a>
      </section>
    } @else if (finished()) {
      <section class="panel stack" style="--gap: 14px">
        <h2>Sesión terminada</h2>
        <p class="big">
          Acertaste <b>{{ ok() }}</b> de <b>{{ ok() + ko() }}</b> a la primera.
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
          @if (failed().length) {
            <button type="button" class="btn btn-primary" (click)="start(failed())">Repasar las falladas</button>
          }
          <button type="button" class="btn" [class.btn-primary]="!failed().length" (click)="start()">Otra sesión</button>
          <a class="btn btn-quiet" routerLink="/">Volver al inicio</a>
        </div>
      </section>
    } @else {
      <div class="stack" style="--gap: 14px">
        <div class="row row-between">
          <span class="muted" aria-live="polite">Ficha {{ idx() + 1 }} de {{ session().length }}</span>
          <span class="muted">{{ ok() }} bien, {{ ko() }} mal</span>
        </div>
        <div class="meter" role="progressbar" aria-label="Avance de la sesión" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100">
          <i [style.width.%]="pct()"></i>
        </div>

        @for (it of visible(); track idx()) {
          <div class="flip" [class.is-flipped]="flipped()">
            <div
              class="inner"
              role="button"
              tabindex="0"
              (click)="flip()"
              [attr.aria-label]="flipped() ? 'Ficha dada la vuelta. Toca para ver el otro lado' : 'Toca para ver la respuesta'"
            >
              <article class="face kk front" [attr.aria-hidden]="flipped()">
                <div class="meta row">
                  <span class="chip">{{ it.dir === 'de-tr' ? 'Alemán' : langName() }}</span>
                  <span class="chip">{{ tipo(it.card) }}</span>
                </div>
                <div class="content">
                  @if (it.dir === 'de-tr') {
                    <p class="word" [attr.data-size]="size(it.card.aleman)">
                      <app-de [text]="it.card.aleman" [noun]="it.card.tipo === 'sustantivo'" />
                    </p>
                    @if (speech.supported) {
                      <button type="button" class="btn btn-icon btn-quiet say" (click)="say(it.card, $event)" aria-label="Escuchar la pronunciación">
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 010 6" /><path d="M18.5 6.5a8 8 0 010 11" /></svg>
                      </button>
                    }
                  } @else {
                    <p class="word" [attr.data-size]="size(it.card[lang()])">{{ br(it.card[lang()]) }}</p>
                  }
                </div>
              </article>

              <article class="face kk back" [attr.aria-hidden]="!flipped()">
                <div class="meta row">
                  <span class="chip">{{ tipo(it.card) }}</span>
                  @if (it.card.revisar) {
                    <span class="chip">Revisar</span>
                  }
                </div>
                <div class="content stack" style="--gap: 6px">
                  <p class="word" [attr.data-size]="size(it.card.aleman)">
                    <app-de [text]="it.card.aleman" [noun]="it.card.tipo === 'sustantivo'" />
                  </p>
                  @if (it.card.formas) {
                    <p class="muted">{{ formasTexto(it.card) }}</p>
                  }
                  <p class="tr">{{ br(it.card[lang()]) }}</p>
                  <p class="muted small">{{ otroNombre() }}: {{ br(it.card[otro()]) }}</p>
                  @if (it.card.nota) {
                    <p class="note">{{ it.card.nota }}</p>
                  }
                  <p class="muted small">{{ origen(it.card) }}</p>
                  @if (speech.supported) {
                    <button type="button" class="btn btn-icon btn-quiet say" (click)="say(it.card, $event)" aria-label="Escuchar la pronunciación">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 010 6" /><path d="M18.5 6.5a8 8 0 010 11" /></svg>
                    </button>
                  }
                </div>
              </article>
            </div>
          </div>
        }

        @if (!flipped()) {
          <button type="button" class="btn btn-primary btn-block" (click)="flip()">Mostrar respuesta</button>
        } @else {
          <div class="grade">
            <button type="button" class="btn btn-bad" (click)="answer(false)">Otra vez</button>
            <button type="button" class="btn btn-ok" (click)="answer(true)">La sabía</button>
          </div>
        }
        <p class="muted small keys">Atajos: espacio da la vuelta a la ficha, flecha izquierda la repite, flecha derecha la da por sabida.</p>
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
      display: grid;
      gap: 4px;
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

    .flip {
      perspective: 1400px;
    }
    .inner {
      position: relative;
      height: clamp(330px, 56vh, 440px);
      transform-style: preserve-3d;
      transition: transform 0.45s cubic-bezier(0.3, 0.7, 0.2, 1);
      cursor: pointer;
    }
    .is-flipped .inner {
      transform: rotateY(180deg);
    }
    .face {
      position: absolute;
      inset: 0;
      overflow: auto;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      padding: 0 22px 20px;
    }
    .back {
      transform: rotateY(180deg);
    }
    .meta {
      min-height: 54px;
      padding-top: 12px;
      align-items: flex-start;
    }
    .content {
      padding-top: 24px;
      position: relative;
    }
    .word {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      line-height: 1.04;
      font-size: clamp(2.6rem, 12vw, 4rem);
      overflow-wrap: break-word;
    }
    .word[data-size='m'] {
      font-size: clamp(1.9rem, 8vw, 2.7rem);
    }
    .word[data-size='s'] {
      font-size: clamp(1.45rem, 6vw, 1.9rem);
      line-height: 1.12;
    }
    .tr {
      font-size: 1.35rem;
      font-weight: 600;
      color: var(--ink);
    }
    .note {
      font-style: italic;
      padding: 6px 10px;
      border-left: 4px solid var(--mark);
      background: var(--ink-soft);
    }
    .say {
      margin-top: 8px;
      margin-left: -10px;
      color: var(--ink);
    }
    .grade {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .grade .btn {
      min-height: 54px;
      font-size: 1.1rem;
    }
    .keys {
      display: none;
    }
    @media (hover: hover) and (min-width: 820px) {
      .keys {
        display: block;
      }
    }
  `,
})
export class Flashcards {
  protected readonly study = inject(StudyService);
  protected readonly settings = inject(SettingsService);
  protected readonly speech = inject(SpeechService);

  protected readonly session = signal<SessionItem[]>([]);
  protected readonly idx = signal(0);
  protected readonly flipped = signal(false);
  protected readonly ok = signal(0);
  protected readonly ko = signal(0);
  protected readonly failed = signal<Card[]>([]);

  protected readonly lang = computed(() => this.settings.state().lang);
  protected readonly otro = computed(() => (this.lang() === 'espanol' ? 'ingles' : 'espanol'));
  protected readonly langName = computed(() => LANG_NAME[this.lang()]);
  protected readonly otroNombre = computed(() => LANG_NAME[this.otro()]);

  protected readonly current = computed(() => this.session()[this.idx()] ?? null);
  protected readonly visible = computed(() => {
    const c = this.current();
    return c ? [c] : [];
  });
  protected readonly finished = computed(() => this.session().length > 0 && this.idx() >= this.session().length);
  protected readonly pct = computed(() =>
    this.session().length ? Math.round((this.idx() / this.session().length) * 100) : 0,
  );

  constructor() {
    this.start();
  }

  start(cards?: Card[]): void {
    const list = cards ?? this.study.buildSession(this.settings.state().sessionSize);
    this.session.set(list.map((card) => ({ card, dir: this.study.pickDir(), retry: false })));
    this.idx.set(0);
    this.flipped.set(false);
    this.ok.set(0);
    this.ko.set(0);
    this.failed.set([]);
    this.autoSpeakFront();
  }

  flip(): void {
    const it = this.current();
    if (!it) return;
    this.flipped.update((v) => !v);
    if (this.flipped() && it.dir === 'tr-de') this.autoSpeak(it.card);
  }

  answer(correct: boolean): void {
    const it = this.current();
    if (!it || !this.flipped()) return;
    if (!it.retry) {
      this.study.progress.grade(it.card.id, correct);
      if (correct) {
        this.ok.update((n) => n + 1);
      } else {
        this.ko.update((n) => n + 1);
        this.failed.update((f) => [...f, it.card]);
        this.session.update((s) => [...s, { ...it, retry: true }]);
      }
    }
    this.flipped.set(false);
    this.idx.update((i) => i + 1);
    this.autoSpeakFront();
  }

  protected say(card: Card, e: Event): void {
    e.stopPropagation();
    this.speech.speak(card.aleman);
  }

  private autoSpeak(card: Card): void {
    if (this.settings.state().autoSpeak) this.speech.speak(card.aleman);
  }

  private autoSpeakFront(): void {
    const it = this.current();
    if (it && it.dir === 'de-tr') this.autoSpeak(it.card);
  }

  protected tipo(c: Card): string {
    return TIPO_SING[c.tipo] ?? c.tipo;
  }

  protected readonly size = sizeFor;
  protected readonly br = breakable;

  protected formasTexto(c: Card): string {
    if (c.formas === '-') return 'Sin plural';
    return c.tipo === 'adjetivo' ? `Comparativo y superlativo: ${c.formas}` : `Plural: ${c.formas}`;
  }

  protected origen(c: Card): string {
    const partes = [c.fuente];
    if (c.modulo !== null) partes.push(`módulo ${c.modulo}`);
    if (c.pagina !== null) partes.push(`página ${c.pagina}`);
    if (c.seccion) partes.push(c.seccion);
    return partes.join(', ');
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input, select, textarea, summary')) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.flip();
    } else if (e.key === 'ArrowRight') {
      this.answer(true);
    } else if (e.key === 'ArrowLeft') {
      this.answer(false);
    }
  }
}
