import { KERNBUDEN, STUFEN, TAGESBUDEN, budeInfo, budenDerGasse, type GasseId, type Stufe } from '../buden';
import { MAX_RUNDEN, type Profil, type Runde, type StufenStand } from '../profil';

/** Eine Stufe ist geschafft mit mindestens 8 von 10 richtigen Antworten in einer Runde. */
export const SCHWELLE_GESCHAFFT = 0.8;
export const AUFGABEN_PRO_RUNDE = 10;
/** Feste Taler pro gespielter Runde, unabhängig vom Ergebnis. */
export const TALER_PRO_RUNDE = 10;
/** Einmaliger Bonus, wenn eine Stufe zum ersten Mal geschafft ist. */
export const TALER_STUFE_GESCHAFFT = 15;

export const rundeGeschafft = (r: Pick<Runde, 'richtig' | 'gesamt'>): boolean =>
  r.gesamt >= AUFGABEN_PRO_RUNDE && r.richtig / r.gesamt >= SCHWELLE_GESCHAFFT;

export const stufenStand = (p: Profil, bude: string, stufe: Stufe): StufenStand | undefined => p.fortschritt[bude]?.[stufe];

export const istGeschafft = (p: Profil, bude: string, stufe: Stufe): boolean => stufenStand(p, bude, stufe)?.geschafft === true;

/** Höchste geschaffte Stufe oder undefined. */
export function hoechsteStufe(p: Profil, bude: string): Stufe | undefined {
  let hoechste: Stufe | undefined;
  for (const s of STUFEN) if (istGeschafft(p, bude, s)) hoechste = s;
  return hoechste;
}

/** Wie die Bude in der Welt aussieht. Folgt allein aus dem gespeicherten Fortschritt. */
export type BudenZustand = 'grau' | 'licht' | 'farbe' | 'fest';
export function budenZustand(p: Profil, bude: string): BudenZustand {
  const h = hoechsteStufe(p, bude);
  return h === 'gold' ? 'fest' : h === 'silber' ? 'farbe' : h === 'bronze' ? 'licht' : 'grau';
}

export const gasseLaeuft = (p: Profil, gasse: GasseId): boolean => budenDerGasse(gasse).every((b) => istGeschafft(p, b.id, 'bronze'));

/** Sommerfest: alle Tagesbuden mindestens Bronze. Erreichbar ohne Zusatzpaket. */
export const sommerfest = (p: Profil): boolean => TAGESBUDEN.every((b) => istGeschafft(p, b.id, 'bronze'));

/** Sternenmarkt: Zusatzpaket und alle Tagesbuden mindestens Silber. */
export const abendmarktOffen = (p: Profil, paket: boolean): boolean => paket && KERNBUDEN.every((b) => istGeschafft(p, b.id, 'silber'));

export interface RundenErgebnis {
  profil: Profil;
  geschafft: boolean;
  ersterErfolg: boolean;
  neuerRekord: boolean;
  taler: number;
}

/** Verbucht eine Runde: Rekord, Verlauf, Taler. Gibt ein neues Profil zurück, das alte bleibt unverändert. */
export function rundeVerbuchen(p: Profil, r: Runde): RundenErgebnis {
  budeInfo(r.bude); // wirft bei unbekannter Bude
  const alt = stufenStand(p, r.bude, r.stufe) ?? { geschafft: false, rekord: 0, gespielt: 0, verlauf: [] };
  const geschafft = rundeGeschafft(r);
  const ersterErfolg = geschafft && !alt.geschafft;
  const neuerRekord = r.punkte > alt.rekord && alt.gespielt > 0;
  const stand: StufenStand = {
    geschafft: alt.geschafft || geschafft,
    rekord: Math.max(alt.rekord, r.punkte),
    gespielt: alt.gespielt + 1,
    verlauf: [...alt.verlauf, r.punkte].slice(-10),
  };
  const taler = TALER_PRO_RUNDE + (ersterErfolg ? TALER_STUFE_GESCHAFFT : 0);
  return {
    profil: {
      ...p,
      taler: p.taler + taler,
      fortschritt: { ...p.fortschritt, [r.bude]: { ...p.fortschritt[r.bude], [r.stufe]: stand } },
      runden: [...p.runden, r].slice(-MAX_RUNDEN),
    },
    geschafft,
    ersterErfolg,
    neuerRekord,
    taler,
  };
}
