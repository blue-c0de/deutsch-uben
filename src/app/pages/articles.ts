import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card } from '../models';
import { SettingsService } from '../services/settings.service';
import { SpeechService } from '../services/speech.service';
import { StudyService } from '../services/study.service';
import { GermanWord } from '../shared/german-word';
import { PracticeSwitch } from '../shared/practice-switch';
import { genderRule } from '../utils/text';

type Art = 'der' | 'die' | 'das';
interface Q {
  card: Card;
  art: Art;
  noun: string;
}

/** Juego: ¿qué artículo lleva este sustantivo? */
@Component({
  selector: 'app-articles',
  imports: [GermanWord, RouterLink, PracticeSwitch],
  template: `
    <app-practice-switch />
    @if (qs().length === 0) {
      <section class="panel stack">
        <h2>No hay sustantivos para este juego</h2>
        <p>Con la fuente y los filtros actuales no hay sustantivos con artículo. Cambia la fuente en «Juegos».</p>
        <a class="btn btn-primary" routerLink="/juegos">Elegir fuente</a>
      </section>
    } @else if (finished()) {
      <section class="panel stack" style="--gap: 14px">
        <h2>Juego terminado</h2>
        <p class="big">Acertaste <b>{{ score() }}</b> de <b>{{ qs().length }}</b>.</p>
        @if (wrong().length) {
          <div class="stack" style="--gap: 6px">
            <h3>Para repasar</h3>
            <ul class="fails">
              @for (c of wrong(); track c.id) {
                <li>
                  <span class="disp de"><app-de [text]="c.aleman" /></span>
                  <span class="muted">{{ c[lang()] }}</span>
                </li>
              }
            </ul>
          </div>
        }
        <div class="row">
          <button type="button" class="btn btn-primary" (click)="start()">Otra ronda</button>
          <a class="btn btn-quiet" routerLink="/juegos">Elegir otro juego</a>
        </div>
      </section>
    } @else {
      <div class="stack" style="--gap: 14px">
        <div class="row row-between">
          <span class="muted" aria-live="polite">Palabra {{ idx() + 1 }} de {{ qs().length }}</span>
          <span class="muted">{{ score() }} {{ score() === 1 ? 'acierto' : 'aciertos' }}</span>
        </div>
        <div class="meter" role="progressbar" aria-label="Avance" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100"><i [style.width.%]="pct()"></i></div>

        @for (q of visible(); track idx()) {
          <article class="kk prompt">
            <div class="meta row"><span class="chip">¿der, die o das?</span></div>
            <div class="content stack" style="--gap: 6px">
              <p class="word"><span class="blank" aria-hidden="true">___</span> {{ q.noun }}</p>
              <p class="muted tr">{{ q.card[lang()] }}</p>
            </div>
          </article>

          <div class="arts" role="group" aria-label="Elige el artículo">
            @for (a of arts; track a; let i = $index) {
              <button
                type="button"
                class="art-btn"
                [attr.data-art]="a"
                [class.is-right]="picked() !== null && a === q.art"
                [class.is-wrong]="picked() === a && a !== q.art"
                [disabled]="picked() !== null"
                (click)="choose(a)"
              >
                <span class="k" aria-hidden="true">{{ i + 1 }}</span>
                <span class="a">{{ a }}</span>
              </button>
            }
          </div>

          @if (picked() !== null) {
            <section class="panel stack" style="--gap: 8px" role="status">
              @if (picked() === q.art) {
                <p class="good verdict">¡Correcto!</p>
              } @else {
                <p class="bad verdict">Es «{{ q.art }}».</p>
              }
              <p class="disp answer">
                <app-de [text]="q.card.aleman" />
                @if (q.card.formas && q.card.formas !== '-') {
                  <span class="muted pl">{{ q.card.formas }}</span>
                }
              </p>
              @if (hint(q); as h) {
                <p class="note">{{ h }}</p>
              }
              <div class="row">
                <button type="button" class="btn btn-primary" (click)="next()">{{ idx() + 1 === qs().length ? 'Ver resultado' : 'Siguiente' }}</button>
                @if (speech.supported) {
                  <button type="button" class="btn btn-quiet" (click)="speech.speak(q.card.aleman)">Escuchar</button>
                }
              </div>
            </section>
          }
        }
        <p class="muted small keys">Atajos: 1 der, 2 die, 3 das; Enter para continuar.</p>
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
      min-height: 200px;
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
      font-size: clamp(2.4rem, 11vw, 3.6rem);
      overflow-wrap: anywhere;
    }
    .blank {
      color: var(--text-2);
      letter-spacing: 0.05em;
    }
    .tr {
      font-size: 1.15rem;
    }
    .arts {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .art-btn {
      font: inherit;
      display: grid;
      justify-items: center;
      gap: 2px;
      min-height: 84px;
      padding: 10px 6px;
      color: var(--genus);
      background: var(--card);
      border: 3px solid var(--genus);
      border-radius: var(--radius);
      cursor: pointer;
    }
    .art-btn[disabled] {
      cursor: default;
    }
    .art-btn:not([disabled]):hover {
      background: var(--ink-soft);
    }
    .art-btn .a {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: 2.4rem;
      line-height: 1;
    }
    .art-btn .k {
      font-size: 0.8rem;
      color: var(--text-2);
    }
    .art-btn.is-right {
      background: color-mix(in srgb, var(--ok) 16%, var(--card));
      box-shadow: inset 0 0 0 3px var(--ok);
    }
    .art-btn.is-wrong {
      background: color-mix(in srgb, var(--red) 14%, var(--card));
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
      font-size: 1.7rem;
      line-height: 1.2;
    }
    .pl {
      font-family: 'Barlow', sans-serif;
      font-weight: 400;
      font-size: 1rem;
      margin-left: 8px;
    }
    .note {
      font-style: italic;
      padding: 6px 10px;
      border-left: 4px solid var(--mark);
      background: var(--ink-soft);
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
export class Articles {
  protected readonly study = inject(StudyService);
  protected readonly settings = inject(SettingsService);
  protected readonly speech = inject(SpeechService);

  protected readonly arts: Art[] = ['der', 'die', 'das'];
  protected readonly qs = signal<Q[]>([]);
  protected readonly idx = signal(0);
  protected readonly picked = signal<Art | null>(null);
  protected readonly score = signal(0);
  protected readonly wrong = signal<Card[]>([]);

  protected readonly lang = computed(() => this.settings.state().lang);
  protected readonly finished = computed(() => this.qs().length > 0 && this.idx() >= this.qs().length);
  protected readonly visible = computed(() => {
    const q = this.qs()[this.idx()];
    return q ? [q] : [];
  });
  protected readonly pct = computed(() => (this.qs().length ? Math.round((this.idx() / this.qs().length) * 100) : 0));

  constructor() {
    this.start();
  }

  start(): void {
    const s = this.settings.state();
    // Solo sustantivos con un artículo claro (se descartan «der/das Sakko»).
    const nouns = this.study.pool().filter((c) => c.tipo === 'sustantivo' && /^(der|die|das)\s+\S/i.test(c.aleman));
    const cards = this.study.buildSession(s.sessionSize, s.estado, nouns);
    this.qs.set(
      cards.map((card) => {
        const m = /^(der|die|das)\s+(.+)$/i.exec(card.aleman.trim())!;
        return { card, art: m[1].toLowerCase() as Art, noun: m[2] };
      }),
    );
    this.idx.set(0);
    this.picked.set(null);
    this.score.set(0);
    this.wrong.set([]);
  }

  choose(a: Art): void {
    const q = this.qs()[this.idx()];
    if (!q || this.picked() !== null) return;
    this.picked.set(a);
    const ok = a === q.art;
    this.study.progress.grade(q.card.id, ok);
    if (ok) this.score.update((n) => n + 1);
    else this.wrong.update((w) => [...w, q.card]);
    if (this.settings.state().autoSpeak) this.speech.speak(q.card.aleman);
  }

  next(): void {
    if (this.picked() === null) return;
    this.picked.set(null);
    this.idx.update((i) => i + 1);
  }

  protected hint(q: Q): string | null {
    const r = genderRule(q.noun);
    if (!r) return null;
    return r.art === q.art
      ? `Pista: las palabras acabadas en «${r.suffix}» casi siempre son «${r.art}».`
      : `Excepción: las palabras en «${r.suffix}» suelen ser «${r.art}», pero esta es «${q.art}».`;
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (t?.closest('input, select, textarea')) return;
    if (['1', '2', '3'].includes(e.key)) this.choose(this.arts[Number(e.key) - 1]);
    else if ((e.key === 'Enter' || e.key === ' ') && this.picked() !== null && !t?.closest('button, a')) {
      e.preventDefault();
      this.next();
    }
  }
}
