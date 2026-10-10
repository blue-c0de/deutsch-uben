import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GRUPOS, TEMAS } from '../data/referencia';
import type { Block, Topic } from '../models';
import { TableDrill } from '../shared/table-drill';
import { searchFold } from '../utils/text';

interface Seg {
  t: string;
  b: boolean;
  i: boolean;
}

function textOf(b: Block): string {
  switch (b.t) {
    case 'p':
    case 'note':
    case 'warn':
      return b.text;
    case 'list':
      return b.items.join(' ');
    case 'ex':
      return b.items.map((e) => e.de + ' ' + e.es).join(' ');
    case 'table':
      return (b.title ?? '') + ' ' + b.head.join(' ') + ' ' + b.rows.map((r) => r.join(' ')).join(' ');
  }
}

@Component({
  selector: 'app-reference',
  imports: [TableDrill],
  template: `
    @if (current(); as t) {
      <article class="stack" style="--gap: 16px">
        <div class="row">
          <button type="button" class="btn" (click)="close()">Volver al índice</button>
        </div>
        <header class="stack" style="--gap: 6px">
          <p class="muted small">{{ t.grupo }}</p>
          <h2 class="ttl">{{ t.titulo }}</h2>
          <p class="muted">{{ t.resumen }}</p>
        </header>

        @for (b of t.blocks; track $index; let bi = $index) {
          @if (b.t === 'p') {
            <p class="rt">
              @for (s of rich(b.text); track $index) {
                <span [class.b]="s.b" [class.i]="s.i">{{ s.t }}</span>
              }
            </p>
          } @else if (b.t === 'list') {
            <ul class="rl">
              @for (it of b.items; track $index) {
                <li>
                  @for (s of rich(it); track $index) {
                    <span [class.b]="s.b" [class.i]="s.i">{{ s.t }}</span>
                  }
                </li>
              }
            </ul>
          } @else if (b.t === 'table') {
            <section class="tb stack" style="--gap: 8px">
              @if (b.title) {
                <h3>{{ b.title }}</h3>
              }
              <div class="scroll" tabindex="0" role="region" [attr.aria-label]="b.title ?? 'Tabla'">
                <table>
                  <thead>
                    <tr>
                      @for (h of b.head; track $index) {
                        <th scope="col" [attr.data-art]="hdrArt(h)">{{ h }}</th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of b.rows; track $index) {
                      <tr>
                        @for (c of r; track $index; let ci = $index) {
                          @if (ci === 0) {
                            <th scope="row">
                              {{ c }}
                            </th>
                          } @else {
                            <td>
                              <span [class.art]="!!cellArt(b, ci)" [attr.data-art]="cellArt(b, ci)">{{ c }}</span>
                            </td>
                          }
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              @if (b.drill) {
                @if (drillOpen() === bi) {
                  <app-table-drill [table]="b" (closed)="drillOpen.set(null)" />
                } @else {
                  <div class="row">
                    <button type="button" class="btn btn-primary" (click)="drillOpen.set(bi)">Practicar esta tabla</button>
                  </div>
                }
              }
            </section>
          } @else if (b.t === 'ex') {
            <ul class="ex">
              @for (e of b.items; track $index) {
                <li>
                  <span class="de">{{ e.de }}</span>
                  <span class="es muted">{{ e.es }}</span>
                </li>
              }
            </ul>
          } @else if (b.t === 'note') {
            <p class="callout note">
              @for (s of rich(b.text); track $index) {
                <span [class.b]="s.b" [class.i]="s.i">{{ s.t }}</span>
              }
            </p>
          } @else if (b.t === 'warn') {
            <p class="callout warn">
              @for (s of rich(b.text); track $index) {
                <span [class.b]="s.b" [class.i]="s.i">{{ s.t }}</span>
              }
            </p>
          }
        }

        <nav class="row row-between pn" aria-label="Temas vecinos">
          @if (prev(); as p) {
            <button type="button" class="btn" (click)="open(p.id)">Anterior: {{ p.titulo }}</button>
          }
          @if (next(); as n) {
            <button type="button" class="btn" (click)="open(n.id)">Siguiente: {{ n.titulo }}</button>
          }
        </nav>
      </article>
    } @else {
      <div class="stack" style="--gap: 18px">
        <p class="muted">Explicaciones con tablas y ejemplos. Las tablas con el botón «Practicar» te preguntan celda a celda.</p>
        <div class="field">
          <label for="rq">Buscar en la referencia</label>
          <input id="rq" class="input" type="search" autocomplete="off" [value]="query()" (input)="onQuery($event)" placeholder="Dativ, Perfekt, weil…" />
        </div>
        @for (g of byGroup(); track g.grupo) {
          <section class="stack" style="--gap: 6px">
            <h2>{{ g.grupo }}</h2>
            <ul class="tlist">
              @for (t of g.items; track t.id) {
                <li>
                  <button type="button" class="titem" (click)="open(t.id)">
                    <span class="tt">{{ t.titulo }}</span>
                    <span class="muted small">{{ t.resumen }}</span>
                  </button>
                </li>
              }
            </ul>
          </section>
        } @empty {
          <p class="panel">No hay temas con esa búsqueda.</p>
        }
      </div>
    }
  `,
  styles: `
    .ttl {
      font-size: clamp(1.9rem, 6vw, 2.5rem);
    }
    .rt,
    .rl {
      max-width: 70ch;
      line-height: 1.55;
    }
    .rl {
      margin: 0;
      padding-left: 1.2em;
      display: grid;
      gap: 6px;
    }
    .b {
      font-weight: 700;
    }
    .i {
      font-style: italic;
    }
    .tlist {
      list-style: none;
      margin: 0;
      padding: 0;
      border-top: 2px solid var(--ink);
    }
    .titem {
      font: inherit;
      display: grid;
      gap: 2px;
      width: 100%;
      padding: 12px 6px;
      text-align: left;
      color: var(--text);
      background: transparent;
      border: 0;
      border-bottom: 1px solid var(--line);
      cursor: pointer;
    }
    .titem:hover {
      background: var(--ink-soft);
    }
    .tt {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: 1.35rem;
      color: var(--ink);
      line-height: 1.15;
    }
    .scroll {
      overflow-x: auto;
      border: 1.5px solid var(--line);
      border-radius: var(--radius);
      background: var(--card);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 420px;
    }
    th,
    td {
      padding: 8px 12px;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--line);
    }
    thead th {
      background: var(--ink);
      color: var(--ink-on);
      font-weight: 600;
      position: sticky;
      top: 0;
    }
    tbody th {
      font-weight: 600;
      white-space: nowrap;
    }
    tbody tr:last-child th,
    tbody tr:last-child td {
      border-bottom: 0;
    }
    .ex {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
    }
    .ex li {
      display: grid;
      padding-left: 12px;
      border-left: 4px solid var(--ink);
    }
    .ex .de {
      font-weight: 600;
      font-size: 1.12rem;
    }
    .callout {
      max-width: 70ch;
      padding: 10px 14px;
      border-left: 5px solid var(--mark);
      background: var(--ink-soft);
      line-height: 1.5;
    }
    .callout.warn {
      border-left-color: var(--red);
    }
    .pn .btn {
      text-align: left;
    }
  `,
})
export class Reference {
  private readonly route = inject(ActivatedRoute);

