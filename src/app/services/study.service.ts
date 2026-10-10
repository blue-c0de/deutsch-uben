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

  /** Temas disponibles (asignados en el Excel). */
  readonly temas = computed(() =>
    [...new Set(this.data.cards().map((c) => c.tema).filter((t): t is string => !!t))].sort((a, b) => a.localeCompare(b, 'es')),
  );

  /** Etiquetas de «subtipo»: género de los sustantivos y tipo de verbo. */
  readonly subtipos = computed(() => {
    const orden = ['der', 'die', 'das', 'regular', 'irregular', 'mixto', 'modal', 'auxiliar', 'separable', 'reflexivo', 'con sein'];
    const set = new Set<string>();
    for (const c of this.data.cards()) (c.subtipo ?? '').split(', ').filter(Boolean).forEach((x) => set.add(x));
    return [...orden.filter((o) => set.has(o)), ...[...set].filter((x) => !orden.includes(x))];
  });

  /** Categorías de frases con su traducción y cuántas frases tienen. */
  readonly categoriasFrase = computed(() => {
    const info = new Map(this.data.categorias().map((c) => [c.categoria, c]));
    const n = new Map<string, number>();
    for (const c of this.data.cards()) if (c.tipo === 'frase' && c.categoria) n.set(c.categoria, (n.get(c.categoria) ?? 0) + 1);
    return [...n.entries()]
      .map(([categoria, cnt]) => ({ categoria, n: cnt, espanol: info.get(categoria)?.espanol ?? null, para_que: info.get(categoria)?.para_que ?? null, orden: info.get(categoria)?.orden ?? 999 }))
      .sort((a, b) => a.orden - b.orden);
  });

  catEs(cat: string | null): string | null {
    return cat ? (this.categoriasFrase().find((c) => c.categoria === cat)?.espanol ?? null) : null;
  }

  /** Número de fichas de cada fuente (sin aplicar otros filtros). */
  readonly fuenteCounts = computed(() => {
    const m = new Map<string, number>();
    for (const c of this.data.cards()) m.set(c.fuente, (m.get(c.fuente) ?? 0) + 1);
    return [...m.entries()].map(([fuente, n]) => ({ fuente, n }));
  });

  /** Lecciones (módulo y página) disponibles en el Kursbuch. */
  readonly lecciones = computed(() => {
    const set = new Map<string, { id: string; label: string; m: number; p: number }>();
    for (const c of this.data.cards()) {
      if (c.fuente === 'Kursbuch' && c.modulo !== null && c.pagina !== null) {
        const id = `${c.modulo}-${c.pagina}`;
        if (!set.has(id)) set.set(id, { id, label: `Módulo ${c.modulo}, página ${c.pagina}`, m: c.modulo, p: c.pagina });
      }
    }
    return [...set.values()].sort((a, b) => a.m - b.m || a.p - b.p);
  });

  /** Tarjetas que cumplen los filtros elegidos. */
  readonly pool = computed(() => {
    const s = this.settings.state();
    return this.data.cards().filter(
      (c) =>
        (s.tipos.length === 0 || s.tipos.includes(c.tipo)) &&
        (s.fuente === 'todas' || c.fuente === s.fuente) &&
        (s.tema === 'todos' || c.tema === s.tema) &&
        (s.subtipo === 'todos' || (c.subtipo ?? '').split(', ').includes(s.subtipo)) &&
        (s.categoria === 'todas' || c.categoria === s.categoria) &&
        (s.leccion === 'todas' || (c.modulo !== null && `${c.modulo}-${c.pagina}` === s.leccion)) &&
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
