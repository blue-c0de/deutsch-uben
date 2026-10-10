import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DirectionMode, Theme } from '../models';
import { ProgressService } from '../services/progress.service';
import { SettingsService } from '../services/settings.service';
import { SpeechService } from '../services/speech.service';
import { StudyService } from '../services/study.service';
import { FiltersComponent } from '../shared/filters';
import { LANG_NAME } from '../utils/text';

const CAJAS = [
  { nombre: 'Neu', nota: 'sin ver', borde: 'var(--line)' },
  { nombre: 'Fach 1', nota: 'cada día', borde: 'var(--red)' },
  { nombre: 'Fach 2', nota: 'cada 2 días', borde: 'var(--ink)' },
  { nombre: 'Fach 3', nota: 'cada 4 días', borde: 'var(--ink)' },
  { nombre: 'Fach 4', nota: 'cada 8 días', borde: 'var(--ink)' },
  { nombre: 'Fach 5', nota: 'cada 21 días', borde: 'var(--ok)' },
];

@Component({
  selector: 'app-home',
  imports: [RouterLink, FiltersComponent],
  template: `
    <div class="stack" style="--gap: 26px">
      <section class="stack" style="--gap: 12px">
        <h1>{{ headline() }}</h1>
        <p class="lead">{{ summary() }}</p>
        <div class="actions">
          <a class="btn btn-primary btn-main" routerLink="/tarjetas">Estudiar con tarjetas</a>
          <a class="btn" routerLink="/test">Hacer un test</a>
          <a class="btn" routerLink="/escribir">Escribir respuestas</a>
          <a class="btn" routerLink="/articulos">Artículos der, die, das</a>
          <a class="btn" routerLink="/juegos">Elegir juego y material</a>
          <a class="btn" routerLink="/verbos">Conjugar verbos</a>
          <a class="btn" routerLink="/gramatica">Gramática</a>
        </div>
      </section>

      <section class="stack" style="--gap: 10px" aria-labelledby="h-cajas">
        <h2 id="h-cajas" class="sr-only">Tus cajas de fichas</h2>
        <div class="box">
          @for (b of cajas(); track b.i) {
            <div class="col" [style.--i]="b.i" [style.--edge]="b.borde">
              <div class="pile" [style.height.px]="b.alto" aria-hidden="true"></div>
              <b class="n disp">{{ b.n }}</b>
              <span class="nm">{{ b.nombre }}</span>
              <span class="cap">{{ b.nota }}</span>
            </div>
          }
        </div>
        <p class="muted small">
          Cada acierto sube la ficha una caja y espacia su próximo repaso. Un fallo la devuelve al Fach 1.
        </p>
      </section>

      <section class="panel stack" style="--gap: 18px" aria-labelledby="h-modo">
        <h2 id="h-modo">Cómo quieres estudiar</h2>

        <div class="field">
          <span class="label" id="lbl-dir">Dirección</span>
          <div class="seg" role="group" aria-labelledby="lbl-dir">
            @for (d of direcciones(); track d.valor) {
              <button type="button" [class.on]="s().direction === d.valor" [attr.aria-pressed]="s().direction === d.valor" (click)="setDir(d.valor)">
                {{ d.texto }}
              </button>
            }
          </div>
        </div>

        <div class="field">
          <span class="label" id="lbl-tema">Aspecto</span>
          <div class="seg" role="group" aria-labelledby="lbl-tema">
            @for (t of temas; track t.valor) {
              <button type="button" [class.on]="s().theme === t.valor" [attr.aria-pressed]="s().theme === t.valor" (click)="setTheme(t.valor)">
                {{ t.texto }}
              </button>
            }
          </div>
        </div>

        @if (speech.supported) {
          <label class="check">
            <input type="checkbox" [checked]="s().autoSpeak" (change)="setSpeak($event)" />
            <span>Pronunciar en voz alta las palabras alemanas</span>
          </label>
        }
      </section>

      <app-filters />

      <section class="panel stack" style="--gap: 12px" aria-labelledby="h-prog">
        <h2 id="h-prog">Tu progreso</h2>
        <p>
          Hoy has practicado {{ progress.studiedToday() }}
          {{ progress.studiedToday() === 1 ? 'ficha' : 'fichas' }}. Tu progreso se guarda solo en este dispositivo.
          Para seguir en otro, exporta una copia aquí e impórtala allí.
        </p>
        <div class="row">
          <button type="button" class="btn" (click)="exportar()">Exportar progreso</button>
          <button type="button" class="btn" (click)="file.click()">Importar progreso</button>
          <button type="button" class="btn btn-bad" (click)="reiniciar()">Reiniciar</button>
          <input #file type="file" accept="application/json,.json" class="sr-only" tabindex="-1" (change)="importar($event)" />
        </div>
        @if (msg()) {
          <p role="status" class="msg">{{ msg() }}</p>
        }
      </section>
    </div>
  `,
  styles: `
    .lead {
      font-size: 1.2rem;
      max-width: 34ch;
    }
    .actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      max-width: 460px;
    }
    .btn-main {
      grid-column: 1 / -1;
      min-height: 54px;
      font-size: 1.15rem;
    }
    .box {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      align-items: end;
      gap: 6px;
      padding: 18px 10px 12px;
      background: var(--card);
      border: 2px solid var(--ink);
      border-radius: var(--radius);
    }
    .col {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 0;
      text-align: center;
    }
    .pile {
      width: 100%;
      max-width: 62px;
      margin-bottom: 8px;
      border: 1.5px solid var(--edge);
      border-radius: 2px;
      background: repeating-linear-gradient(to top, var(--card) 0 5px, var(--edge) 5px 6px);
      transform-origin: bottom;
      animation: rise 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both;
      animation-delay: calc(var(--i) * 80ms);
    }
    .n {
      font-size: 1.9rem;
      line-height: 1;
      color: var(--text);
    }
    .nm {
      font-weight: 600;
      font-size: 0.92rem;
      line-height: 1.2;
      margin-top: 2px;
    }
    .cap {
      font-size: 0.74rem;
      line-height: 1.2;
      min-height: 2.4em;
      color: var(--text-2);
    }
    @keyframes rise {
      from {
        transform: scaleY(0.05);
      }
    }
    .msg {
      padding: 8px 12px;
      border-left: 4px solid var(--mark);
      background: var(--ink-soft);
    }
  `,
})
export class Home {
  protected readonly study = inject(StudyService);
  protected readonly settings = inject(SettingsService);
  protected readonly progress = inject(ProgressService);
  protected readonly speech = inject(SpeechService);
  protected readonly s = this.settings.state;
  protected readonly msg = signal<string | null>(null);

