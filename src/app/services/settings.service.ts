import { Injectable, effect, signal } from '@angular/core';
import { Settings } from '../models';

const KEY = 'karteikasten.ajustes.v1';

export const DEFAULT_SETTINGS: Settings = {
  lang: 'espanol',
  direction: 'mix',
  estado: 'recomendado',
  tipos: [],
  fuente: 'todas',
  sessionSize: 20,
  autoSpeak: false,
  includeReview: true,
  theme: 'auto',
  leccion: 'todas',
  tema: 'todos',
  subtipo: 'todos',
  categoria: 'todas',
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly state = signal<Settings>(this.load());

  constructor() {
    effect(() => {
      const value = this.state();
      try {
        localStorage.setItem(KEY, JSON.stringify(value));
      } catch {
        /* almacenamiento no disponible: se ignora */
      }
    });
  }

  patch(partial: Partial<Settings>): void {
    this.state.update((s) => ({ ...s, ...partial }));
  }

  private load(): Settings {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
}
