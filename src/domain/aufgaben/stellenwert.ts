import type { Stufe } from '../buden';
import { zahlInWorten } from '../elternsperre';
import type { Rng } from '../rng';
import { OPTIONEN_PRO_AUFGABE, fehlerkatalog, type Gewichtung } from './einmaleins';
import type { Aufgabe, Baustein, FehlerArt, StellenwertAufgabe } from './typen';

/**
 * Stellenwert-Aufgaben für das Dosenwerfen (KC: Zahlen bis 1 000 000, Stellenwertverständnis, Bündeln).
 * Typische Fehler sind die Grundlage der falschen Dosen: Null vergessen, Ziffern in Hör-Reihenfolge,
 * nicht entbündelt.
 */

export const STELLEN_KURZ = ['E', 'Z', 'H', 'T', 'ZT', 'HT'] as const;
export const STELLEN_NAME = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender', 'Hunderttausender'] as const;

type Form = StellenwertAufgabe['form'];

/** Zahl mit schmalem Leerzeichen in Dreiergruppen, wie in der Schule: 34 052. */
export const zahlText = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export const ausBausteinen = (b: readonly Baustein[]): number => b.reduce((s, x) => s + x.anzahl * 10 ** x.stelle, 0);

/** Zerlegt eine Zahl in ihre Stellen (ohne Nullen), höchste zuerst. */
export function bausteineVon(n: number): Baustein[] {
  const liste: Baustein[] = [];
  const ziffern = String(n);
  for (let i = 0; i < ziffern.length; i++) {
    const anzahl = Number(ziffern[i]);
    if (anzahl > 0) liste.push({ stelle: ziffern.length - 1 - i, anzahl });
  }
  return liste;
}

const bausteinText = (b: Baustein): string => `${b.anzahl} ${STELLEN_KURZ[b.stelle]}`;
const bausteinSprech = (b: Baustein): string => `${b.anzahl} ${STELLEN_NAME[b.stelle]}`;

/** Wie viele Stellen die Zahlen der Stufe haben (höchste Stelle). */
const hoechsteStelle = (stufe: Stufe): number => (stufe === 'bronze' ? 2 : stufe === 'silber' ? 4 : 5);

const FORMEN: Readonly<Record<Stufe, readonly Form[]>> = {
  bronze: ['tafel', 'wort', 'ziffer'],
  silber: ['tafel', 'wort', 'ziffer'],
  gold: ['buendeln', 'wort', 'tafel'],
};

let zaehler = 0;
const neueId = (): string => `s${++zaehler}`;

/** Zahl mit `stellen` Stellen; mit Null-Lücken, wenn `mitNull`. */
function zufallsZahl(hoechste: number, mitNull: boolean, rng: Rng): number {
  const ziffern: number[] = [rng.int(1, 9)];
  for (let s = hoechste - 1; s >= 0; s--) ziffern.push(rng.int(1, 9));
  if (mitNull && ziffern.length >= 3) {
    // ein oder zwei Nullen, nie an der höchsten Stelle
    const anzahl = ziffern.length >= 5 && rng.next() < 0.5 ? 2 : 1;
    const stellen = rng.shuffle(ziffern.slice(1).map((_, i) => i + 1)).slice(0, anzahl);
    for (const i of stellen) ziffern[i] = 0;
  }
  return Number(ziffern.join(''));
}

/** Schlüssel für Adaptivität: Form und ob Nullen vorkommen (die häufigste Fehlerquelle). */
const schluessel = (form: Form, mitNull: boolean): string => `stw:${form}${mitNull ? '-0' : ''}`;

export function stellenwertAufgabe(stufe: Stufe, rng: Rng, gewichtung: Gewichtung = () => 1): StellenwertAufgabe {
  const varianten = FORMEN[stufe].flatMap((form) => [
    { form, mitNull: false },
    { form, mitNull: true },
  ]);
  const v = rng.weighted(varianten, (x) => (x.mitNull ? 1.3 : 1) * gewichtung(schluessel(x.form, x.mitNull)));
  return baueStellenwert(v.form, stufe, v.mitNull, rng);
}

/** Nach einem Fehler: dieselbe Form, ähnliche Größe, wieder mit oder ohne Null. */
export function aehnlicheStellenwert(vorher: Aufgabe, rng: Rng): StellenwertAufgabe {
  if (vorher.art !== 'stellenwert') throw new Error(`Keine Stellenwert-Aufgabe: ${vorher.text}`);
  const stellen = String(vorher.zahl).length - 1;
  const stufe: Stufe = stellen <= 2 ? 'bronze' : stellen <= 4 ? 'silber' : 'gold';
  return baueStellenwert(vorher.form, stufe, vorher.fakt.endsWith('-0'), rng);
}

