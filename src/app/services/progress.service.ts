import { Injectable, computed, effect, signal } from '@angular/core';
import { Progress } from '../models';

const KEY = 'karteikasten.progreso.v1';
const DAY = 24 * 60 * 60 * 1000;
/** Días hasta el próximo repaso según la caja (índice = caja). */
export const BOX_DAYS = [0, 1, 2, 4, 8, 21];

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private readonly store = signal<Record<number, Progress>>(this.read());
  readonly all = this.store.asReadonly();

  readonly studiedToday = computed(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return Object.values(this.store()).filter((p) => p.last >= start.getTime()).length;
  });

  constructor() {
    effect(() => {
      const value = this.store();
      try {
        localStorage.setItem(KEY, JSON.stringify(value));
      } catch {
        /* almacenamiento no disponible: se ignora */
      }
    });
  }

  /** Registra un acierto o un fallo y reprograma el repaso de la tarjeta. */
  grade(id: number, correct: boolean): void {
    const now = Date.now();
    const p = this.store()[id] ?? { box: 0, due: 0, seen: 0, ok: 0, ko: 0, last: 0 };
    const box = correct ? Math.min(5, p.box + 1) : 1;
    const due = correct ? now + BOX_DAYS[box] * DAY : now;
    this.store.update((s) => ({
      ...s,
      [id]: {
        box,
        due,
        seen: p.seen + 1,
        ok: p.ok + (correct ? 1 : 0),
        ko: p.ko + (correct ? 0 : 1),
        last: now,
      },
    }));
  }

  boxOf(id: number): number {
    return this.store()[id]?.box ?? 0;
  }

  isHard(id: number): boolean {
    const p = this.store()[id];
    return !!p && (p.box <= 1 || p.ko > p.ok);
  }

  reset(): void {
    this.store.set({});
  }

  exportJson(): string {
    return JSON.stringify({ app: 'karteikasten', version: 1, exportado: new Date().toISOString(), progreso: this.store() }, null, 1);
  }

  /** Devuelve cuántas tarjetas se importaron. Lanza un error si el archivo no es válido. */
  importJson(text: string): number {
    const data = JSON.parse(text);
    const src = data?.progreso;
    if (data?.app !== 'karteikasten' || typeof src !== 'object' || src === null) {
      throw new Error('formato');
    }
    const clean: Record<number, Progress> = {};
    for (const [key, v] of Object.entries<Progress>(src)) {
      const id = Number(key);
      if (Number.isFinite(id) && v && typeof v.box === 'number' && typeof v.due === 'number') {
        clean[id] = {
          box: Math.min(5, Math.max(1, Math.round(v.box))),
          due: v.due,
          seen: v.seen ?? 0,
          ok: v.ok ?? 0,
          ko: v.ko ?? 0,
          last: v.last ?? 0,
        };
      }
    }
    this.store.set(clean);
    return Object.keys(clean).length;
  }

  private read(): Record<number, Progress> {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
}
