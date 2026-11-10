/**
 * Flinka am Eingang: Wer zu ihr läuft, bekommt einen Tipp – was als Nächstes sinnvoll ist,
 * einen Rechentrick und ab und zu eine kleine Knobelfrage. Rein aus dem Profil berechnet.
 */
import type { AuftragsTag } from './auftraege';
import { frischmacher } from './auftraege';
import { spieltageDieseWoche, WOCHENZIEL_TAGE } from './belohnungen';
import { budeInfo, STUFEN, STUFEN_NAME, TAGESBUDEN, type Stufe } from './buden';
import { istGeschafft } from './fortschritt/fortschritt';
import { stufeFreigabe } from './fortschritt/kaufgrenze';
import type { Profil } from './profil';
import type { Rng } from './rng';
import { faellige } from './fundbuero';

export const RECHENTRICKS: readonly string[] = [
  'Mal 5 geht schnell: erst mal 10, dann halbieren. 5 · 18 = 180 : 2 = 90.',
  'Mal 9: erst mal 10, dann einmal abziehen. 9 · 7 = 70 − 7 = 63.',
  'Mal 4 ist zweimal verdoppeln: 4 · 13 → 26 → 52.',
  'Plus 99: erst plus 100, dann 1 weg. 245 + 99 = 345 − 1 = 344.',
  'Minus 98: erst minus 100, dann 2 dazu. 520 − 98 = 420 + 2 = 422.',
  'Tauschaufgabe: 3 · 8 ist dasselbe wie 8 · 3. Nimm die, die du besser kannst.',
  'Geteilt durch 5: erst geteilt durch 10, dann verdoppeln. 240 : 5 = 24 · 2 = 48.',
  'Nachbaraufgabe: 6 · 8 weißt du nicht? 5 · 8 = 40, dann noch einmal 8 dazu: 48.',
  'Ergänzen bis zum nächsten Hunderter: 370 + 30 = 400. Das hilft beim Rückgeld.',
  'Überschlagen: 398 + 207 ist ungefähr 400 + 200 = 600. So merkst du Tippfehler.',
  '1 m sind 100 cm, 1 km sind 1 000 m, 1 kg sind 1 000 g, 1 l sind 1 000 ml.',
  'Eine Viertelstunde sind 15 Minuten, eine halbe Stunde 30, eine Dreiviertelstunde 45.',
  'Gerade Zahlen enden auf 0, 2, 4, 6 oder 8. Dann kannst du sie halbieren.',
  'Mal 11 bei zweistelligen Zahlen: 11 · 23 → 2, 2+3, 3 → 253.',
  'Doppelt so viel und halb so viel: 4 · 25 = 2 · 50 = 1 · 100 = 100.',
  'Beim Quadrat sind alle vier Seiten gleich lang. Umfang = 4 · Seite.',
  'Der Zähler zählt, der Nenner nennt: 3/4 heißt drei Stücke von vier gleich großen.',
  '0,5 ist dasselbe wie die Hälfte, 0,25 wie ein Viertel.',
];

export interface Knobelfrage {
  frage: string;
  antwort: string;
}

export const KNOBELFRAGEN: readonly Knobelfrage[] = [
  { frage: 'Ich denke mir eine Zahl, verdopple sie und erhalte 18. Welche Zahl war es?', antwort: '9, denn 9 · 2 = 18.' },
  { frage: 'Was ist mehr: 3 Hunderter oder 29 Zehner?', antwort: '3 Hunderter = 300, 29 Zehner = 290. Also 3 Hunderter.' },
  { frage: 'Wie viele Minuten haben zwei Stunden?', antwort: '120 Minuten.' },
  { frage: 'Welche Zahl liegt genau in der Mitte zwischen 40 und 60?', antwort: '50.' },
  { frage: 'Ein Würfel hat wie viele Ecken?', antwort: '8 Ecken.' },
  { frage: 'Wie viele 50-Cent-Münzen sind 3 Euro?', antwort: '6 Münzen.' },
  { frage: 'Was kommt als Nächstes: 3, 6, 12, 24, …?', antwort: '48 – jedes Mal verdoppelt.' },
  { frage: 'Wie viele Beine haben 4 Katzen und 2 Hühner zusammen?', antwort: '4 · 4 + 2 · 2 = 20 Beine.' },
  { frage: 'Welche Zahl ist größer: 0,7 oder 0,65?', antwort: '0,7 – das sind 70 Hundertstel, 0,65 nur 65.' },
  { frage: 'Ein Zaun ist 10 m lang. Alle 2 m steht ein Pfosten, auch an beiden Enden. Wie viele Pfosten?', antwort: '6 Pfosten.' },
];

