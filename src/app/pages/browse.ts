import { Component, computed, inject, signal } from '@angular/core';
import { Card } from '../models';
import { DataService } from '../services/data.service';
import { SettingsService } from '../services/settings.service';
import { SpeechService } from '../services/speech.service';
import { StudyService } from '../services/study.service';
import { FiltersComponent } from '../shared/filters';
import { GermanWord } from '../shared/german-word';
import { TIPO_SING, breakable, searchFold } from '../utils/text';

@Component({
  selector: 'app-browse',
  imports: [GermanWord, FiltersComponent],
  template: `
    <div class="stack" style="--gap: 16px">
      <h1>Palabras</h1>

      <div class="field">
        <label for="buscar">Buscar en alemán, español o inglés</label>
        <input id="buscar" class="input" type="search" [value]="query()" (input)="onQuery($event)" placeholder="Straße, calle, street…" autocomplete="off" />
      </div>

      <app-filters />

      <p class="muted" role="status">
        {{ results().length }} {{ results().length === 1 ? 'resultado' : 'resultados' }}
      </p>

      @if (results().length === 0) {
        <p class="panel">No hay palabras que coincidan. Prueba con otra búsqueda o quita algún filtro.</p>
      } @else {
        <ul class="list">
          @for (c of shown(); track c.id) {
            <li class="item">
              <span class="dot" [attr.data-box]="box(c.id)" [attr.title]="boxLabel(c.id)">
                <span class="sr-only">{{ boxLabel(c.id) }}</span>
              </span>
              <div class="main">
                <p class="de disp">
                  <app-de [text]="c.aleman" [noun]="c.tipo === 'sustantivo'" />
                  @if (c.formas && c.formas !== '-') {
                    <span class="formas"> {{ c.formas }}</span>
                  }
                </p>
                <p class="tr">{{ br(c[lang()]) }}</p>
                @if (c.nota) {
                  <p class="muted small note">{{ c.nota }}</p>
                }
              </div>
              <div class="side">
                <span class="chip">{{ tipo(c) }}</span>
                @if (speech.supported) {
                  <button type="button" class="btn btn-icon btn-quiet" (click)="speech.speak(c.aleman)" [attr.aria-label]="'Escuchar ' + c.aleman">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 010 6" /><path d="M18.5 6.5a8 8 0 010 11" /></svg>
                  </button>
                }
              </div>
            </li>
          }
        </ul>
        @if (shown().length < results().length) {
          <button type="button" class="btn btn-block" (click)="more()">
            Mostrar más ({{ results().length - shown().length }} restantes)
          </button>
        }
      }
    </div>
  `,
  styles: `
    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      border-top: 2px solid var(--ink);
    }
    .item {
      display: grid;
      grid-template-columns: 14px 1fr auto;
      gap: 12px;
      align-items: start;
      padding: 12px 0;
      border-bottom: 1px solid var(--line);
    }
    .dot {
      width: 12px;
      height: 12px;
      margin-top: 9px;
      border-radius: 50%;
      border: 2px solid var(--line);
      background: transparent;
    }
    .dot[data-box='1'] {
      background: var(--red);
      border-color: var(--red);
    }
    .dot[data-box='2'],
    .dot[data-box='3'],
    .dot[data-box='4'] {
      background: var(--ink);
      border-color: var(--ink);
    }
    .dot[data-box='5'] {
      background: var(--ok);
      border-color: var(--ok);
    }
    .de {
      font-size: 1.55rem;
      line-height: 1.15;
      color: var(--text);
      overflow-wrap: break-word;
    }
    .formas {
      margin-left: 6px;
      font-family: 'Barlow', sans-serif;
      font-weight: 400;
      font-size: 0.95rem;
      color: var(--text-2);
    }
    .tr {
      color: var(--text);
      overflow-wrap: break-word;
    }
    .note {
      font-style: italic;
    }
    .side {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    @media (max-width: 520px) {
      .item {
        grid-template-columns: 14px 1fr;
      }
      .side {
        grid-column: 2;
        justify-content: flex-start;
      }
    }
  `,
})
export class Browse {
  private readonly data = inject(DataService);
  protected readonly study = inject(StudyService);
  protected readonly settings = inject(SettingsService);
  protected readonly speech = inject(SpeechService);

  protected readonly query = signal('');
  private readonly limit = signal(60);
  protected readonly lang = computed(() => this.settings.state().lang);

  private readonly index = computed(
    () =>
      new Map(
        this.data
          .cards()
          .map((c) => [c.id, searchFold([c.aleman, c.formas, c.ingles, c.espanol, c.nota, c.categoria].filter(Boolean).join(' '))]),
      ),
  );

  protected readonly results = computed(() => {
    const q = searchFold(this.query().trim());
    const pool = this.study.pool();
    if (!q) return pool;
    const idx = this.index();
    return pool.filter((c) => idx.get(c.id)?.includes(q));
  });
  protected readonly shown = computed(() => this.results().slice(0, this.limit()));

  protected readonly br = breakable;

  protected onQuery(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
    this.limit.set(60);
  }
  protected more(): void {
    this.limit.update((n) => n + 60);
  }
  protected tipo(c: Card): string {
    return TIPO_SING[c.tipo] ?? c.tipo;
  }
  protected box(id: number): number {
    return this.study.progress.boxOf(id);
  }
  protected boxLabel(id: number): string {
    const b = this.box(id);
    return b === 0 ? 'Ficha nueva' : `Fach ${b}`;
  }
}
