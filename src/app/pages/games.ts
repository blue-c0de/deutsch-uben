import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsService } from '../services/settings.service';
import { StudyService } from '../services/study.service';

@Component({
  selector: 'app-games',
  imports: [RouterLink],
  template: `
    <div class="stack" style="--gap: 22px">
      <h1>Juegos</h1>

      <section class="panel stack" style="--gap: 14px" aria-labelledby="h-fuente">
        <h2 id="h-fuente">¿Con qué material quieres jugar?</h2>
        <div class="srcs" role="group" aria-label="Fuente del vocabulario">
          <button type="button" class="src" [class.on]="s().fuente === 'todas'" [attr.aria-pressed]="s().fuente === 'todas'" (click)="setFuente('todas')">
            <span>Todo el vocabulario</span><b>{{ total() }}</b>
          </button>
          @for (f of study.fuenteCounts(); track f.fuente) {
            <button type="button" class="src" [class.on]="s().fuente === f.fuente" [attr.aria-pressed]="s().fuente === f.fuente" (click)="setFuente(f.fuente)">
              <span>{{ f.fuente }}</span><b>{{ f.n }}</b>
            </button>
          }
        </div>

        @if (s().fuente === 'Kursbuch' && study.lecciones().length) {
          <div class="field">
            <label for="g-leccion">Lección del Kursbuch</label>
            <select id="g-leccion" class="input" (change)="setLeccion($event)">
              <option value="todas" [selected]="s().leccion === 'todas'">Todo el Kursbuch</option>
              @for (l of study.lecciones(); track l.id) {
                <option [value]="l.id" [selected]="s().leccion === l.id">{{ l.label }}</option>
              }
            </select>
          </div>
        }
        <p class="muted" role="status">{{ study.stats().total }} fichas seleccionadas. Los tipos de palabra y otros filtros se cambian en «Qué estudiar», en el inicio.</p>
      </section>

      <ul class="games">
        @for (g of games; track g.ruta) {
          <li>
            <a class="game" [routerLink]="g.ruta">
              <span class="gt">{{ g.titulo }}</span>
              <span class="muted">{{ g.texto }}</span>
            </a>
          </li>
        }
      </ul>
      <p class="muted small">La fuente elegida se usa en todos los juegos. En «Conjugación», solo cuenta para tus verbos.</p>
    </div>
  `,
  styles: `
    .srcs {
      display: grid;
      gap: 8px;
    }
    .src {
      font: inherit;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      min-height: 52px;
      padding: 8px 14px;
      text-align: left;
      font-weight: 600;
      color: var(--ink);
      background: var(--card);
      border: 2px solid var(--ink);
      border-radius: var(--radius);
      cursor: pointer;
    }
    .src b {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-size: 1.4rem;
    }
    .src.on {
      background: var(--mark);
      color: var(--mark-on);
    }
    .games {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 10px;
    }
    .game {
      display: grid;
      gap: 2px;
      padding: 14px 16px;
      color: var(--text);
      text-decoration: none;
      background: var(--card);
      border: 2px solid var(--ink);
      border-radius: var(--radius);
    }
    .game:hover {
      background: var(--ink-soft);
    }
    .gt {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: 1.6rem;
      line-height: 1.1;
      color: var(--ink);
    }
  `,
})
export class Games {
  protected readonly study = inject(StudyService);
  private readonly settings = inject(SettingsService);
  protected readonly s = this.settings.state;
  protected readonly total = computed(() => this.study.fuenteCounts().reduce((n, f) => n + f.n, 0));

  protected readonly games = [
    { ruta: '/tarjetas', titulo: 'Tarjetas', texto: 'Voltea la ficha y repasa con cajas de repaso espaciado.' },
    { ruta: '/test', titulo: 'Test', texto: 'Elige la respuesta correcta entre cuatro opciones.' },
    { ruta: '/escribir', titulo: 'Escribir', texto: 'Escribe la palabra o la traducción.' },
    { ruta: '/articulos', titulo: 'Artículos', texto: 'Adivina si el sustantivo lleva der, die o das.' },
    { ruta: '/frases', titulo: 'Frases', texto: 'Memoriza las expresiones: huecos, ordenar, de memoria, dictado y función.' },
    { ruta: '/verbos', titulo: 'Conjugación', texto: 'Conjuga verbos en cualquier tiempo (pestaña «Practicar»).' },
  ];

  protected setFuente(f: string): void {
    this.settings.patch({ fuente: f, leccion: 'todas' });
  }
  protected setLeccion(e: Event): void {
    this.settings.patch({ leccion: (e.target as HTMLSelectElement).value });
  }
}