  protected readonly topicId = signal<string | null>(null);
  protected readonly query = signal('');
  protected readonly drillOpen = signal<number | null>(null);

  private readonly index = computed(
    () => new Map(TEMAS.map((t) => [t.id, searchFold(t.titulo + ' ' + t.resumen + ' ' + t.blocks.map(textOf).join(' '))])),
  );

  protected readonly byGroup = computed(() => {
    const q = searchFold(this.query().trim());
    const idx = this.index();
    const list = TEMAS.filter((t) => !q || idx.get(t.id)?.includes(q));
    return GRUPOS.map((grupo) => ({ grupo, items: list.filter((t) => t.grupo === grupo) })).filter((g) => g.items.length);
  });

  protected readonly current = computed<Topic | null>(() => TEMAS.find((t) => t.id === this.topicId()) ?? null);
  private readonly pos = computed(() => TEMAS.findIndex((t) => t.id === this.topicId()));
  protected readonly prev = computed(() => (this.pos() > 0 ? TEMAS[this.pos() - 1] : null));
  protected readonly next = computed(() => (this.pos() >= 0 && this.pos() < TEMAS.length - 1 ? TEMAS[this.pos() + 1] : null));

  constructor() {
    this.route.queryParamMap.subscribe((p) => {
      const t = p.get('t');
      if (t && TEMAS.some((x) => x.id === t)) this.open(t);
    });
  }

  protected open(id: string): void {
    this.topicId.set(id);
    this.drillOpen.set(null);
    window.scrollTo({ top: 0 });
  }
  protected close(): void {
    this.topicId.set(null);
    this.drillOpen.set(null);
  }
  protected onQuery(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
  }

  /** **negrita** y *cursiva* en los textos de la referencia. */
  protected rich(text: string): Seg[] {
    return text
      .split(/(\*\*[^*]+\*\*|\*[^*]+\*)/)
      .filter((s) => s !== '')
      .map((s) =>
        s.startsWith('**') ? { t: s.slice(2, -2), b: true, i: false } : s.startsWith('*') && s.length > 2 ? { t: s.slice(1, -1), b: false, i: true } : { t: s, b: false, i: false },
      );
  }

  /** Color del género: por columna (Masculino, Femenino, Neutro) o, en tablas de un solo sustantivo, de toda la tabla. */
  protected cellArt(b: Extract<Block, { t: 'table' }>, col: number): string | null {
    if (b.art) return b.art;
    return b.genus ? this.hdrArt(b.head[col] ?? '') : null;
  }

  protected hdrArt(h: string): string | null {
    return h.startsWith('Masc') ? 'der' : h.startsWith('Fem') ? 'die' : h.startsWith('Neutro') ? 'das' : null;
  }
}