  protected readonly temas: { valor: Theme; texto: string }[] = [
    { valor: 'auto', texto: 'Automático' },
    { valor: 'claro', texto: 'Cuaderno' },
    { valor: 'oscuro', texto: 'Pizarra' },
  ];

  protected readonly direcciones = computed<{ valor: DirectionMode; texto: string }[]>(() => {
    const t = LANG_NAME[this.s().lang];
    return [
      { valor: 'de-tr', texto: `Alemán a ${t.toLowerCase()}` },
      { valor: 'tr-de', texto: `${t} a alemán` },
      { valor: 'mix', texto: 'Mezclado' },
    ];
  });

  protected readonly cajas = computed(() => {
    const st = this.study.stats();
    const max = Math.max(1, ...st.boxes);
    return CAJAS.map((c, i) => ({
      ...c,
      i,
      n: st.boxes[i],
      alto: st.boxes[i] === 0 ? 4 : Math.round(16 + 120 * Math.sqrt(st.boxes[i] / max)),
      borde: c.borde,
    }));
  });

  protected readonly headline = computed(() => {
    const st = this.study.stats();
    if (st.total === 0) return 'Sin fichas';
    return st.due + st.nuevas > 0 ? 'Fichas de hoy' : 'Todo al día';
  });

  protected readonly summary = computed(() => {
    const st = this.study.stats();
    if (st.total === 0) return 'Con los filtros actuales no hay fichas. Cámbialos en «Qué estudiar».';
    if (st.due === 0 && st.nuevas === 0) return 'No tienes repasos pendientes. Puedes practicar igualmente.';
    const repasos = st.due === 1 ? '1 ficha para repasar' : `${st.due} fichas para repasar`;
    const nuevas = st.nuevas === 1 ? '1 nueva' : `${st.nuevas} nuevas`;
    return `${repasos} y ${nuevas}.`;
  });

  protected setDir(direction: DirectionMode): void {
    this.settings.patch({ direction });
  }
  protected setTheme(theme: Theme): void {
    this.settings.patch({ theme });
  }
  protected setSpeak(e: Event): void {
    this.settings.patch({ autoSpeak: (e.target as HTMLInputElement).checked });
  }

  protected exportar(): void {
    const blob = new Blob([this.progress.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `karteikasten-progreso-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.msg.set('Copia de progreso descargada.');
  }

  protected importar(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    file.text().then((text) => {
      try {
        const n = this.progress.importJson(text);
        this.msg.set(`Se importó el progreso de ${n} fichas.`);
      } catch {
        this.msg.set('Ese archivo no es una copia de progreso de Karteikasten.');
      }
      input.value = '';
    });
  }

  protected reiniciar(): void {
    if (confirm('¿Borrar todo el progreso de este dispositivo? No se puede deshacer.')) {
      this.progress.reset();
      this.msg.set('Progreso reiniciado.');
    }
  }
}
