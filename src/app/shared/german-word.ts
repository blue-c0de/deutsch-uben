import { Component, computed, input } from '@angular/core';
import { genusOf, splitArticle } from '../utils/text';

/** Muestra una palabra alemana con el artículo coloreado según el género (der, die, das). */
@Component({
  selector: 'app-de',
  template: `@if (parts().article) {<span class="art" [attr.data-art]="genus()">{{ parts().article }} </span>}<span>{{ parts().rest }}</span>`,
})
export class GermanWord {
  readonly text = input.required<string>();
  /** Con `false` no se separa el artículo (verbos, frases…). */
  readonly noun = input(true);

  protected readonly parts = computed(() =>
    this.noun() ? splitArticle(this.text()) : { article: null, rest: this.text() },
  );
  protected readonly genus = computed(() => genusOf(this.parts().article));
}
