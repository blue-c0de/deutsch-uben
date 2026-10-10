import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Verb } from '../models';
import { DataService } from '../services/data.service';
import { SettingsService } from '../services/settings.service';
import { SpeechService } from '../services/speech.service';
import { ConjText } from '../shared/conj-text';
import {
  FORM_IDS,
  FORM_LABEL,
  FormId,
  Line,
  auxiliary,
  conjugate,
  formLines,
  imperativeDu,
  verbLabel,
} from '../utils/conjugation';
import { judgeGerman, searchFold } from '../utils/text';

type Tab = 'conjugar' | 'practicar' | 'irregulares';
type Source = 'todos' | 'mios' | 'basicos' | 'irregulares' | 'separables' | 'reflexivos';
interface Question {
  verb: Verb;
  form: FormId;
  line: Line;
}

const SOURCES: { v: Source; t: string }[] = [
  { v: 'todos', t: 'Todos' },
  { v: 'mios', t: 'Mis verbos' },
  { v: 'basicos', t: 'Básicos' },
  { v: 'irregulares', t: 'Irregulares' },
  { v: 'separables', t: 'Separables' },
  { v: 'reflexivos', t: 'Reflexivos' },
];

function inSource(v: Verb, s: Source): boolean {
  switch (s) {
    case 'mios':
      return v.origen === 'Mi vocabulario';
    case 'basicos':
      return v.origen === 'Básicos';
    case 'irregulares':
      return v.tipo !== 'regular';
    case 'separables':
      return !!v.prefijo;
    case 'reflexivos':
      return !!v.reflexivo;
    default:
      return true;
  }
}

