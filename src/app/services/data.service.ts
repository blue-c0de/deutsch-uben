import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AktivPassivRow, Card, DeclRow } from '../models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);

  readonly cards = signal<Card[]>([]);
  readonly aktivPassiv = signal<AktivPassivRow[]>([]);
  readonly deklination = signal<DeclRow[]>([]);
  readonly status = signal<'cargando' | 'listo' | 'error'>('cargando');

  readonly byId = computed(() => new Map(this.cards().map((c) => [c.id, c])));

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.status.set('cargando');
    forkJoin({
      cards: this.http.get<Card[]>('data/vocabulario.json'),
      ap: this.http.get<AktivPassivRow[]>('data/aktiv-passiv.json'),
      decl: this.http.get<DeclRow[]>('data/deklination.json'),
    }).subscribe({
      next: ({ cards, ap, decl }) => {
        this.cards.set(cards);
        this.aktivPassiv.set(ap);
        this.deklination.set(decl);
        this.status.set('listo');
      },
      error: () => this.status.set('error'),
    });
  }
}
