import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { Lang } from './models';
import { DataService } from './services/data.service';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="top">
      <a class="brand" routerLink="/" aria-label="Karteikasten, ir al inicio">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="3" y="9" width="26" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="2.4" />
          <path d="M6 9l2.5-5h15L26 9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" />
          <rect x="11" y="15" width="10" height="4" rx="1" fill="var(--red)" />
        </svg>
        <span class="disp">Karteikasten</span>
      </a>

      <nav class="tabs" aria-label="Secciones">
        <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">
          <span class="ic">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18v11H3z" /><path d="M3 9l2-5h14l2 5" /><path d="M9 13h6" /></svg>
          </span>
          <span>Inicio</span>
        </a>
        <a routerLink="/tarjetas" routerLinkActive="on">
          <span class="ic">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="14" height="11" rx="1.5" /><path d="M7 4h14v11" /></svg>
          </span>
          <span>Tarjetas</span>
        </a>
        <a routerLink="/juegos" [class.on]="practiceActive()">
          <span class="ic">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6l2 2 3-3" /><path d="M12 7h8" /><path d="M4 15l2 2 3-3" /><path d="M12 16h8" /></svg>
          </span>
          <span>Juegos</span>
        </a>
        <a routerLink="/palabras" routerLinkActive="on">
          <span class="ic">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3z" /><path d="M5 17a3 3 0 013-3h10" /></svg>
          </span>
          <span>Palabras</span>
        </a>
        <a routerLink="/verbos" routerLinkActive="on">
          <span class="ic">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14" /><path d="M5 12h14" /><path d="M5 18h9" /><path d="M17 16l2 2 3-4" /></svg>
          </span>
          <span>Verbos</span>
        </a>
        <a routerLink="/gramatica" routerLinkActive="on">
          <span class="ic">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 10h18M9 4v16" /></svg>
          </span>
          <span>Gramática</span>
        </a>
      </nav>

      <div class="seg seg-sm" role="group" aria-label="Idioma de las traducciones">
        <button type="button" [class.on]="lang() === 'espanol'" [attr.aria-pressed]="lang() === 'espanol'" (click)="setLang('espanol')" aria-label="Traducciones en español">ES</button>
        <button type="button" [class.on]="lang() === 'ingles'" [attr.aria-pressed]="lang() === 'ingles'" (click)="setLang('ingles')" aria-label="Traducciones en inglés">EN</button>
      </div>
    </header>

    <main class="page">
      @switch (data.status()) {
        @case ('listo') {
          <router-outlet />
        }
        @case ('error') {
          <section class="panel stack">
            <h2>No se pudo cargar el vocabulario</h2>
            <p>Comprueba tu conexión e inténtalo de nuevo.</p>
            <button type="button" class="btn btn-primary" (click)="data.cargar()">Reintentar</button>
          </section>
        }
        @default {
          <p class="muted" role="status">Cargando tus fichas…</p>
        }
      }
    </main>
  `,
  styles: `
    .top {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 18px;
      background: var(--paper);
      border-bottom: 2px solid var(--ink);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--ink);
      text-decoration: none;
      font-size: 1.85rem;
      line-height: 1;
    }
    .brand svg {
      width: 30px;
      height: 30px;
    }
    .brand {
      flex: none;
    }
    .seg {
      flex: none;
    }

    .tabs {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 30;
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      background: var(--card);
      border-top: 2px solid var(--ink);
      padding-bottom: env(safe-area-inset-bottom);
    }
    .tabs a {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 8px 2px 7px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--text-2);
      text-decoration: none;
    }
    .tabs .ic {
      display: grid;
      place-items: center;
      padding: 3px 14px;
      border-radius: 4px;
    }
    .tabs svg {
      width: 24px;
      height: 24px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .tabs a.on {
      color: var(--text);
    }
    .tabs a.on .ic {
      background: var(--mark);
      color: var(--mark-on);
    }

    @media (min-width: 820px) {
      .top {
        padding-inline: max(18px, calc((100vw - 900px) / 2 + 18px));
      }
      .tabs {
        position: static;
        display: flex;
        gap: 2px;
        background: none;
        border: 0;
        padding: 0;
      }
      .tabs a {
        flex-direction: row;
        gap: 6px;
        padding: 6px 8px;
        font-size: 1rem;
        border-radius: 4px;
      }
      .tabs .ic {
        padding: 0;
      }
      .tabs svg {
        width: 20px;
        height: 20px;
      }
      .tabs a.on {
        background: var(--mark);
        color: var(--mark-on);
      }
      .tabs a.on .ic {
        background: none;
      }
    }
  `,
})
export class App {
  protected readonly data = inject(DataService);
  private readonly settings = inject(SettingsService);
  protected readonly lang = () => this.settings.state().lang;

  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  /** «Juegos» agrupa Test, Escribir y Artículos. */
  protected readonly practiceActive = computed(() => ['/juegos', '/test', '/escribir', '/articulos', '/frases'].some((r) => this.url().startsWith(r)));

  constructor() {
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.settings.state().theme);
    });
  }

  protected setLang(lang: Lang): void {
    this.settings.patch({ lang });
  }
}