@Component({
  selector: 'app-verbs',
  imports: [ConjText, RouterLink],
  template: `
    <div class="stack" style="--gap: 16px">
      <h1>Verbos</h1>

      <div class="seg seg-scroll" role="tablist" aria-label="Sección de verbos">
        @for (t of tabs; track t.v) {
          <button type="button" role="tab" [attr.aria-selected]="tab() === t.v" [class.on]="tab() === t.v" (click)="tab.set(t.v)">{{ t.t }}</button>
        }
      </div>

      @if (tab() === 'conjugar') {
        <!-- ============ CONJUGADOR ============ -->
        <div class="stack" style="--gap: 14px">
          <div class="field">
            <label for="vq">Busca un verbo en alemán, español o inglés</label>
            <input id="vq" class="input" type="search" autocomplete="off" [value]="query()" (input)="onQuery($event)" placeholder="gehen, ir, to go…" />
          </div>

          <div class="row" role="group" aria-label="Filtrar verbos">
            @for (s of sources; track s.v) {
              <button type="button" class="chip" [class.on]="source() === s.v" [attr.aria-pressed]="source() === s.v" (click)="setSource(s.v)">{{ s.t }}</button>
            }
          </div>

          @if (sel(); as v) {
            <section class="panel stack" id="panel-verbo" style="--gap: 14px" aria-live="polite">
              <div class="row row-between">
                <h2 class="vlabel">{{ label(v) }}</h2>
                @if (speech.supported) {
                  <button type="button" class="btn btn-icon btn-quiet" (click)="speech.speak(label(v))" aria-label="Escuchar el infinitivo">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 010 6" /><path d="M18.5 6.5a8 8 0 010 11" /></svg>
                  </button>
                }
              </div>
              <p class="tr">{{ tr(v) }}</p>
              <div class="row">
                <span class="chip">{{ v.tipo }}</span>
                @if (v.prefijo) {
                  <span class="chip">separable ({{ v.prefijo }}-)</span>
                }
                @if (v.reflexivo) {
                  <span class="chip">reflexivo ({{ v.reflexivo === 'dat' ? 'Dativ' : 'Akkusativ' }})</span>
                }
                <span class="chip">Perfekt con {{ aux(v) }}</span>
              </div>
              @if (v.nota) {
                <p class="note">{{ v.nota }}</p>
              }
              <div class="main" role="group" aria-label="Formas principales">
                @for (m of mainForms(); track m.l) {
                  <div class="mf">
                    <span class="muted small">{{ m.l }}</span>
                    <b class="disp">{{ m.t }}</b>
                  </div>
                }
              </div>

              @if (conj(); as c) {
                <div class="seg seg-scroll" role="tablist" aria-label="Tiempos y modos">
                  @for (g of c.groups; track g.id) {
                    <button type="button" role="tab" [attr.aria-selected]="group() === g.id" [class.on]="group() === g.id" (click)="group.set(g.id)">{{ g.titulo }}</button>
                  }
                  <button type="button" role="tab" [attr.aria-selected]="group() === 'formas'" [class.on]="group() === 'formas'" (click)="group.set('formas')">Formas</button>
                </div>

                @if (group() === 'formas') {
                  <table class="conj">
                    <tbody>
                      @for (f of c.forms; track f.label) {
                        <tr>
                          <th scope="row">{{ f.label }}</th>
                          <td><b>{{ f.text }}</b></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                } @else {
                  <div class="tenses">
                    @for (g of c.groups; track g.id) {
                      @if (g.id === group()) {
                        @for (t of g.tenses; track t.id) {
                          <section class="tense">
                            <h3>{{ t.titulo }}</h3>
                            <p class="muted small">{{ t.formacion }}</p>
                            <table class="conj">
                              <tbody>
                                @for (l of t.lines; track $index) {
                                  <tr>
                                    <th scope="row">{{ l.pron || l.label }}</th>
                                    <td><app-conj-text [parts]="l.parts" /></td>
                                  </tr>
                                }
                              </tbody>
                            </table>
                            <p class="uso small">{{ t.uso }}</p>
                          </section>
                        }
                      }
                    }
                  </div>
                }
                <p class="legend muted small">
                  <b class="blue">Azul</b>: verbo conjugado o auxiliar. <b class="red">Rojo</b>: prefijo separable (va al final de la frase). <i>Gris</i>: pronombre reflexivo.
                </p>
                @if (group() === 'passiv') {
                  <p class="muted small">El Passiv solo existe con verbos transitivos (los que llevan Akkusativ).</p>
                }
                <p class="small">
                  <a routerLink="/gramatica" [queryParams]="{ t: 'tiempos' }">Ver cuándo se usa cada tiempo</a>
                </p>
              }
            </section>
          }

          <p class="muted" role="status">{{ list().length }} {{ list().length === 1 ? 'verbo' : 'verbos' }}</p>
          <ul class="vlist">
            @for (v of shown(); track v.id) {
              <li>
                <button type="button" class="vitem" [class.on]="sel()?.id === v.id" (click)="choose(v)">
                  <span class="disp vname">{{ label(v) }}</span>
                  <span class="muted small vtr">{{ tr(v) }}</span>
                  @if (v.tipo !== 'regular') {
                    <span class="chip tag">{{ v.tipo }}</span>
                  }
                </button>
              </li>
            }
          </ul>
          @if (shown().length < list().length) {
            <button type="button" class="btn btn-block" (click)="moreVerbs()">Mostrar más ({{ list().length - shown().length }})</button>
          }
        </div>
      } @else if (tab() === 'practicar') {
        <!-- ============ PRACTICAR ============ -->
        @if (!started()) {
          <section class="panel stack" style="--gap: 16px">
            <h2>Practicar conjugación</h2>
            <p>Te doy un verbo, un tiempo y una persona, y escribes la forma. Cuenta todo lo que va después del pronombre: el reflexivo y el prefijo separable también.</p>
            <div class="field">
              <span class="label" id="lbl-forms">Qué formas practicar</span>
              <div class="row" role="group" aria-labelledby="lbl-forms">
                @for (f of formIds; track f) {
                  <button type="button" class="chip" [class.on]="isForm(f)" [attr.aria-pressed]="isForm(f)" (click)="toggleForm(f)">{{ formLabel[f] }}</button>
                }
              </div>
            </div>
            <div class="field">
              <span class="label" id="lbl-src">Qué verbos</span>
              <div class="row" role="group" aria-labelledby="lbl-src">
                @for (s of sources; track s.v) {
                  <button type="button" class="chip" [class.on]="pSource() === s.v" [attr.aria-pressed]="pSource() === s.v" (click)="pSource.set(s.v)">{{ s.t }}</button>
                }
              </div>
            </div>
            <div class="field">
              <label for="psize">Número de preguntas</label>
              <select id="psize" class="input" (change)="pSize.set(num($event))">
                @for (n of [10, 20, 30]; track n) {
                  <option [value]="n" [selected]="pSize() === n">{{ n }}</option>
                }
              </select>
            </div>
            <button type="button" class="btn btn-primary" [disabled]="formChoices().length === 0 || pool().length === 0" (click)="startPractice()">Empezar</button>
            @if (pool().length === 0) {
              <p class="muted small">No hay verbos con ese filtro.</p>
            }
          </section>
        } @else if (finished()) {
          <section class="panel stack" style="--gap: 14px">
            <h2>Práctica terminada</h2>
            <p class="big">Acertaste <b>{{ okN() }}</b> de <b>{{ qs().length }}</b>.</p>
            @if (wrong().length) {
              <div class="stack" style="--gap: 6px">
                <h3>Para repasar</h3>
                <ul class="fails">
                  @for (q of wrong(); track $index) {
                    <li>
                      <span class="disp vname">{{ label(q.verb) }}</span>
                      <span class="muted">{{ formLabel[q.form] }}</span>
                      <span>{{ q.line.pron || q.line.label }} <app-conj-text [parts]="q.line.parts" /></span>
                    </li>
                  }
                </ul>
              </div>
            }
            <div class="row">
              <button type="button" class="btn btn-primary" (click)="startPractice()">Otra ronda</button>
              <button type="button" class="btn btn-quiet" (click)="started.set(false)">Cambiar ajustes</button>
            </div>
          </section>
        } @else {
          @if (cur(); as q) {
            <div class="stack" style="--gap: 14px">
              <div class="row row-between">
                <span class="muted" aria-live="polite">Pregunta {{ qi() + 1 }} de {{ qs().length }}</span>
                <span class="muted">{{ okN() }} bien</span>
              </div>
              <div class="meter" role="progressbar" aria-label="Avance" [attr.aria-valuenow]="pct()" aria-valuemin="0" aria-valuemax="100"><i [style.width.%]="pct()"></i></div>
              <article class="kk prompt">
                <div class="meta row"><span class="chip">{{ formLabel[q.form] }}</span></div>
                <div class="content stack" style="--gap: 6px">
                  <p class="word">{{ label(q.verb) }}</p>
                  <p class="muted">{{ tr(q.verb) }}</p>
                </div>
              </article>
              <div class="field">
                <label for="vresp">
                  @if (q.form === 'partizip2') {
                    Escribe el Partizip II
                  } @else {
                    Escribe la forma para <b>{{ q.line.pron || q.line.label }}</b>
                  }
                </label>
                <input
                  id="vresp"
                  class="input resp"
                  type="text"
                  lang="de"
                  [value]="answer()"
                  [readOnly]="checked()"
                  (input)="onAnswer($event)"
                  (keydown.enter)="enter($event)"
                  autocomplete="off"
                  autocapitalize="off"
                  autocorrect="off"
                  spellcheck="false"
                  enterkeyhint="done"
                />
              </div>
              @if (!checked()) {
                <div class="row" role="group" aria-label="Letras alemanas">
                  @for (ch of chars; track ch) {
                    <button type="button" class="btn btn-icon" (click)="insert(ch)">{{ ch }}</button>
                  }
                </div>
                <div class="row">
                  <button type="button" class="btn btn-primary" (click)="check()">Comprobar</button>
                  <button type="button" class="btn btn-quiet" (click)="giveUp()">No lo sé</button>
                </div>
              } @else {
                <section class="panel stack" style="--gap: 8px" role="status">
                  @if (lastOk()) {
                    <p class="good verdict">¡Correcto!</p>
                  } @else {
                    <p class="bad verdict">{{ gaveUp() ? 'Esta es la forma' : 'No coincide' }}</p>
                  }
                  <p class="answer"><b>{{ q.line.pron || q.line.label }}</b>&ngsp;<app-conj-text [parts]="q.line.parts" /></p>
                  <div class="row">
                    <button type="button" class="btn btn-primary" (click)="next()">{{ qi() + 1 === qs().length ? 'Ver resultado' : 'Siguiente' }}</button>
                    <button type="button" class="btn btn-quiet" (click)="choose(q.verb); tab.set('conjugar')">Ver todas las formas</button>
                  </div>
                </section>
              }
            </div>
          }
        }
      } @else {
        <!-- ============ IRREGULARES ============ -->
        <div class="stack" style="--gap: 14px">
          <p class="muted">Las tres formas que hay que aprender de memoria: Präsens (3.ª persona), Präteritum y Perfekt.</p>
          <div class="field">
            <label for="iq">Buscar</label>
            <input id="iq" class="input" type="search" autocomplete="off" [value]="iQuery()" (input)="onIQuery($event)" />
          </div>
          <div class="row" role="group" aria-label="Tipo de verbo">
            @for (t of irrTipos; track t.v) {
              <button type="button" class="chip" [class.on]="irrTipo() === t.v" [attr.aria-pressed]="irrTipo() === t.v" (click)="irrTipo.set(t.v)">{{ t.t }}</button>
            }
          </div>
          <p class="muted" role="status">{{ irrRows().length }} verbos</p>
          <div class="scroll" tabindex="0" role="region" aria-label="Tabla de verbos irregulares">
            <table class="irr">
              <thead>
                <tr><th scope="col">Infinitiv</th><th scope="col">Präsens (er)</th><th scope="col">Präteritum (er)</th><th scope="col">Perfekt (er)</th></tr>
              </thead>
              <tbody>
                @for (r of irrShown(); track r.v.id) {
                  <tr>
                    <th scope="row"><button type="button" class="linkbtn" (click)="choose(r.v); tab.set('conjugar')">{{ label(r.v) }}</button></th>
                    <td>{{ r.pres }}</td>
                    <td>{{ r.prat }}</td>
                    <td>{{ r.perf }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (irrShown().length < irrRows().length) {
            <button type="button" class="btn btn-block" (click)="moreIrr()">Mostrar más ({{ irrRows().length - irrShown().length }})</button>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .vlabel {
      font-size: clamp(2rem, 8vw, 2.8rem);
    }
    .tr {
      font-size: 1.15rem;
    }
    .note {
      font-style: italic;
      padding: 6px 10px;
      border-left: 4px solid var(--mark);
      background: var(--ink-soft);
    }
    .main {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
      padding: 10px 0;
      border-block: 1.5px solid var(--line);
    }
    .mf {
      display: grid;
    }
    .mf b {
      font-size: 1.35rem;
      line-height: 1.15;
      color: var(--text);
    }
    .tenses {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
      gap: 18px 24px;
    }
    .tense h3 {
      margin-bottom: 2px;
    }
    .conj {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    .conj th,
    .conj td {
      padding: 5px 8px 5px 0;
      text-align: left;
      border-bottom: 1px solid var(--line);
      vertical-align: baseline;
    }
    .conj th {
      width: 6.5em;
      font-weight: 500;
      color: var(--text-2);
    }
    .uso {
      margin-top: 6px;
      color: var(--text-2);
    }
    .legend .blue {
      color: var(--ink);
    }
    .legend .red {
      color: var(--red);
    }
    .vlist {
      list-style: none;
      margin: 0;
      padding: 0;
      border-top: 2px solid var(--ink);
    }
    .vitem {
      font: inherit;
      display: grid;
      grid-template-columns: minmax(8em, 11em) 1fr auto;
      align-items: baseline;
      gap: 4px 12px;
      width: 100%;
      padding: 10px 4px;
      text-align: left;
      color: var(--text);
      background: transparent;
      border: 0;
      border-bottom: 1px solid var(--line);
      cursor: pointer;
    }
    .vitem:hover,
    .vitem.on {
      background: var(--ink-soft);
    }
    .vname {
      font-size: 1.4rem;
      line-height: 1.1;
      color: var(--text);
    }
    .vtr {
      overflow-wrap: anywhere;
    }
    .tag {
      font-size: 0.78rem;
    }
    @media (max-width: 520px) {
      .vitem {
        grid-template-columns: 1fr auto;
      }
      .vtr {
        grid-column: 1 / -1;
      }
    }
    .prompt {
      padding: 0 22px 18px;
      min-height: 190px;
    }
    .meta {
      min-height: 54px;
      padding-top: 12px;
      align-items: flex-start;
    }
    .content {
      padding-top: 20px;
    }
    .word {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      line-height: 1.04;
      font-size: clamp(2.2rem, 9vw, 3.2rem);
    }
    .resp {
      font-size: 1.3rem;
    }
    .resp[readonly] {
      background: var(--ink-soft);
    }
    .verdict {
      font-family: 'Barlow Condensed', 'Barlow', sans-serif;
      font-weight: 700;
      font-size: 1.6rem;
      line-height: 1;
    }
    .answer {
      font-size: 1.5rem;
    }
    .big {
      font-size: 1.25rem;
    }
    .fails {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .fails li {
      display: flex;
      flex-wrap: wrap;
      gap: 2px 14px;
      align-items: baseline;
      padding: 6px 0;
      border-bottom: 1px solid var(--line);
    }
    .scroll {
      overflow-x: auto;
      border: 1.5px solid var(--line);
      border-radius: var(--radius);
      background: var(--card);
    }
    .irr {
      width: 100%;
      min-width: 520px;
      border-collapse: collapse;
    }
    .irr th,
    .irr td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid var(--line);
      white-space: nowrap;
    }
    .irr thead th {
      background: var(--ink);
      color: var(--ink-on);
      position: sticky;
      top: 0;
    }
    .linkbtn {
      font: inherit;
      font-weight: 700;
      color: var(--ink);
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
    }
  `,
})
export class Verbs {
  private readonly data = inject(DataService);
  protected readonly settings = inject(SettingsService);
  protected readonly speech = inject(SpeechService);
  private readonly route = inject(ActivatedRoute);

