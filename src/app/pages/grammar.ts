import { Component, signal } from '@angular/core';
import { AktivPassiv } from './aktiv-passiv';
import { Deklination } from './deklination';
import { Reference } from './reference';

@Component({
  selector: 'app-grammar',
  imports: [AktivPassiv, Deklination, Reference],
  template: `
    <div class="stack" style="--gap: 16px">
      <h1>Gramática</h1>
      <div class="seg seg-scroll" role="tablist" aria-label="Tema de gramática">
        <button type="button" role="tab" id="tab-ref" [attr.aria-selected]="tab() === 'ref'" aria-controls="panel-ref" [class.on]="tab() === 'ref'" (click)="tab.set('ref')">Referencia</button>
        <button type="button" role="tab" id="tab-ap" [attr.aria-selected]="tab() === 'ap'" aria-controls="panel-ap" [class.on]="tab() === 'ap'" (click)="tab.set('ap')">Aktiv y Passiv</button>
        <button type="button" role="tab" id="tab-de" [attr.aria-selected]="tab() === 'de'" aria-controls="panel-de" [class.on]="tab() === 'de'" (click)="tab.set('de')">Deklination</button>
      </div>

      @if (tab() === 'ref') {
        <div role="tabpanel" id="panel-ref" aria-labelledby="tab-ref"><app-reference /></div>
      } @else if (tab() === 'ap') {
        <div role="tabpanel" id="panel-ap" aria-labelledby="tab-ap"><app-aktiv-passiv /></div>
      } @else {
        <div role="tabpanel" id="panel-de" aria-labelledby="tab-de"><app-deklination /></div>
      }
    </div>
  `,
})
export class Grammar {
  protected readonly tab = signal<'ref' | 'ap' | 'de'>('ref');
}
