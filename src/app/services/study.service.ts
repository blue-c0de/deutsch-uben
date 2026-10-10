import { Injectable, computed, inject } from '@angular/core';
import { Card, Direction, Estado } from '../models';
import { shuffle } from '../utils/text';
import { DataService } from './data.service';
import { ProgressService } from './progress.service';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class StudyService {
  private readonly data = inject(DataService);
  readonly progress = inject(ProgressService);
  readonly settings = inject(SettingsService);

  readonly tipos = computed(() => [...new Set(this.data.cards().map((c) => c.tipo))]);
  readonly fuentes = computed(() => [...new Set(this.data.cards().map((c) => c.fuente))]);

  /** Tarjetas que cumplen los filtros elegidos. */
  readonly pool = computed(() => {
    const s = this.settings.state();
    return this.data.cards().filter(
      (c) =>
        (s.tipos.length === 0 || s.tipos.includes(c.tipo)) &&
        (s.fuente === 'todas' || c.fuente === s.fuente) &&
        (s.includeReview || !c.revisar),
    );
  });

  /** Reparto de las tarjetas filtradas por caja (0 = nuevas) y repasos pendientes. */
  readonly stats = computed(() => {
    const p = this.progress.all();
    const now = Date.now();
    const boxes = [0, 0, 0, 0, 0, 0];
    let due = 0;
    for (const c of this.pool()) {
      const x = p[c.id];
      if (!x) {
        boxes[0]++;
      } else {
        boxes[x.box]++;
        if (x.due <= now) due++;
      }
    }
    return { total: this.pool().length, boxes, due, nuevas: boxes[0] };
  });

  buildSession(size: number, estado: Estado = this.settings.state().estado, from?: Card[]): Card[] {
    const pool = from ?? this.pool();
    const p = this.progress.all();
    const now = Date.now();
    const seen = pool.filter((c) => p[c.id]);
    const fresh = pool.filter((c) => !p[c.id]);
    let list: Card[];
    switch (estado) {
      case 'todas':
        list = shuffle(pool);
        break;
      case 'nuevas':
        list = shuffle(fresh);
        break;
      case 'dificiles':
        list = shuffle(seen.filter((c) => this.progress.isHard(c.id)));
        break;
      default: {
        const byDue = (a: Card, b: Card) => p[a.id].due - p[b.id].due;
        const due = seen.filter((c) => p[c.id].due <= now).sort(byDue);
        const later = seen.filter((c) => p[c.id].due > now).sort(byDue);
        list = [...due, ...shuffle(fresh), ...later];
      }
    }
    return list.slice(0, size);
  }

  pickDir(): Direction {
    const d = this.settings.state().direction;
    if (d === 'mix') return Math.random() < 0.5 ? 'de-tr' : 'tr-de';
    return d;
  }
}
