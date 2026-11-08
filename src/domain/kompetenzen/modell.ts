/**
 * Kompetenzmodell nach dem Kerncurriculum Mathematik Grundschule Niedersachsen
 * (in Kraft seit August 2025): sechs basale Kompetenzen (Kap. 2.3) und die übrigen Leitideen.
 */

export type KompetenzId =
  | 'zahlverstaendnis'
  | 'operationsverstaendnis'
  | 'stellenwert'
  | 'kopfrechnen'
  | 'halbschriftlich'
  | 'schriftlich'
  | 'groessen'
  | 'raum'
  | 'muster'
  | 'daten'
  | 'klasse5';

/** Wissen: Konzept verstanden. Sicherheit: zuverlässig gelöst. Anwendung: in anderen Situationen. */
export type Dimension = 'wissen' | 'sicherheit' | 'anwendung';

export interface Kompetenz {
  id: KompetenzId;
  name: string;
  basal: boolean;
  /** Kurze, alltagstaugliche Ideen für Eltern. */
  tippsFuerZuHause: readonly string[];
}

export const KOMPETENZEN: Readonly<Record<KompetenzId, Kompetenz>> = {
  zahlverstaendnis: {
    id: 'zahlverstaendnis',
    name: 'Zahlverständnis',
    basal: true,
    tippsFuerZuHause: [
      'Hausnummern beim Spaziergang vergleichen: Welche Nummer kommt als Nächstes, welche ist doppelt so groß?',
      'Beim Einkaufen Preise der Größe nach ordnen lassen.',
    ],
  },
  operationsverstaendnis: {
    id: 'operationsverstaendnis',
    name: 'Operationsverständnis',
    basal: true,
    tippsFuerZuHause: [
      'Zu einer Malaufgabe eine kleine Geschichte erfinden lassen, z. B. „3 Tüten mit je 6 Äpfeln“.',
      'Fragen Sie nach der Umkehraufgabe: Wenn 6 · 7 = 42 ist, was ist dann 42 : 7?',
    ],
  },
  stellenwert: {
    id: 'stellenwert',
    name: 'Stellenwertverständnis',
    basal: true,
    tippsFuerZuHause: [
      'Lassen Sie Ihr Kind die Zahl 4 350 mit vier Tausendern, drei Hundertern und fünf Zehnern darstellen, z. B. mit Geldscheinen und Münzen.',
      'Große Zahlen aus der Zeitung vorlesen und erklären lassen, was jede Ziffer bedeutet.',
    ],
  },
  kopfrechnen: {
    id: 'kopfrechnen',
    name: 'Kopfrechnen',
    basal: true,
    tippsFuerZuHause: [
      'Beim Autofahren oder Warten zwei, drei Einmaleins-Aufgaben stellen, gern auch rückwärts: „Was mal 7 ist 56?“',
      'Schwierige Aufgaben aus leichten ableiten lassen: 7 · 8 ist 5 · 8 plus 2 · 8.',
    ],
  },
  halbschriftlich: {
    id: 'halbschriftlich',
    name: 'Halbschriftliches Rechnen',
    basal: true,
    tippsFuerZuHause: ['Fragen Sie, wie Ihr Kind gerechnet hat, und lassen Sie zwei verschiedene Wege zeigen.'],
  },
  schriftlich: {
    id: 'schriftlich',
    name: 'Schriftliches Rechnen',
    basal: true,
    tippsFuerZuHause: ['Eine schriftliche Rechnung mit dem Überschlag prüfen lassen: Kann das Ergebnis ungefähr stimmen?'],
  },
  groessen: {
    id: 'groessen',
    name: 'Größen und Messen',
    basal: false,
    tippsFuerZuHause: ['Beim Kochen Mengen abmessen und umrechnen lassen, z. B. 1,5 l in ml.'],
  },
  raum: {
    id: 'raum',
    name: 'Raum und Form',
    basal: false,
    tippsFuerZuHause: ['Verpackungen aufschneiden und als Netz flach legen: Welche Flächen lagen gegenüber?'],
  },
  muster: {
    id: 'muster',
    name: 'Muster und Strukturen',
    basal: false,
    tippsFuerZuHause: ['Zahlenfolgen erfinden und gegenseitig die Regel raten.'],
  },
  daten: {
    id: 'daten',
    name: 'Daten und Zufall',
    basal: false,
    tippsFuerZuHause: ['Mit einer Strichliste zählen, welche Autofarben vorbeifahren, und daraus ein Säulendiagramm malen.'],
  },
  klasse5: {
    id: 'klasse5',
    name: 'Start in Klasse 5',
    basal: false,
    tippsFuerZuHause: ['Pizza oder Kuchen gerecht teilen und die Anteile benennen lassen.'],
  },
};

export const KOMPETENZ_REIHENFOLGE: readonly KompetenzId[] = [
  'zahlverstaendnis',
  'operationsverstaendnis',
  'stellenwert',
  'kopfrechnen',
  'halbschriftlich',
  'schriftlich',
  'groessen',
  'raum',
  'muster',
  'daten',
];