  protected readonly tabs: { v: Tab; t: string }[] = [
    { v: 'conjugar', t: 'Conjugar' },
    { v: 'practicar', t: 'Practicar' },
    { v: 'irregulares', t: 'Irregulares' },
  ];
  protected readonly sources = SOURCES;
  protected readonly formIds = FORM_IDS;
  protected readonly formLabel = FORM_LABEL;
  protected readonly chars = ['ä', 'ö', 'ü', 'ß'];
  protected readonly irrTipos: { v: 'irr' | 'mod' | 'all'; t: string }[] = [
    { v: 'irr', t: 'Irregulares y mixtos' },
    { v: 'mod', t: 'Modales y auxiliares' },
    { v: 'all', t: 'Todos' },
  ];

  protected readonly tab = signal<Tab>('conjugar');
  protected readonly query = signal('');
  protected readonly source = signal<Source>('todos');
  protected readonly limit = signal(60);
  protected readonly sel = signal<Verb | null>(null);
  protected readonly group = signal('indikativ');

  protected readonly label = verbLabel;
  protected readonly aux = auxiliary;

  private readonly index = computed(
    () => new Map(this.data.verbs().map((v) => [v.id, searchFold([verbLabel(v), v.espanol, v.ingles].filter(Boolean).join(' '))])),
  );

