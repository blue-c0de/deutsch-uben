import { Component, input } from '@angular/core';
import type { Part } from '../utils/conjugation';

/** Muestra una forma verbal con colores: verbo conjugado, auxiliar, reflexivo y prefijo separable. */
@Component({
  selector: 'app-conj-text',
  template: `@for (p of parts(); track $index) {<span class="p" [attr.data-k]="p.k">{{ p.t }} </span>}`,
  styles: `
    .p {
      margin-right: 0.12em;
    }
    .p[data-k='v'],
    .p[data-k='a'] {
      color: var(--ink);
      font-weight: 700;
    }
    .p[data-k='r'] {
      color: var(--text-2);
      font-style: italic;
    }
    .p[data-k='p'] {
      color: var(--red);
      font-weight: 700;
    }
    .p[data-k='n'] {
      font-weight: 500;
    }
  `,
})
export class ConjText {
  readonly parts = input.required<Part[]>();
}
