import { Component, HostListener, OnInit, computed, input, output, signal } from '@angular/core';
import type { Block } from '../models';
import { judgeCell, shuffle } from '../utils/text';

export type TableBlock = Extract<Block, { t: 'table' }>;
interface Q {
  row: string;
  col: string;
  answer: string;
}

/** Práctica de una tabla de gramática: se da una fila y una columna y hay que escribir la celda. */
@Component({
  selector: 'app-table-drill',
  template: `
    <section class="panel stack" style="--gap: 12px" aria-label="Práctica de la tabla">
      <div class="row row-between">
        <h3>Practicar: {{ table().title }}</h3>
        <button type="button" class="btn btn-quiet" (click)="closed.emit()">Cerrar</button>
      </div>

      @if (qs().length === 0) {
        <p>Esta tabla no tiene preguntas para practicar.</p>
      } @else if (finished()) {
        <p class="big">Acertaste <b>{{ score() }}</b> de <b>{{ qs().length }}</b>.</p>
        <div class="row">
          <button type="button" class="btn btn-primary" (click)="start()">Otra ronda</button>
          <button type="button" class="btn btn-quiet" (click)="closed.emit()">Cerrar</button>
        </div>
      } @else {
        @if (cur(); as q) {
          <div class="meter" role="progressbar" aria-label="Avance" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100"><i [style.width.%]="pct()"></i></div>
          <p class="muted small" aria-live="polite">Pregunta {{ i() + 1 }} de {{ qs().length }}</p>
          <div class="row">
            <span class="chip big-chip">{{ q.row }}</span>
            <span class="chip big-chip">{{ q.col }}</span>
          </div>
          <div class="field">
            <label [for]="'td-' + i()">Escribe la forma que corresponde</label>
            <input
              [id]="'td-' + i()"
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
            <div class="row" role="group" aria-label="Letras alemanas">
              @for (ch of chars; track ch) {
                <button type="button" class="btn btn-icon" (click)="insert(ch)">{{ ch }}</button>
              }
            </div>
            <div class="row">
              <button type="button" class="btn btn-primary" (click)="check()">Comprobar</button>
              <button type="button" class="btn btn-quiet" (click)="giveUp()">No lo sé</button>
            </div>
          } @else {
            <div class="stack" style="--gap: 8px" role="status">
              @if (ok()) {
                <p class="good verdict">¡Correcto!</p>
              } @else {
                <p class="bad verdict">Respuesta: {{ q.answer }}</p>
              }
              <button type="button" class="btn btn-primary" (click)="next()">{{ i() + 1 === qs().length ? 'Ver resultado' : 'Siguiente' }}</button>
            </div>
          }
        }
      }
    </section>
  `,
  styles: `
    .big {
      font-size: 1.2rem;
    }
    .big-chip {
      font-size: 1.15rem;
      font-weight: 600;
      padding: 0.3em 0.8em;
    }
    .resp {
      font-size: 1.25rem;
    }
    .resp[readonly] {
      background: var(--ink-soft);
    }
    .verdict {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: 1.5rem;
      line-height: 1.1;
    }
  `,
})
export class TableDrill implements OnInit {
  readonly table = input.required<TableBlock>();
  readonly closed = output<void>();

  protected readonly chars = ['ä', 'ö', 'ü', 'ß'];
  protected readonly qs = signal<Q[]>([]);
  protected readonly i = signal(0);
  protected readonly answer = signal('');
  protected readonly checked = signal(false);
  protected readonly ok = signal(false);
  protected readonly score = signal(0);

  protected readonly cur = computed(() => this.qs()[this.i()] ?? null);
  protected readonly finished = computed(() => this.qs().length > 0 && this.i() >= this.qs().length);
  protected readonly pct = computed(() => (this.qs().length ? Math.round((this.i() / this.qs().length) * 100) : 0));

  ngOnInit(): void {
    this.start();
  }

  protected start(): void {
    const t = this.table();
    const spec = t.drill === true || !t.drill ? {} : t.drill;
    const from = spec.from ?? 0;
    const to = spec.to ?? t.head.map((_, k) => k).filter((k) => k !== from);
    const all: Q[] = [];
    for (const r of t.rows) {
      for (const c of to) {
        const a = (r[c] ?? '').trim();
        if (a && !/^[—–-]$/.test(a)) all.push({ row: r[from], col: t.head[c], answer: a });
      }
    }
    this.qs.set(shuffle(all).slice(0, 15));
    this.i.set(0);
    this.score.set(0);
    this.reset();
  }

  private reset(): void {
    this.answer.set('');
    this.checked.set(false);
    this.ok.set(false);
  }

  protected onInput(e: Event): void {
    this.answer.set((e.target as HTMLInputElement).value);
  }
  protected insert(ch: string): void {
    this.answer.update((v) => v + ch);
  }
  protected enter(e: Event): void {
    e.preventDefault();
    if (this.checked()) this.next();
    else this.check();
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (e.key === 'Enter' && this.checked() && !this.finished() && !t?.closest('button, a, input')) {
      e.preventDefault();
      this.next();
    }
  }

  protected check(): void {
    const q = this.cur();
    if (!q || this.checked() || !this.answer().trim()) return;
    const alternatives = q.answer.split('/').map((s) => s.trim());
    const ok = alternatives.some((a) => judgeCell(this.answer(), a));
    this.ok.set(ok);
    this.checked.set(true);
    if (ok) this.score.update((n) => n + 1);
  }
  protected giveUp(): void {
    if (this.checked()) return;
    this.ok.set(false);
    this.checked.set(true);
  }
  protected next(): void {
    if (!this.checked()) return;
    this.reset();
    this.i.update((n) => n + 1);
  }
}
