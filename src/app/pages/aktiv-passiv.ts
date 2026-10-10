import { Component, computed, inject, signal } from '@angular/core';
import { AktivPassivRow } from '../models';
import { DataService } from '../services/data.service';

interface Grupo {
  clave: string;
  modo: string;
  tiempo: string;
  tipoVerbo: string;
  aktiv: AktivPassivRow | null;
  passiv: AktivPassivRow | null;
}

@Component({
  selector: 'app-aktiv-passiv',
  template: `
    <div class="stack" style="--gap: 16px">
      <p class="muted">Cómo se pasa una frase de activa a pasiva en cada tiempo y modo.</p>

      <div class="row filtros">
        <div class="field">
          <label for="ap-modo">Modo</label>
          <select id="ap-modo" class="input" (change)="modo.set(val($event))">
            <option value="todos">Todos</option>
            @for (m of modos(); track m) {
              <option [value]="m">{{ m }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="ap-mv">Verbo modal</label>
          <select id="ap-mv" class="input" (change)="modal.set(val($event))">
            <option value="todos">Con y sin</option>
            @for (t of tiposVerbo(); track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </div>
      </div>

      <div class="grupos">
        @for (g of grupos(); track g.clave) {
          <section class="grupo" [attr.aria-label]="g.modo + ', ' + g.tiempo + ', ' + g.tipoVerbo">
            <header class="row">
              <h3>{{ g.tiempo }}</h3>
              <span class="chip">{{ g.modo }}</span>
              <span class="chip">{{ g.tipoVerbo }}</span>
            </header>
            @for (fila of [g.aktiv, g.passiv]; track $index) {
              @if (fila) {
                <div class="voz" [attr.data-voz]="fila.voz">
                  <span class="etq">{{ fila.voz }}</span>
                  <div class="txt">
                    @if (fila.ejemplo_aleman) {
                      <p class="ej">{{ fila.ejemplo_aleman }}</p>
                    }
                    @if (fila.ejemplo_espanol) {
                      <p class="muted es">{{ fila.ejemplo_espanol }}</p>
                    }
                    <p class="muted small est">{{ fila.estructura }}</p>
                  </div>
                </div>
              }
            }
          </section>
        } @empty {
          <p class="panel">No hay filas con ese filtro.</p>
        }
      </div>
    </div>
  `,
  styles: `
    .filtros .field {
      flex: 1 1 200px;
    }
    .grupo {
      padding: 14px 0 16px;
      border-top: 2px solid var(--ink);
    }
    .grupo header {
      margin-bottom: 8px;
    }
    .voz {
      display: grid;
      grid-template-columns: 62px 1fr;
      gap: 10px;
      padding: 8px 0;
    }
    .etq {
      align-self: start;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 2px 8px;
      text-align: center;
      border-radius: 4px;
      border: 1.5px solid var(--ink);
      color: var(--ink);
    }
    .voz[data-voz='Passiv'] .etq {
      background: var(--mark);
      color: var(--mark-on);
      border-color: var(--mark-on);
    }
    .ej {
      font-weight: 600;
      font-size: 1.15rem;
      overflow-wrap: anywhere;
    }
    .es {
      font-style: italic;
    }
    .est {
      margin-top: 2px;
    }
  `,
})
export class AktivPassiv {
  private readonly data = inject(DataService);
  protected readonly modo = signal('todos');
  protected readonly modal = signal('todos');

  protected readonly modos = computed(() => [...new Set(this.data.aktivPassiv().map((r) => r.modo ?? ''))].filter(Boolean));
  protected readonly tiposVerbo = computed(() => [...new Set(this.data.aktivPassiv().map((r) => r.tipo_verbo ?? ''))].filter(Boolean));

  protected readonly grupos = computed<Grupo[]>(() => {
    const mapa = new Map<string, Grupo>();
    for (const r of this.data.aktivPassiv()) {
      const modo = r.modo ?? '';
      const tiempo = r.tiempo ?? '';
      const tipoVerbo = r.tipo_verbo ?? '';
      if (this.modo() !== 'todos' && modo !== this.modo()) continue;
      if (this.modal() !== 'todos' && tipoVerbo !== this.modal()) continue;
      const clave = `${modo}|${tiempo}|${tipoVerbo}`;
      const g = mapa.get(clave) ?? { clave, modo, tiempo, tipoVerbo, aktiv: null, passiv: null };
      if (r.voz === 'Aktiv') g.aktiv = r;
      else g.passiv = r;
      mapa.set(clave, g);
    }
    return [...mapa.values()];
  });

  protected val(e: Event): string {
    return (e.target as HTMLSelectElement).value;
  }
}
