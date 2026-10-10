import { Component, inject } from '@angular/core';
import { Estado } from '../models';
import { SettingsService } from '../services/settings.service';
import { StudyService } from '../services/study.service';
import { TIPO_LABEL } from '../utils/text';

@Component({
  selector: 'app-filters',
  template: `
    <details class="panel filters">
      <summary>
        <span class="head">
          <span class="disp title">Qué estudiar</span>
          <span class="muted small">{{ study.stats().total }} fichas seleccionadas</span>
        </span>
      </summary>

      <div class="body stack" style="--gap: 18px">
        <div class="field">
          <span class="label" id="lbl-tipos">Tipo de palabra</span>
          <div class="row" role="group" aria-labelledby="lbl-tipos">
            @for (t of study.tipos(); track t) {
              <button type="button" class="chip" [class.on]="isOn(t)" [attr.aria-pressed]="isOn(t)" (click)="toggle(t)">
                {{ label(t) }}
              </button>
            }
          </div>
          <span class="muted small">Si no eliges ninguno, se usan todos.</span>
        </div>

        <div class="field">
          <label for="f-fuente">Fuente</label>
          <select id="f-fuente" class="input" (change)="settings.patch({ fuente: val($event) })">
            <option value="todas" [selected]="s().fuente === 'todas'">Todas</option>
            @for (f of study.fuentes(); track f) {
              <option [value]="f" [selected]="s().fuente === f">{{ f }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="f-estado">Qué fichas salen primero</label>
          <select id="f-estado" class="input" (change)="settings.patch({ estado: asEstado($event) })">
            <option value="recomendado" [selected]="s().estado === 'recomendado'">Recomendado: repasos pendientes y nuevas</option>
            <option value="todas" [selected]="s().estado === 'todas'">Todas, al azar</option>
            <option value="nuevas" [selected]="s().estado === 'nuevas'">Solo nuevas</option>
            <option value="dificiles" [selected]="s().estado === 'dificiles'">Solo las difíciles</option>
          </select>
        </div>

        <div class="field">
          <label for="f-size">Fichas por sesión</label>
          <select id="f-size" class="input" (change)="settings.patch({ sessionSize: num($event) })">
            @for (n of sizes; track n) {
              <option [value]="n" [selected]="s().sessionSize === n">{{ n }}</option>
            }
          </select>
        </div>

        <label class="check">
          <input type="checkbox" [checked]="s().includeReview" (change)="settings.patch({ includeReview: checked($event) })" />
          <span>Incluir fichas marcadas para revisar</span>
        </label>
      </div>
    </details>
  `,
  styles: `
    summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      cursor: pointer;
      list-style: none;
    }
    .head {
      display: grid;
      gap: 2px;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary .title {
      font-size: 1.5rem;
      color: var(--ink);
    }
    summary::after {
      content: '+';
      font-weight: 700;
      font-size: 1.5rem;
      color: var(--ink);
      line-height: 1;
    }
    details[open] summary::after {
      content: '–';
    }
    .body {
      margin-top: 18px;
    }
  `,
})
export class FiltersComponent {
  protected readonly study = inject(StudyService);
  protected readonly settings = inject(SettingsService);
  protected readonly s = this.settings.state;
  protected readonly sizes = [10, 20, 30, 50];

  protected label(t: string): string {
    return TIPO_LABEL[t] ?? t;
  }
  protected isOn(t: string): boolean {
    return this.s().tipos.includes(t);
  }
  protected toggle(t: string): void {
    const cur = this.s().tipos;
    this.settings.patch({ tipos: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t] });
  }
  protected val(e: Event): string {
    return (e.target as HTMLSelectElement).value;
  }
  protected num(e: Event): number {
    return Number(this.val(e));
  }
  protected asEstado(e: Event): Estado {
    return this.val(e) as Estado;
  }
  protected checked(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }
}
