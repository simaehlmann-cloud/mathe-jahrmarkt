import type { Dimension, KompetenzId } from './kompetenzen/modell';

export type Stufe = 'bronze' | 'silber' | 'gold';
export const STUFEN: readonly Stufe[] = ['bronze', 'silber', 'gold'];
export const STUFEN_NAME: Readonly<Record<Stufe, string>> = { bronze: 'Bronze', silber: 'Silber', gold: 'Gold' };

export type GasseId = 'zahlengasse' | 'groessenmarkt' | 'spiegelzelt' | 'musterbahn' | 'forschergasse' | 'abendmarkt';

export interface Gasse {
  id: GasseId;
  name: string;
  farbe: string;
}

export const GASSEN: readonly Gasse[] = [
  { id: 'zahlengasse', name: 'Zahlengasse', farbe: '#E4572E' },
  { id: 'groessenmarkt', name: 'Größenmarkt', farbe: '#17A398' },
  { id: 'spiegelzelt', name: 'Spiegelzelt-Gasse', farbe: '#7B5EA7' },
  { id: 'musterbahn', name: 'Musterbahn', farbe: '#F0A202' },
  { id: 'forschergasse', name: 'Forschergasse', farbe: '#3C78D8' },
  { id: 'abendmarkt', name: 'Sternenmarkt', farbe: '#2E2A4F' },
];

export interface BudeKompetenz {
  kompetenz: KompetenzId;
  dimension: Dimension;
}

export interface BudeInfo {
  id: string;
  nr: number;
  name: string;
  gasse: GasseId;
  mechanik: string;
  stufen: Readonly<Record<Stufe, string>>;
  kompetenzen: readonly BudeKompetenz[];
  /** Ist die Bude in dieser Version spielbar? */
  spielbar: boolean;
}

const b = (
  nr: number,
  id: string,
  name: string,
  gasse: GasseId,
  mechanik: string,
  stufen: [string, string, string],
  kompetenzen: BudeKompetenz[],
  spielbar = false,
): BudeInfo => ({
  id,
  nr,
  name,
  gasse,
  mechanik,
  stufen: { bronze: stufen[0], silber: stufen[1], gold: stufen[2] },
  kompetenzen,
  spielbar,
});

const k = (kompetenz: KompetenzId, dimension: Dimension = 'sicherheit'): BudeKompetenz => ({ kompetenz, dimension });

