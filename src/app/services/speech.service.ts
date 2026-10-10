import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechService {
  readonly supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  /** Lee un texto en alemán con la voz del dispositivo. */
  speak(text: string): void {
    if (!this.supported) return;
    const limpio = text.replace(/\([^)]*\)/g, ' ').replace(/[…/]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!limpio) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(limpio);
    u.lang = 'de-DE';
    u.rate = 0.9;
    const voz = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('de'));
    if (voz) u.voice = voz;
    synth.speak(u);
  }
}
