import type { Gewichtung } from './aufgaben/einmaleins';
import type { Aufgabe } from './aufgaben/typen';
import type { Stufe } from './buden';
import { AUFGABEN_PRO_RUNDE } from './fortschritt/fortschritt';
import { ZU_SCHNELL_MS, bestimmeUrsache, zaehltFuerProfil, type Ursache } from './lernprofil/fehlerursache';
import type { Ereignis } from './lernprofil/lernprofil';
import type { Runde } from './profil';
import type { Rng } from './rng';
import type { Zwischenstand } from './pause';
import { frischeAufgabe, leererVerlauf, merke, type Verlauf } from './abwechslung';

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
  /** Unterbrochene Runde fortsetzen: ohne Probewurf, mit den bisherigen Zählern. */
  fortsetzen?: Zwischenstand | undefined;
  /** Zuletzt gestellte Aufgaben und Motive dieser Bude (aus früheren Runden). */
  verlauf?: Verlauf | undefined;
  /** Feste Aufgaben statt erzeugter (Fundbüro). Die Runde hat dann genau so viele Hauptaufgaben. */
  vorgaben?: readonly Aufgabe[] | undefined;
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
  /** Beantwortete Hauptaufgaben (für den Zwischenstand). */
  private beantwortet = 0;
  private verlaufStand: Verlauf;
  readonly ereignisse: Ereignis[] = [];
  /** Hauptaufgaben dieser Runde (10, im Fundbüro so viele wie Vorgaben). */
  readonly anzahl: number;

  constructor(konfig: RundenKonfig) {
    this.k = konfig;
    this.jetzt = konfig.jetzt ?? Date.now;
    this.start = this.jetzt();
    this.verlaufStand = konfig.verlauf ?? leererVerlauf();
    this.anzahl = konfig.vorgaben?.length || AUFGABEN_PRO_RUNDE;
    const f = konfig.fortsetzen;
    if (f) {
      this.hauptGestellt = f.gestellt;
      this.beantwortet = f.gestellt;
      this.richtig = f.richtig;
      this.serie = f.serie;
      this.punkteSumme = f.punkte;
      this.durchhaltePunkte = f.durchhalte;
      this.phase = 'haupt';
      this.aufgabe = this.neueHauptaufgabe();
    } else if (konfig.probe) {
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
    return this.phase === 'probe' ? 0 : Math.min(this.hauptGestellt, this.anzahl);
  }
  get punkte(): number {
    return this.punkteSumme;
  }
  get durchhalteErfolge(): number {
    return this.durchhaltePunkte;
  }

  /**
   * @param bonus Zusatzpunkte, die eine Bude für eine richtige Hauptaufgabe vergibt (z. B. Turbo).
   */
  antworte(wert: number, ms: number, bonus = 0): Antwort {
    if (this.phase === 'fertig') throw new Error('Runde ist schon beendet');
    const a = this.aufgabe;
    // Bei freier Eingabe ist jede Zahl erlaubt; unbekannte Fehler haben kein Muster.
    const option = a.optionen.find((o) => o.wert === wert) ?? (a.eingabe === 'ziffern' ? { wert, fehlerArt: 'sonstige' as const } : undefined);
    if (!option) throw new Error(`Antwort ${wert} gehört nicht zur Aufgabe ${a.text}`);
    const richtig = wert === a.antwort;
    const uebung = this.phase === 'probe';
    // Beim Eintippen ist Raten unwahrscheinlich; „zu schnell“ gilt nur fürs Antippen von Auswahlen.
    const msSignal = a.eingabe === 'ziffern' ? Math.max(ms, ZU_SCHNELL_MS) : ms;
    const ursache = bestimmeUrsache({ richtig, fehlerArt: option.fehlerArt, ms: msSignal, uebung });

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
    this.beantwortet++;
    if (richtig) {
      this.richtig++;
      this.serie++;
      const punkte = PUNKTE_RICHTIG + Math.min(MAX_SERIENBONUS, (this.serie - 1) * PUNKTE_SERIE) + Math.max(0, bonus);
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
    if (this.hauptGestellt >= this.anzahl) {
      this.phase = 'fertig';
      return undefined;
    }
    this.aufgabe = this.neueHauptaufgabe();
    return this.aufgabe;
  }

  /** Stand zum Merken beim Abbrechen; undefined, wenn noch nichts oder schon alles beantwortet ist. */
  zwischenstand(): Zwischenstand | undefined {
    if (this.beantwortet < 1 || this.beantwortet >= this.anzahl || this.phase === 'fertig') return undefined;
    return { gestellt: this.beantwortet, richtig: this.richtig, serie: this.serie, punkte: this.punkteSumme, durchhalte: this.durchhaltePunkte };
  }

  ergebnis(): Runde {
    return {
      bude: this.k.bude,
      stufe: this.k.stufe,
      start: this.start,
      dauerMs: Math.max(0, this.jetzt() - this.start),
      punkte: this.punkteSumme,
      richtig: this.richtig,
      gesamt: Math.min(this.hauptGestellt, this.anzahl),
    };
  }

  /** Verlauf mit allen in dieser Runde gestellten Hauptaufgaben – zum Speichern im Profil. */
  get verlauf(): Verlauf {
    return this.verlaufStand;
  }

  private neueHauptaufgabe(): Aufgabe {
    this.hauptGestellt++;
    const vorgabe = this.k.vorgaben?.[this.hauptGestellt - 1];
    if (vorgabe) return vorgabe;
    const a = frischeAufgabe(() => this.k.erzeuge(this.k.stufe, this.k.rng, this.k.gewichtung), this.verlaufStand);
    this.verlaufStand = merke(this.verlaufStand, a);
    return a;
  }
}