  protected readonly list = computed(() => {
    const q = searchFold(this.query().trim());
    const idx = this.index();
    return this.data
      .verbs()
      .filter((v) => inSource(v, this.source()) && (!q || idx.get(v.id)?.includes(q)))
      .sort((a, b) => a.infinitivo.localeCompare(b.infinitivo, 'de'));
  });
  protected readonly shown = computed(() => this.list().slice(0, this.limit()));

  protected readonly conj = computed(() => {
    const v = this.sel();
    return v ? conjugate(v) : null;
  });

  protected readonly mainForms = computed(() => {
    const v = this.sel();
    if (!v) return [];
    const er = (id: FormId) => formLines(v, id)[2]?.text ?? '';
    return [
      { l: 'Infinitiv', t: verbLabel(v) },
      { l: 'Präsens (er)', t: er('presente') },
      { l: 'Präteritum (er)', t: er('preterito') },
      { l: 'Perfekt (er)', t: er('perfekt') },
    ];
  });

  constructor() {
    this.route.queryParamMap.subscribe((p) => {
      const id = Number(p.get('v'));
      const v = id ? this.data.verbs().find((x) => x.id === id) : undefined;
      if (v) this.choose(v);
    });
  }

  protected tr(v: Verb): string {
    return (this.settings.state().lang === 'espanol' ? v.espanol : v.ingles) ?? v.espanol ?? '';
  }