export const stellenwertProbe = (rng: Rng): StellenwertAufgabe => {
  const bausteine = [
    { stelle: 2, anzahl: 2 },
    { stelle: 1, anzahl: 3 },
    { stelle: 0, anzahl: 5 },
  ];
  return fertig('tafel', 235, bausteine, '2 H 3 Z 5 E', '2 Hunderter, 3 Zehner, 5 Einer. Welche Zahl ist das?', false, rng);
};

export function baueStellenwert(form: Form, stufe: Stufe, mitNull: boolean, rng: Rng): StellenwertAufgabe {
  const hoechste = hoechsteStelle(stufe);
  switch (form) {
    case 'tafel': {
      const zahl = zufallsZahl(rng.int(Math.max(2, hoechste - 1), hoechste), mitNull, rng);
      const b = bausteineVon(zahl);
      // Ab Silber manchmal durcheinander, damit nicht nur abgeschrieben wird
      const gezeigt = stufe !== 'bronze' && rng.next() < 0.4 ? rng.shuffle(b) : b;
      return fertig(
        'tafel',
        zahl,
        b,
        gezeigt.map(bausteinText).join(' '),
        `${gezeigt.map(bausteinSprech).join(', ')}. Welche Zahl ist das?`,
        mitNull,
        rng,
      );
    }
    case 'wort': {
      const zahl = zufallsZahl(rng.int(Math.max(2, hoechste - 1), hoechste), mitNull, rng);
      const wort = zahlInWorten(zahl);
      return fertig('wort', zahl, bausteineVon(zahl), wort, `Welche Zahl ist ${wort}?`, mitNull, rng);
    }
    case 'ziffer': {
      // Ziffern alle verschieden, damit „die 4“ eindeutig ist
      let zahl = 0;
      do zahl = zufallsZahl(rng.int(Math.max(2, hoechste - 1), hoechste), mitNull, rng);
      while (new Set(String(zahl).replace(/0/g, '')).size !== String(zahl).replace(/0/g, '').length);
      const b = bausteineVon(zahl);
      const ziel = rng.pick(b.filter((x) => x.stelle >= 1));
      const wert = ziel.anzahl * 10 ** ziel.stelle;
      return fertig(
        'ziffer',
        wert,
        [ziel],
        `Wert der ${ziel.anzahl} in ${zahlText(zahl)}`,
        `Welchen Wert hat die Ziffer ${ziel.anzahl} in der Zahl ${zahl}?`,
        mitNull,
        rng,
        zahl,
      );
    }
    case 'buendeln': {
      // Eine Stelle mit 10 bis 19 Bündeln, z. B. 4 T 13 H 5 Z = 5 350
      const zahl = zufallsZahl(rng.int(3, 4), mitNull, rng);
      const b = bausteineVon(zahl);
      const kandidaten = b.filter((x) => x.stelle >= 1 && x.stelle < String(zahl).length - 1);
      const ueber = kandidaten.length > 0 ? rng.pick(kandidaten) : (b[b.length - 1] as Baustein);
      const gezeigt = b.map((x) => (x === ueber ? { ...x, anzahl: x.anzahl + 10 } : x));
      // Die nächsthöhere Stelle verliert einen Bündel, damit die Summe stimmt.
      const hoeher = gezeigt.find((x) => x.stelle === ueber.stelle + 1);
      let liste = gezeigt;
      if (hoeher && hoeher.anzahl > 1) liste = gezeigt.map((x) => (x === hoeher ? { ...x, anzahl: x.anzahl - 1 } : x));
      else if (hoeher) liste = gezeigt.filter((x) => x !== hoeher);
      const wert = ausBausteinen(liste);
      return fertig(
        'buendeln',
        wert,
        liste,
        liste.map(bausteinText).join(' '),
        `${liste.map(bausteinSprech).join(', ')}. Welche Zahl ist das?`,
        mitNull,
        rng,
      );
    }
  }
}

