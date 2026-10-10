import { Component, computed, inject, signal } from '@angular/core';
import { DeclRow } from '../models';
import { DataService } from '../services/data.service';
import { GermanWord } from '../shared/german-word';
import { Verdict, isCorrect, judgeGerman, searchFold, shuffle } from '../utils/text';

type Caso = 'akkusativ' | 'genitiv' | 'dativ';
interface Pregunta {
  fila: DeclRow;
  caso: Caso;
  objetivo: string;
}

const CASOS: { valor: Caso; texto: string }[] = [
  { valor: 'akkusativ', texto: 'Akkusativ' },
  { valor: 'genitiv', texto: 'Genitiv' },
  { valor: 'dativ', texto: 'Dativ' },
];

@Component({
  selector: 'app-deklination',
  imports: [GermanWord],
  template: `
    <div class="stack" style="--gap: 20px">
      <section class="panel stack" style="--gap: 14px" aria-labelledby="h-prac">
        <h2 id="h-prac">Practicar casos</h2>

        <div class="field">
          <span class="label" id="lbl-caso">Caso que quieres practicar</span>
          <div class="seg" role="group" aria-labelledby="lbl-caso">
            <button type="button" [class.on]="caso() === 'azar'" [attr.aria-pressed]="caso() === 'azar'" (click)="setCaso('azar')">Al azar</button>
            @for (c of casos; track c.valor) {
              <button type="button" [class.on]="caso() === c.valor" [attr.aria-pressed]="caso() === c.valor" (click)="setCaso(c.valor)">{{ c.texto }}</button>
            }
          </div>
        </div>

        @if (pregunta(); as q) {
          <div class="kk prompt">
            <p class="nom disp"><app-de [text]="q.fila.nominativ ?? ''" /></p>
            <p class="muted">Nominativ</p>
          </div>

          <div class="field">
            <label for="decl-resp">Escribe el <b>{{ nombreCaso(q.caso) }}</b></label>
            <input
              id="decl-resp"
              class="input resp"
              type="text"
              lang="de"
              [value]="respuesta()"
              [readOnly]="verdict() !== null"
              (input)="onInput($event)"
              (keydown.enter)="enter($event)"
              autocomplete="off"
              autocapitalize="off"
              autocorrect="off"
              spellcheck="false"
              enterkeyhint="done"
            />
          </div>

          @if (verdict() === null) {
            <div class="row">
              @for (ch of chars; track ch) {
                <button type="button" class="btn btn-icon" (click)="insert(ch)">{{ ch }}</button>
              }
            </div>
            <div class="row">
              <button type="button" class="btn btn-primary" (click)="comprobar()">Comprobar</button>
              <button type="button" class="btn btn-quiet" (click)="rendirse()">No lo sé</button>
            </div>
          } @else {
            <div class="stack" style="--gap: 8px" role="status">
              @switch (verdict()) {
                @case ('ok') {
                  <p class="good verdict">¡Correcto!</p>
                }
                @case ('typo') {
                  <p class="good verdict">Casi perfecto</p>
                }
                @case ('article') {
                  <p class="bad verdict">Fíjate en el artículo</p>
                }
                @default {
                  <p class="bad verdict">No coincide</p>
                }
              }
              <p class="disp solucion"><app-de [text]="q.objetivo" /></p>
              <button type="button" class="btn btn-primary" (click)="siguiente()">Siguiente</button>
            </div>
          }

          <p class="muted small">Aciertos: {{ aciertos() }} de {{ total() }}.</p>
        } @else {
          <p>No hay datos de declinación para practicar.</p>
        }
      </section>

      <section class="stack" style="--gap: 12px" aria-labelledby="h-tab">
        <h2 id="h-tab">Tabla de declinaciones</h2>
        <div class="field">
          <label for="decl-buscar">Buscar un sustantivo</label>
          <input id="decl-buscar" class="input" type="search" autocomplete="off" [value]="buscar()" (input)="onBuscar($event)" />
        </div>
        <div class="scroll" tabindex="0" role="region" aria-label="Tabla de declinaciones">
          <table>
            <thead>
              <tr>
                <th scope="col">Nominativ</th>
                <th scope="col">Akkusativ</th>
                <th scope="col">Genitiv</th>
                <th scope="col">Dativ</th>
              </tr>
            </thead>
            <tbody>
              @for (r of filas(); track r.id) {
                <tr>
                  <th scope="row"><app-de [text]="r.nominativ ?? ''" /></th>
                  <td>@if (r.akkusativ) { <app-de [text]="r.akkusativ" /> } @else { <span class="muted">sin dato</span> }</td>
                  <td>@if (r.genitiv) { <app-de [text]="r.genitiv" /> } @else { <span class="muted">sin dato</span> }</td>
                  <td>@if (r.dativ) { <app-de [text]="r.dativ" /> } @else { <span class="muted">sin dato</span> }</td>
                </tr>
              } @empty {
                <tr><td colspan="4">No hay sustantivos que coincidan.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: `
    .prompt {
      padding: 0 22px 18px;
      min-height: 150px;
    }
    .nom {
      padding-top: 74px;
      font-size: clamp(2.2rem, 9vw, 3.2rem);
      line-height: 1.05;
      overflow-wrap: anywhere;
    }
    .resp {
      font-size: 1.3rem;
    }
    .resp[readonly] {
      background: var(--ink-soft);
    }
    .verdict {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: 1.6rem;
      line-height: 1;
    }
    .solucion {
      font-size: 1.8rem;
      line-height: 1.1;
    }
    .btn-icon {
      font-size: 1.2rem;
    }
    .scroll {
      overflow-x: auto;
      border: 1.5px solid var(--line);
      border-radius: var(--radius);
      background: var(--card);
    }
    table {
      width: 100%;
      min-width: 560px;
      border-collapse: collapse;
    }
    th,
    td {
      padding: 9px 12px;
      text-align: left;
      border-bottom: 1px solid var(--line);
      white-space: nowrap;
    }
    thead th {
      position: sticky;
      top: 0;
      background: var(--ink);
      color: var(--ink-on);
      font-weight: 600;
    }
    tbody th {
      font-weight: 500;
    }
  `,
})
export class Deklination {
  private readonly data = inject(DataService);

  protected readonly casos = CASOS;
  protected readonly chars = ['ä', 'ö', 'ü', 'ß'];
  protected readonly caso = signal<Caso | 'azar'>('azar');
  protected readonly pregunta = signal<Pregunta | null>(null);
  protected readonly respuesta = signal('');
  protected readonly verdict = signal<Verdict | null>(null);
  protected readonly aciertos = signal(0);
  protected readonly total = signal(0);
  protected readonly buscar = signal('');

  protected readonly filas = computed(() => {
    const q = searchFold(this.buscar().trim());
    const filas = this.data.deklination();
    return q ? filas.filter((r) => searchFold(r.nominativ ?? '').includes(q)) : filas;
  });

  constructor() {
    this.nueva();
  }

  protected setCaso(c: Caso | 'azar'): void {
    this.caso.set(c);
    this.nueva();
  }

  protected nombreCaso(c: Caso): string {
    return CASOS.find((x) => x.valor === c)?.texto ?? c;
  }

  private nueva(): void {
    const elegido = this.caso();
    const opciones: Pregunta[] = [];
    for (const fila of this.data.deklination()) {
      if (!fila.nominativ) continue;
      for (const c of CASOS) {
        const objetivo = fila[c.valor];
        if (objetivo && (elegido === 'azar' || elegido === c.valor)) opciones.push({ fila, caso: c.valor, objetivo });
      }
    }
    this.pregunta.set(opciones.length ? shuffle(opciones)[0] : null);
    this.respuesta.set('');
    this.verdict.set(null);
  }

  protected onInput(e: Event): void {
    this.respuesta.set((e.target as HTMLInputElement).value);
  }

  protected onBuscar(e: Event): void {
    this.buscar.set((e.target as HTMLInputElement).value);
  }

  protected insert(ch: string): void {
    this.respuesta.update((v) => v + ch);
  }

  protected enter(e: Event): void {
    e.preventDefault();
    if (this.verdict() === null) this.comprobar();
    else this.siguiente();
  }

  protected comprobar(): void {
    const q = this.pregunta();
    if (!q || this.verdict() !== null || !this.respuesta().trim()) return;
    const v = judgeGerman(this.respuesta(), q.objetivo, true);
    this.verdict.set(v);
    this.total.update((n) => n + 1);
    if (isCorrect(v)) this.aciertos.update((n) => n + 1);
  }

  protected rendirse(): void {
    if (this.verdict() !== null) return;
    this.verdict.set('ko');
    this.total.update((n) => n + 1);
  }

  protected siguiente(): void {
    this.nueva();
  }
}