  protected onQuery(e: Event): void {
    this.query.set((e.target as HTMLInputElement).value);
    this.limit.set(60);
  }
  protected setSource(s: Source): void {
    this.source.set(s);
    this.limit.set(60);
  }
  protected num(e: Event): number {
    return Number((e.target as HTMLSelectElement).value);
  }

  protected choose(v: Verb): void {
    this.sel.set(v);
    this.group.set('indikativ');
    this.tab.set('conjugar');
    setTimeout(() => document.getElementById('panel-verbo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  /* ---------- práctica ---------- */
  protected readonly formChoices = signal<FormId[]>(['presente', 'preterito', 'perfekt', 'partizip2']);
  protected readonly pSource = signal<Source>('mios');
  protected readonly pSize = signal(10);
  protected readonly started = signal(false);
  protected readonly qs = signal<Question[]>([]);
  protected readonly qi = signal(0);
  protected readonly answer = signal('');
  protected readonly checked = signal(false);
  protected readonly lastOk = signal(false);
  protected readonly gaveUp = signal(false);
  protected readonly okN = signal(0);
  protected readonly wrong = signal<Question[]>([]);

  protected readonly pool = computed(() => this.data.verbs().filter((v) => inSource(v, this.pSource())));
  protected readonly cur = computed(() => this.qs()[this.qi()] ?? null);
  protected readonly finished = computed(() => this.qs().length > 0 && this.qi() >= this.qs().length);
  protected readonly pct = computed(() => (this.qs().length ? Math.round((this.qi() / this.qs().length) * 100) : 0));

  protected isForm(f: FormId): boolean {
    return this.formChoices().includes(f);
  }
  protected toggleForm(f: FormId): void {
    const c = this.formChoices();
    this.formChoices.set(c.includes(f) ? c.filter((x) => x !== f) : [...c, f]);
  }

  protected startPractice(): void {
    const pool = this.pool();
    const forms = this.formChoices();
    const out: Question[] = [];
    let guard = 0;
    while (out.length < this.pSize() && guard++ < 500) {
      const verb = pool[Math.floor(Math.random() * pool.length)];
      const form = forms[Math.floor(Math.random() * forms.length)];
      if (form === 'imperativ' && imperativeDu(verb) === null) continue;
      if (out.length && out[out.length - 1].verb.id === verb.id && pool.length > 1) continue;
      const lines = formLines(verb, form);
      if (!lines.length) continue;
      out.push({ verb, form, line: lines[Math.floor(Math.random() * lines.length)] });
    }
    this.qs.set(out);
    this.qi.set(0);
    this.okN.set(0);
    this.wrong.set([]);
    this.resetQ();
    this.started.set(true);
  }

  private resetQ(): void {
    this.answer.set('');
    this.checked.set(false);
    this.lastOk.set(false);
    this.gaveUp.set(false);
  }

  protected onAnswer(e: Event): void {
    this.answer.set((e.target as HTMLInputElement).value);
  }
  protected insert(ch: string): void {
    this.answer.update((v) => v + ch);
  }
  protected enter(e: Event): void {
    e.preventDefault();
    if (this.checked()) this.next();
    else this.check();
  }

  /** Quita el pronombre si la persona lo escribió (ich komme an → komme an). */
  private stripPron(input: string, pron: string): string {
    const t = input.trim().toLowerCase();
    const opts = pron === 'er/sie/es' ? ['er', 'sie', 'es'] : pron === 'sie/Sie' ? ['sie'] : pron ? [pron.toLowerCase()] : [];
    for (const o of opts) if (t.startsWith(o + ' ')) return input.trim().slice(o.length + 1);
    return input;
  }

  protected check(): void {
    const q = this.cur();
    if (!q || this.checked() || !this.answer().trim()) return;
    const input = this.stripPron(this.answer(), q.line.pron);
    const ok = judgeGerman(input, q.line.text, false, false) === 'ok';
    this.finish(ok);
  }
  protected giveUp(): void {
    if (this.checked()) return;
    this.gaveUp.set(true);
    this.finish(false);
  }
  private finish(ok: boolean): void {
    const q = this.cur();
    if (!q) return;
    this.lastOk.set(ok);
    this.checked.set(true);
    if (ok) this.okN.update((n) => n + 1);
    else this.wrong.update((w) => [...w, q]);
  }
  protected next(): void {
    if (!this.checked()) return;
    this.resetQ();
    this.qi.update((i) => i + 1);
  }

  /* ---------- irregulares ---------- */
  protected readonly iQuery = signal('');
  protected readonly irrTipo = signal<'irr' | 'mod' | 'all'>('irr');
  protected readonly irrLimit = signal(60);

  protected readonly irrRows = computed(() => {
    const q = searchFold(this.iQuery().trim());
    const t = this.irrTipo();
    const idx = this.index();
    return this.data
      .verbs()
      .filter((v) => (t === 'all' ? true : t === 'irr' ? v.tipo === 'irregular' || v.tipo === 'mixto' : v.tipo === 'modal' || v.tipo === 'auxiliar'))
      .filter((v) => !q || idx.get(v.id)?.includes(q))
      .sort((a, b) => a.infinitivo.localeCompare(b.infinitivo, 'de'))
      .map((v) => ({
        v,
        pres: formLines(v, 'presente')[2].text,
        prat: formLines(v, 'preterito')[2].text,
        perf: `${formLines(v, 'perfekt')[2].text}`,
      }));
  });
  protected readonly irrShown = computed(() => this.irrRows().slice(0, this.irrLimit()));
  protected onIQuery(e: Event): void {
    this.iQuery.set((e.target as HTMLInputElement).value);
    this.irrLimit.set(60);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKey(e: KeyboardEvent): void {
    const t = e.target as HTMLElement | null;
    if (e.key === 'Enter' && this.tab() === 'practicar' && this.started() && this.checked() && !t?.closest('button, a, input')) {
      e.preventDefault();
      this.next();
    }
  }

  protected moreVerbs(): void {
    this.limit.update((n) => n + 60);
  }
  protected moreIrr(): void {
    this.irrLimit.update((n) => n + 60);
  }
}
