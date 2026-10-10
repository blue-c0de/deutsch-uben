import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Pequeño selector para pasar de Test a Escribir (las dos formas de practicar). */
@Component({
  selector: 'app-practice-switch',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="seg seg-sm sw" aria-label="Modo de práctica">
      <a routerLink="/test" routerLinkActive="on" class="b">Test</a>
      <a routerLink="/escribir" routerLinkActive="on" class="b">Escribir</a>
    </nav>
  `,
  styles: `
    .sw {
      margin-bottom: 14px;
    }
    .b {
      font-weight: 600;
      padding: 0.25em 1em;
      min-height: 36px;
      display: inline-flex;
      align-items: center;
      color: var(--ink);
      text-decoration: none;
    }
    .b + .b {
      border-left: 2px solid var(--ink);
    }
    .b.on {
      background: var(--mark);
      color: var(--mark-on);
    }
  `,
})
export class PracticeSwitch {}