/** Der nächste sinnvolle Schritt: eine Bude mit der Stufe, die als Nächstes dran wäre. */
export function naechsteStufe(p: Profil, paket: boolean): { bude: string; stufe: Stufe } | undefined {
  for (const s of STUFEN) {
    for (const b of TAGESBUDEN) {
      if (istGeschafft(p, b.id, s)) continue;
      if (!stufeFreigabe(p, b.id, s, paket).frei) continue;
      return { bude: b.id, stufe: s };
    }
  }
  return undefined;
}

/** Sätze für Flinkas Sprechblase. Mit `rng` wird der Rechentrick bzw. die Frage gewählt. */
export function flinkaTipp(p: Profil, auftraege: AuftragsTag | null, paket: boolean, jetzt: Date, rng: Rng): string[] {
  const saetze: string[] = [];
  const offen = (auftraege?.liste ?? []).filter((a) => !a.erledigt);
  if (offen.length) {
    const a = offen[0];
    saetze.push(
      `Hallo ${p.name}! ${offen.length === 1 ? 'Ein Auftrag wartet' : `${offen.length} Aufträge warten`} noch auf dich – zum Beispiel ${budeInfo(a?.bude ?? '').name}. Die Fähnchen zeigen dir den Weg.`,
    );
  } else {
    saetze.push(`Hallo ${p.name}! Deine Aufträge für heute sind erledigt. Stark!`);
  }
  const fund = faellige(p.fundbuero, jetzt.getTime()).length;
  if (fund) saetze.push(`Im Fundbüro ${fund === 1 ? 'wartet eine Aufgabe' : `warten ${fund} Aufgaben`} auf dich, bei denen du dich vertan hattest. Hol sie ab – du findest das Fundbüro im Menü oben rechts.`);
  const frisch = frischmacher(p, paket, jetzt.getTime())[0];
  const naechste = naechsteStufe(p, paket);
  if (frisch) saetze.push(`Bei der Bude ${budeInfo(frisch.bude).name} warst du lange nicht. Schau mal wieder vorbei, damit nichts einrostet.`);
  else if (naechste) saetze.push(`Als Nächstes könntest du ${STUFEN_NAME[naechste.stufe]} bei ${budeInfo(naechste.bude).name} schaffen.`);
  const tage = spieltageDieseWoche(p, jetzt);
  if (tage < WOCHENZIEL_TAGE) saetze.push(`Diese Woche hast du an ${tage === 1 ? 'einem Tag' : `${tage} Tagen`} gespielt. Bei ${WOCHENZIEL_TAGE} Tagen gibt es Extra-Blöcke.`);
  // Abwechselnd ein Rechentrick oder eine kleine Knobelfrage (die Antwort kommt in der nächsten Blase)
  if (rng.int(0, 2) === 0) {
    const k = rng.pick(KNOBELFRAGEN);
    saetze.push(`Kleine Knobelfrage: ${k.frage}`, `Die Lösung: ${k.antwort}`);
  } else {
    saetze.push(`Mein Rechentrick: ${rng.pick(RECHENTRICKS)}`);
  }
  return saetze;
}