/** Alle Buden des Konzepts. Neue Buden werden nur hier und in src/buden/index.ts angemeldet. */
export const BUDEN: readonly BudeInfo[] = [
  b(1, 'dartbude', 'Dartbude', 'zahlengasse', 'Pfeile auf Ballons mit dem richtigen Ergebnis werfen',
    ['1×1-Kernaufgaben (·1, ·2, ·5, ·10)', 'ganzes 1×1', '1×1 und Umkehraufgaben gemischt'],
    [k('kopfrechnen', 'sicherheit'), k('operationsverstaendnis', 'wissen')], true),
  b(2, 'einmaleins-turbo', 'Einmaleins-Turbo', 'zahlengasse', 'Ergebnis eintippen, in Ruhe oder mit Turbo',
    ['Kernaufgaben', 'ganzes 1×1', 'Analogaufgaben wie 7·80'], [k('kopfrechnen'), k('kopfrechnen', 'anwendung')], true),
  b(3, 'dosenwerfen', 'Dosenwerfen', 'zahlengasse', 'den Dosenturm mit der passenden Zahl treffen',
    ['bis 1 000', 'bis 100 000', 'bis 1 000 000, Entbündeln'], [k('stellenwert', 'wissen'), k('stellenwert', 'sicherheit')], true),
  b(4, 'seilbahn', 'Zahlenstrahl-Seilbahn', 'zahlengasse', 'Gondel an die richtige Stelle ziehen',
    ['bis 1 000', 'bis 100 000', 'Ausschnitte, Nachbartausender'], [k('zahlverstaendnis'), k('zahlverstaendnis', 'wissen'), k('stellenwert', 'anwendung')], true),
  b(5, 'waage', 'Gleichgewichts-Waage', 'zahlengasse', 'die Waage ins Gleichgewicht bringen: fehlende Zahl finden, Terme vergleichen',
    ['Ergänzen bis 1 000', 'Terme vergleichen (<, =, >)', 'Platzhalter bei Mal und Geteilt'], [k('operationsverstaendnis', 'anwendung'), k('halbschriftlich', 'anwendung')], true),
  b(6, 'rechendomino', 'Rechendomino', 'zahlengasse', 'Aufgabe und Ergebnis zur Kette legen',
    ['Plus und Minus bis 1 000', 'Mal und Geteilt halbschriftlich', 'alle vier Rechenarten'], [k('halbschriftlich'), k('halbschriftlich', 'anwendung')], true),
  b(7, 'rechenwerkstatt', 'Rechen-Werkstatt', 'zahlengasse', 'schriftlich rechnen, Ziffer für Ziffer',
    ['Addition', 'Subtraktion im Verfahren der Schule', 'Multiplikation mit zweistelligem Faktor'], [k('schriftlich', 'wissen')], true),
  b(8, 'fehlerdetektiv', 'Fehlerdetektiv', 'zahlengasse', 'mit Überschlag prüfen, den Fehler in einer Rechnung antippen',
    ['schriftliche Addition', 'Subtraktion', 'Multiplikation'], [k('schriftlich', 'anwendung')], true),
  b(9, 'tresor', 'Zahlenrätsel-Tresor', 'zahlengasse', 'Hinweise lesen, Code knacken',
    ['bis 100', 'bis 1 000', 'Kombinatorik'], [k('zahlverstaendnis', 'anwendung')], true),
  b(10, 'kasse', 'Süßigkeitenkasse', 'groessenmarkt', 'passend bezahlen, Rückgeld geben, einkaufen',
    ['Euro und Cent', 'Kommaschreibweise', 'mit Budget einkaufen'], [k('groessen', 'anwendung')], true),
  b(11, 'schaetzbude', 'Schätz-Bude', 'groessenmarkt', 'Größe schätzen',
    ['Längen', 'Gewichte und Hohlmaße', 'Zeitspannen'], [k('groessen', 'wissen')], true),
  b(12, 'uhrkarussell', 'Uhr-Karussell', 'groessenmarkt', 'Zeiger stellen, Abfahrtszeiten lesen',
    ['volle, halbe, Viertelstunden', 'minutengenau', 'Zeitspannen'], [k('groessen')], true),
  b(13, 'umrechnungsmemory', 'Umrechnungs-Memory', 'groessenmarkt', 'Paare gleicher Größen finden',
    ['m und cm, € und ct', 'kg und g, l und ml', 'gemischte Schreibweisen'], [k('groessen')], true),
  b(14, 'achterbahn', 'Achterbahn-Architekt', 'groessenmarkt', 'Achterbahn bauen, Ziellänge treffen',
    ['Meter addieren', 'm, cm und km', 'Umfang, Messen'], [k('groessen', 'anwendung')], true),
  b(15, 'spiegelkabinett', 'Spiegelkabinett', 'spiegelzelt', 'Muster symmetrisch ergänzen',
    ['senkrechte Achse', 'waagerechte Achse', 'schräge Achse'], [k('raum')], true),
  b(16, 'wuerfelnetz', 'Würfelnetz-Werkstatt', 'spiegelzelt', 'prüfen, ob sich das Netz falten lässt',
    ['6 Netze', 'alle 11 Netze', 'gegenüberliegende Flächen'], [k('raum', 'wissen')], true),
  b(17, 'labyrinth', 'Labyrinth-Robo', 'spiegelzelt', 'Roboter mit Befehlen steuern',
    ['3 Befehle', 'Wege planen', 'kürzester Weg'], [k('raum', 'anwendung')], true),
  b(18, 'formensortierer', 'Formen-Sortierer', 'spiegelzelt', 'Figuren und Körper sortieren',
    ['Dreieck, Viereck, Kreis', 'Rechteck und Quadrat, Körper', 'Flächeninhalt'], [k('raum', 'wissen')], true),
  b(19, 'zeltdekorateur', 'Zelt-Dekorateur', 'spiegelzelt', 'Zeltbahnen mit Bandornamenten schmücken',
    ['Muster fortsetzen', 'Fehler finden', 'Verschiebung und Spiegelung'], [k('raum'), k('muster', 'anwendung')], true),
  b(20, 'zahlenfolgenzug', 'Zahlenfolgen-Zug', 'musterbahn', 'fehlenden Waggon einsetzen',
    ['plus und minus', 'mal und geteilt', 'zwei Regeln'], [k('muster')], true),
  b(21, 'rechenmauer', 'Rechenmauer', 'musterbahn', 'Mauersteine ergänzen',
    ['3 Ebenen', '4 Ebenen', 'rückwärts denken'], [k('muster', 'wissen'), k('operationsverstaendnis', 'anwendung')], true),
  b(22, 'riesenradtechniker', 'Riesenrad-Techniker', 'musterbahn', 'Gondeln besetzen und verteilen',
    ['Sitzplätze', 'Division mit Rest', 'Tabellen fortsetzen'], [k('operationsverstaendnis', 'anwendung'), k('muster', 'anwendung')], true),
  b(23, 'murmellabor', 'Murmel-Labor', 'forschergasse', 'Murmeln ziehen, Chancen einschätzen',
    ['sicher, möglich, unmöglich', 'Chancen einschätzen', 'zwei Tüten vergleichen'], [k('daten', 'wissen')], true),
  b(24, 'diagrammreporter', 'Diagramm-Reporter', 'forschergasse', 'Fragen zum Diagramm beantworten',
    ['Strichliste und Tabelle', 'Säulendiagramm', 'Balkendiagramm'], [k('daten', 'anwendung')], true),
  b(25, 'geisterbahn', 'Geisterbahn', 'abendmarkt', 'schriftliche Division, Schritt für Schritt',
    ['ohne Rest', 'mit Rest', 'Probe'], [k('klasse5')], true),
  b(26, 'pizzabaeckerei', 'Pizzabäckerei', 'abendmarkt', 'Pizzen in gleiche Teile schneiden',
    ['Stammbrüche', 'Anteile', 'gleichwertige Brüche'], [k('klasse5', 'wissen')], true),
  b(27, 'hauDenLukas', 'Hau den Lukas', 'abendmarkt', 'Dezimalzahl auf der Skala treffen',
    ['Zehntel', 'ordnen', 'Dezimalzahl und Bruch'], [k('klasse5')], true),
];

export const budeInfo = (id: string): BudeInfo => {
  const info = BUDEN.find((x) => x.id === id);
  if (!info) throw new Error(`Unbekannte Bude: ${id}`);
  return info;
};

export const budenDerGasse = (gasse: GasseId): BudeInfo[] => BUDEN.filter((x) => x.gasse === gasse);

/** Die 24 Buden des Tages-Jahrmarkts (ohne Sternenmarkt). */
export const TAGESBUDEN: readonly BudeInfo[] = BUDEN.filter((x) => x.gasse !== 'abendmarkt');
