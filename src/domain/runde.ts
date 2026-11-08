import type { Gewichtung } from './aufgaben/einmaleins';
import type { Aufgabe } from './aufgaben/typen';
import type { Stufe } from './buden';
import { AUFGABEN_PRO_RUNDE } from './fortschritt/fortschritt';
import { bestimmeUrsache, zaehltFuerProfil, type Ursache } from './lernprofil/fehlerursache';
import type { Ereignis } from './lernprofil/lernprofil';
import type { Runde } from './profil';
import type { Rng } from './rng';

export const PUNKTE_RICHTIG = 100;
export const PUNKTE_SERIE = 20;
export const MAX_SERIENBONUS = 100;
export const PUNKTE_NOCHMAL = 50;

export type Phase = 'probe' | 'haupt' | 'nochmal' | 'fertig';

export interface RundenKonfig {
  bude: string;
  stufe: Stufe;
  rng: Rng;
  erzeuge: (stufe: Stufe, rng: Rng, gewichtung: Gewichtung) => Aufgabe;
  aehnlich: (vorher: Aufgabe, rng: Rng) => Aufgabe;
  gewichtung: Gewichtung;
  /** Erste Runde in dieser Bude: vorher ein Probewurf, der nie gewertet wird. */
  probe?: Aufgabe | undefined;
  jetzt?: () => number;
}

export interface Antwort {
  richtig: boolean;
  ursache?: Ursache | undefined;
  /** Hilfe nach Fehlern anzeigen (nur bei Fehlern, die etwas über die Mathematik sagen). */
  hilfe: boolean;
  /** Die gleiche Aufgabe wird wiederholt (Probewurf, zu schnell getippt). */
  wiederholen: boolean;
  punkte: number;
  /** Eine „Nochmal“-Aufgabe nach einem Fehler wurde gelöst. */
  durchgehalten: boolean;
  ereignis?: Ereignis | undefined;
}

export class Rundensteuerung {
  private readonly k: RundenKonfig;
  private readonly jetzt: () => number;
  private readonly start: number;
  private aufgabe: Aufgabe;
  private phase: Phase;
  private hauptGestellt = 0;
  private richtig = 0;
  private serie = 0;
  private punkteSumme = 0;
  private ausstehendNochmal: Aufgabe | undefined;
  private durchhaltePunkte = 0;
  readonly ereignisse: Ereignis[] = [];

  constructor(konfig: RundenKonfig) {
    this.k = konfig;
    this.jetzt = konfig.jetzt ?? Date.now;
    this.start = this.jetzt();
    if (konfig.probe) {
      this.phase = 'probe';
      this.aufgabe = konfig.probe;
    } else {
      this.phase = 'haupt';
      this.aufgabe = this.neueHauptaufgabe();
    }
  }

  get aktuelle(): Aufgabe {
    return this.aufgabe;
  }
  get aktuellePhase(): Phase {
    return this.phase;
  }
  /** Fortschritt in der Runde: gestellte Hauptaufgaben (1-basiert für die Anzeige). */
  get nummer(): number {
    return this.phase === 'probe' ? 0 : Math.min(this.hauptGestellt, AUFGABEN_PRO_RUNDE);
  }
  get punkte(): number {
    return this.punkteSumme;
  }
  get durchhalteErfolge(): number {
    return this.durchhaltePunkte;
  }

  antworte(wert: number, ms: number): Antwort {
    if (this.phase === 'fertig') throw new Error('Runde ist schon beendet');
    const a = this.aufgabe;
    const option = a.optionen.find((o) => o.wert === wert);
    if (!option) throw new Error(`Antwort ${wert} gehört nicht zur Aufgabe ${a.text}`);
    const richtig = wert === a.antwort;
    const uebung = this.phase === 'probe';
    const ursache = bestimmeUrsache({ richtig, fehlerArt: option.fehlerArt, ms, uebung });

    if (this.phase === 'probe') {
      if (richtig) this.phase = 'haupt';
      return { richtig, ursache, hilfe: false, wiederholen: !richtig, punkte: 0, durchgehalten: false };
    }

    const gewertet = zaehltFuerProfil(ursache);
    const ereignis: Ereignis = {
      t: this.jetzt(),
      bude: this.k.bude,
      kompetenz: a.kompetenz,
      dimension: a.dimension,
      richtig,
      ms,
      fakt: a.fakt,
      fehlerArt: option.fehlerArt,
      ursache,
      gewertet,
    };
    this.ereignisse.push(ereignis);

    // Zu schnell getippt: freundlicher Hinweis, dieselbe Aufgabe noch einmal, nichts wird gezählt.
    if (ursache === 'zuSchnell') {
      return { richtig, ursache, hilfe: false, wiederholen: true, punkte: 0, durchgehalten: false, ereignis };
    }

    if (this.phase === 'nochmal') {
      const durchgehalten = richtig && this.k.stufe !== 'bronze';
      if (durchgehalten) this.durchhaltePunkte++;
      const punkte = richtig ? PUNKTE_NOCHMAL : 0;
      this.punkteSumme += punkte;
      this.phase = 'haupt';
      return { richtig, ursache, hilfe: !richtig, wiederholen: false, punkte, durchgehalten, ereignis };
    }

    // Hauptaufgabe
    if (richtig) {
      this.richtig++;
      this.serie++;
      const punkte = PUNKTE_RICHTIG + Math.min(MAX_SERIENBONUS, (this.serie - 1) * PUNKTE_SERIE);
      this.punkteSumme += punkte;
      return { richtig, ursache, hilfe: false, wiederholen: false, punkte, durchgehalten: false, ereignis };
    }
    this.serie = 0;
    this.ausstehendNochmal = this.k.aehnlich(a, this.k.rng);
    return { richtig, ursache, hilfe: true, wiederholen: false, punkte: 0, durchgehalten: false, ereignis };
  }

  /** Nächste Aufgabe nach einer Antwort (und ggf. nach der Hilfe). Undefined, wenn die Runde fertig ist. */
  weiter(wiederholen = false): Aufgabe | undefined {
    if (this.phase === 'fertig') return undefined;
    if (wiederholen) return this.aufgabe;
    if (this.ausstehendNochmal) {
      this.aufgabe = this.ausstehendNochmal;
      this.ausstehendNochmal = undefined;
      this.phase = 'nochmal';
      return this.aufgabe;
    }
    if (this.hauptGestellt >= AUFGABEN_PRO_RUNDE) {
      this.phase = 'fertig';
      return undefined;
    }
    this.aufgabe = this.neueHauptaufgabe();
    return this.aufgabe;
  }

  ergebnis(): Runde {
    return {
      bude: this.k.bude,
      stufe: this.k.stufe,
      start: this.start,
      dauerMs: Math.max(0, this.jetzt() - this.start),
      punkte: this.punkteSumme,
      richtig: this.richtig,
      gesamt: Math.min(this.hauptGestellt, AUFGABEN_PRO_RUNDE),
    };
  }

  private neueHauptaufgabe(): Aufgabe {
    this.hauptGestellt++;
    return this.k.erzeuge(this.k.stufe, this.k.rng, this.k.gewichtung);
  }
}