function fertig(
  form: Form,
  antwort: number,
  bausteine: Baustein[],
  text: string,
  sprechtext: string,
  mitNull: boolean,
  rng: Rng,
  ganzeZahl = antwort,
): StellenwertAufgabe {
  const fehler = typischeFehler(form, antwort, bausteine, ganzeZahl);
  const katalog = fehlerkatalog(antwort, fehler).slice(1);
  // Die ersten typischen Fehler bevorzugt, dann auffüllen
  const falsche = katalog.slice(0, OPTIONEN_PRO_AUFGABE - 1);
  let schritt = 1;
  const gesehen = new Set([antwort, ...falsche.map((f) => f.wert)]);
  const basis = 10 ** Math.max(0, String(antwort).length - 2);
  while (falsche.length < OPTIONEN_PRO_AUFGABE - 1) {
    const x = antwort + schritt * basis * (schritt % 2 === 0 ? -1 : 1);
    if (x > 0 && !gesehen.has(x)) {
      gesehen.add(x);
      falsche.push({ wert: x, fehlerArt: 'sonstige' });
    }
    schritt++;
  }
  return {
    id: neueId(),
    text,
    sprechtext,
    antwort,
    optionen: rng.shuffle([{ wert: antwort }, ...falsche]),
    kompetenz: 'stellenwert',
    dimension: form === 'buendeln' || form === 'ziffer' ? 'wissen' : 'sicherheit',
    fakt: schluessel(form, mitNull),
    art: 'stellenwert',
    form,
    zahl: ganzeZahl,
    bausteine,
  };
}

/** Falsche Antworten aus typischen Fehlvorstellungen, wichtigste zuerst. */
export function typischeFehler(form: Form, antwort: number, bausteine: readonly Baustein[], ganzeZahl: number): { wert: number; fehlerArt: FehlerArt }[] {
  const f: { wert: number; fehlerArt: FehlerArt }[] = [];
  const ziffernOhneNull = Number(bausteine.map((b) => b.anzahl).join(''));
  switch (form) {
    case 'tafel':
    case 'wort': {
      // Nullen vergessen: 3 T 5 Z → 35
      if (ziffernOhneNull !== antwort) f.push({ wert: ziffernOhneNull, fehlerArt: 'stelle' });
      // Geschrieben wie gesprochen: dreitausendfünfzig → 300050
      const gesprochen = Number(bausteine.map((b) => String(b.anzahl * 10 ** b.stelle)).join(''));
      if (gesprochen !== antwort && bausteine.length > 1) f.push({ wert: gesprochen, fehlerArt: 'stelle' });
      // Zahlendreher bei Zehnern und Einern (siebenundvierzig → 74)
      const z = Math.floor(antwort / 10) % 10;
      const e = antwort % 10;
      if (z !== e && z > 0 && e > 0) f.push({ wert: antwort - z * 10 - e + e * 10 + z, fehlerArt: 'ziffern' });
      // Eine Stelle verrutscht
      const hoechste = bausteine.reduce((m, b) => Math.max(m, b.stelle), 0);
      const oben = bausteine.find((b) => b.stelle === hoechste);
      if (oben) f.push({ wert: antwort + oben.anzahl * 9 * 10 ** oben.stelle, fehlerArt: 'stelle' });
      f.push({ wert: antwort * 10, fehlerArt: 'stelle' });
      break;
    }
    case 'ziffer': {
      const b = bausteine[0];
      if (b) {
        f.push({ wert: b.anzahl, fehlerArt: 'stelle' });
        if (b.stelle >= 2) f.push({ wert: b.anzahl * 10 ** (b.stelle - 1), fehlerArt: 'stelle' });
        f.push({ wert: b.anzahl * 10 ** (b.stelle + 1), fehlerArt: 'stelle' });
        f.push({ wert: ganzeZahl, fehlerArt: 'sonstige' });
      }
      break;
    }
    case 'buendeln': {
      // Ziffernfolge abgeschrieben: 4 T 13 H 5 Z → 41350
      const abgeschrieben = Number(bausteine.map((b) => String(b.anzahl)).join('') + '0'.repeat(bausteine[bausteine.length - 1]?.stelle ?? 0));
      if (abgeschrieben !== antwort) f.push({ wert: abgeschrieben, fehlerArt: 'buendel' });
      // Übertrag vergessen: 13 H nur als 3 H
      const ohneUebertrag = bausteine.reduce((s, b) => s + (b.anzahl % 10) * 10 ** b.stelle, 0);
      if (ohneUebertrag !== antwort) f.push({ wert: ohneUebertrag, fehlerArt: 'buendel' });
      f.push({ wert: antwort + 10 ** ((bausteine.find((b) => b.anzahl >= 10)?.stelle ?? 1) + 1), fehlerArt: 'buendel' });
      f.push({ wert: antwort * 10, fehlerArt: 'stelle' });
      break;
    }
  }
  return f.filter((x) => x.wert > 0 && Number.isInteger(x.wert));
}
