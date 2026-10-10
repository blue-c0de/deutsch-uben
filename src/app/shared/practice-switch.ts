import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SettingsService } from '../services/settings.service';

/** Selector de juegos y recordatorio de la fuente activa. */
@Component({
  selector: 'app-practice-switch',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="top">
      <nav class="seg seg-sm seg-scroll" aria-label="Juegos">
        <a routerLink="/juegos" routerLinkActive="on" class="b">Todos</a>
        <a routerLink="/test" routerLinkActive="on" class="b">Test</a>
        <a routerLink="/escribir" routerLinkActive="on" class="b">Escribir</a>
        <a routerLink="/articulos" routerLinkActive="on" class="b">Artículos</a>
        <a routerLink="/frases" routerLinkActive="on" class="b">Frases</a>
      </nav>
      <p class="muted small src">
        Material: <b>{{ fuente() }}</b>.
        <a routerLink="/juegos">Cambiar</a>
      </p>
    </div>
  `,
  styles: `
    .top {
      display: grid;
      gap: 6px;
      margin-bottom: 14px;
    }
    .b {
      font-weight: 600;
      padding: 0.25em 0.9em;
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
    .src {
      margin: 0;
    }
  `,
})
export class PracticeSwitch {
  private readonly settings = inject(SettingsService);
  protected readonly fuente = computed(() => {
    const s = this.settings.state();
    const partes: string[] = [];
    if (s.fuente === 'todas') partes.push('todo el vocabulario');
    else if (s.leccion === 'todas') partes.push(s.fuente);
    else {
      const [m, p] = s.leccion.split('-');
      partes.push(`${s.fuente}, módulo ${m}, página ${p}`);
    }
    if (s.tema !== 'todos') partes.push(`tema ${s.tema}`);
    if (s.subtipo !== 'todos') partes.push(s.subtipo);
    if (s.categoria !== 'todas') partes.push(`categoría ${s.categoria}`);
    return partes.join(', ');
  });
}
