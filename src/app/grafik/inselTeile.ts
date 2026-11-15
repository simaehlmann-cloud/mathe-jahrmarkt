import { TUER_OBEN } from '../../domain/insel';

/**
 * Zeichenbausteine der Bauinsel (isometrisch): Quader und Einrichtung als Flächen.
 * Getrennt von InselWelt, damit der Andenkenstand und die Werkzeugleiste dieselben Bilder als Vorschau zeigen.
 */
export type Seite = 'oben' | 'links' | 'rechts';
export interface Flaeche {
  punkte: string;
  farbe: string;
  seite?: Seite;
}

/** Halbe Feldbreite und Ebenenhöhe in Bildpunkten. */
export const A = 22;
export const C = 25;

type Dreh = (x: number, y: number) => [number, number];

// Häufige Farben (oben, links, rechts)
const HOLZ: [string, string, string] = ['#d9a066', '#9c6634', '#b57a42'];
const DUNKELHOLZ: [string, string, string] = ['#87521f', '#6b3f17', '#7a4a22'];
const WEISS: [string, string, string] = ['#fbfaf5', '#d7dae6', '#e6e8f0'];
const METALL: [string, string, string] = ['#b7bccb', '#8b90a3', '#9ca1b4'];
const SCHWARZ: [string, string, string] = ['#3a3d4f', '#2a2c3a', '#33364a'];
const GRUEN: [string, string, string] = ['#4fbf78', '#2b8550', '#3fae6a'];
const ROT: [string, string, string] = ['#e23a4e', '#a82838', '#c22f42'];
const BLAU: [string, string, string] = ['#3c78d8', '#2a5aa8', '#3368bf'];
const GELB: [string, string, string] = ['#ffc62b', '#c99a0e', '#e3b222'];

export function zeichner(dreh: Dreh) {
  /** Quader von (x0, y0, z0) bis (x1, y1, z1) in Plan-Koordinaten: sichtbare Seiten nach der Drehung + Deckel. */
  function quader(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, oben: string, links: string, rechts: string): Flaeche[] {
    const ecken = [dreh(x0, y0), dreh(x1, y1)];
    const ax0 = Math.min(ecken[0]![0], ecken[1]![0]);
    const ax1 = Math.max(ecken[0]![0], ecken[1]![0]);
    const ay0 = Math.min(ecken[0]![1], ecken[1]![1]);
    const ay1 = Math.max(ecken[0]![1], ecken[1]![1]);
    // In gedrehten Koordinaten zeichnen (P mit Drehung 0)
    const Q = (a: number, b: number, z: number): string => `${(a - b) * A},${((a + b) * A) / 2 - z * C}`;
    return [
      { punkte: `${Q(ax1, ay0, z0)} ${Q(ax1, ay1, z0)} ${Q(ax1, ay1, z1)} ${Q(ax1, ay0, z1)}`, farbe: links, seite: 'links' },
      { punkte: `${Q(ax0, ay1, z0)} ${Q(ax1, ay1, z0)} ${Q(ax1, ay1, z1)} ${Q(ax0, ay1, z1)}`, farbe: rechts, seite: 'rechts' },
      { punkte: `${Q(ax0, ay0, z1)} ${Q(ax1, ay0, z1)} ${Q(ax1, ay1, z1)} ${Q(ax0, ay1, z1)}`, farbe: oben, seite: 'oben' },
    ];
  }

  /** Teile einer Einrichtung (Kennung ab 100) als Quader. */
  function moebel(art: number, x: number, y: number, z: number): Flaeche[] {
    const q = (a: number, b: number, c: number, d: number, e: number, f: number, o: string, l: string, rr: string) => quader(x + a, y + b, z + c, x + d, y + e, z + f, o, l, rr);
    const k = (a: number, b: number, c: number, d: number, e: number, f: number, farbe: readonly [string, string, string]) => q(a, b, c, d, e, f, farbe[0], farbe[1], farbe[2]);
    switch (art) {
      case 101:
      case TUER_OBEN:
        return q(0, 0, 0, 1, 1, 1, '#9c6634', '#7a4a22', '#8a5a2b');
      case 102:
        return q(0, 0, 0, 1, 1, 1, '#f3ead6', '#d9cdb0', '#e6dcc2');
      case 103:
        return [...k(0, 0, 0, 1, 1, 0.5, HOLZ), ...k(0, 0, 0.5, 1, 0.5, 1, HOLZ)];
      case 104: // Säule
        return [...k(0.15, 0.15, 0, 0.85, 0.85, 0.12, WEISS), ...k(0.28, 0.28, 0.12, 0.72, 0.72, 0.88, WEISS), ...k(0.15, 0.15, 0.88, 0.85, 0.85, 1, WEISS)];
      case 105: // Gartentor (begehbar)
        return [...k(0.02, 0.4, 0, 0.14, 0.6, 0.8, DUNKELHOLZ), ...k(0.86, 0.4, 0, 0.98, 0.6, 0.8, DUNKELHOLZ), ...k(0.14, 0.46, 0.55, 0.86, 0.54, 0.65, HOLZ), ...k(0.14, 0.46, 0.15, 0.86, 0.54, 0.25, HOLZ)];
      case 106: // Laterne an der Wand: Pfahl mit Licht
        return [...k(0.44, 0.44, 0, 0.56, 0.56, 0.6, SCHWARZ), ...k(0.36, 0.36, 0.6, 0.64, 0.64, 0.9, ['#ffe57a', '#f2c41b', '#ffd54a'])];
      case 110:
        return [...k(0.08, 0.05, 0, 0.92, 0.95, 0.35, BLAU), ...k(0.15, 0.08, 0.35, 0.85, 0.3, 0.5, WEISS)];
      case 111:
        return q(0.12, 0.2, 0, 0.88, 0.8, 1, '#b57a42', '#87521f', '#9c6634');
      case 112:
        return [
          ...k(0.15, 0.15, 0, 0.22, 0.22, 0.55, DUNKELHOLZ),
          ...k(0.78, 0.15, 0, 0.85, 0.22, 0.55, DUNKELHOLZ),
          ...k(0.15, 0.78, 0, 0.22, 0.85, 0.55, DUNKELHOLZ),
          ...k(0.78, 0.78, 0, 0.85, 0.85, 0.55, DUNKELHOLZ),
          ...k(0.08, 0.08, 0.55, 0.92, 0.92, 0.65, HOLZ),
        ];
      case 113:
        return [...k(0.42, 0.42, 0, 0.58, 0.58, 0.75, SCHWARZ), ...k(0.3, 0.3, 0.75, 0.7, 0.7, 0.95, ['#ffe57a', '#f2c41b', '#ffd54a'])];
      case 114:
        return [...q(0.3, 0.3, 0, 0.7, 0.7, 0.3, '#c26a2c', '#9c4f1c', '#ad5c24'), ...k(0.2, 0.2, 0.3, 0.8, 0.8, 0.85, GRUEN)];
      case 115:
        return [...k(0.05, 0.4, 0, 0.2, 0.6, 0.7, ['#b9763f', '#87521f', '#9c6634']), ...k(0.8, 0.4, 0, 0.95, 0.6, 0.7, ['#b9763f', '#87521f', '#9c6634']), ...k(0, 0.45, 0.4, 1, 0.55, 0.55, HOLZ)];
      case 116:
        return [...k(0.1, 0.25, 0, 0.9, 0.85, 0.35, ROT), ...k(0.1, 0.65, 0.35, 0.9, 0.85, 0.75, ROT)];
      case 117:
        return [...k(0.25, 0.25, 0, 0.75, 0.75, 0.4, HOLZ), ...k(0.25, 0.65, 0.4, 0.75, 0.75, 0.9, HOLZ)];
      case 118:
        return [...q(0.1, 0.35, 0, 0.9, 0.65, 1, '#b57a42', '#87521f', '#9c6634'), ...k(0.15, 0.3, 0.3, 0.85, 0.4, 0.38, BLAU), ...k(0.15, 0.3, 0.65, 0.85, 0.4, 0.73, GRUEN)];
      case 120:
      case 121:
      case 122: {
        const bl = art === 120 ? '#e23a4e' : art === 121 ? '#ffc62b' : '#3c78d8';
        return [...k(0.47, 0.47, 0, 0.53, 0.53, 0.5, GRUEN), ...q(0.33, 0.33, 0.5, 0.67, 0.67, 0.7, bl, bl, bl)];
      }
      case 123:
        return q(0.05, 0.2, 0, 0.95, 0.8, 0.8, '#3d9a5a', '#2b7544', '#33854e');
      case 124:
        return [...k(0.1, 0.3, 0, 0.18, 0.7, 0.3, SCHWARZ), ...k(0.82, 0.3, 0, 0.9, 0.7, 0.3, SCHWARZ), ...k(0.05, 0.3, 0.3, 0.95, 0.7, 0.4, HOLZ), ...k(0.05, 0.62, 0.4, 0.95, 0.7, 0.75, HOLZ)];
      case 125:
        return [...k(0.05, 0.05, 0, 0.95, 0.95, 0.45, METALL), ...q(0.18, 0.18, 0.45, 0.82, 0.82, 0.5, '#6cc3ec', '#4aa2d4', '#5ab3e0'), ...k(0.42, 0.42, 0.5, 0.58, 0.58, 0.9, METALL)];
      case 126:
        return [...k(0.45, 0.45, 0, 0.55, 0.55, 0.85, SCHWARZ), ...k(0.36, 0.36, 0.85, 0.64, 0.64, 1, ['#ffe57a', '#f2c41b', '#ffd54a'])];
      case 127:
        return [...q(0.05, 0.05, 0, 0.95, 0.95, 0.25, '#7a4a22', '#5a3416', '#6b3f1b'), ...q(0.15, 0.15, 0.25, 0.85, 0.85, 0.3, '#5a3416', '#4a2a10', '#4f2e12')];
      // --- Wohnen (seit 0.12) ---
      case 130: // Badewanne
        return [...k(0.05, 0.15, 0, 0.95, 0.85, 0.4, WEISS), ...q(0.15, 0.25, 0.4, 0.85, 0.75, 0.42, '#8fd0f2', '#6cc3ec', '#7cc9ee'), ...k(0.78, 0.45, 0.4, 0.85, 0.55, 0.6, METALL)];
      case 131: // Teppich (begehbar)
        return [...q(0.04, 0.04, 0, 0.96, 0.96, 0.04, '#e86f51', '#b84a33', '#c95a40'), ...q(0.2, 0.2, 0.04, 0.8, 0.8, 0.05, '#ffc62b', '#c99a0e', '#e3b222')];
      case 132: // Kamin
        return [...q(0.05, 0.25, 0, 0.95, 0.75, 0.8, '#c2533f', '#a8402f', '#b54a37'), ...k(0.25, 0.2, 0.1, 0.75, 0.3, 0.45, SCHWARZ), ...q(0.33, 0.18, 0.12, 0.67, 0.22, 0.3, '#ffb03b', '#ff8a1f', '#ff9a2a'), ...k(0, 0.2, 0.8, 1, 0.8, 0.9, METALL)];
      case 133: // Herd
        return [...k(0.08, 0.08, 0, 0.92, 0.92, 0.6, WEISS), ...k(0.2, 0.2, 0.6, 0.42, 0.42, 0.63, SCHWARZ), ...k(0.58, 0.58, 0.6, 0.8, 0.8, 0.63, SCHWARZ), ...k(0.2, 0.05, 0.12, 0.8, 0.08, 0.45, SCHWARZ)];
      case 134: // Kühlschrank
        return [...k(0.12, 0.15, 0, 0.88, 0.85, 1, WEISS), ...k(0.75, 0.1, 0.55, 0.8, 0.15, 0.85, METALL)];
      case 135: // Fernseher auf Schränkchen
        return [...k(0.1, 0.3, 0, 0.9, 0.7, 0.35, DUNKELHOLZ), ...k(0.12, 0.45, 0.35, 0.88, 0.55, 0.9, SCHWARZ), ...q(0.16, 0.44, 0.4, 0.84, 0.45, 0.85, '#5b8de0', '#4a7bd0', '#5b8de0')];
      case 136: // Sessel
        return [...k(0.12, 0.15, 0, 0.88, 0.85, 0.35, GRUEN), ...k(0.12, 0.65, 0.35, 0.88, 0.85, 0.8, GRUEN), ...k(0.12, 0.15, 0.35, 0.22, 0.65, 0.55, GRUEN), ...k(0.78, 0.15, 0.35, 0.88, 0.65, 0.55, GRUEN)];
      case 137: // Standuhr
        return [...k(0.3, 0.3, 0, 0.7, 0.7, 1, DUNKELHOLZ), ...q(0.36, 0.28, 0.65, 0.64, 0.3, 0.92, '#fffdf7', '#e6e8f0', '#fffdf7'), ...q(0.45, 0.28, 0.2, 0.55, 0.3, 0.55, '#ffc62b', '#c99a0e', '#e3b222')];
      case 138: // Schreibtisch
        return [...k(0.05, 0.2, 0, 0.18, 0.8, 0.55, HOLZ), ...k(0.82, 0.2, 0, 0.95, 0.8, 0.55, HOLZ), ...k(0.05, 0.2, 0.55, 0.95, 0.8, 0.65, HOLZ), ...k(0.6, 0.5, 0.65, 0.85, 0.7, 0.7, WEISS)];
      // --- Garten (seit 0.12) ---
      case 150: // Sonnenblume
        return [...k(0.47, 0.47, 0, 0.53, 0.53, 0.9, GRUEN), ...q(0.28, 0.28, 0.9, 0.72, 0.72, 1, '#ffc62b', '#e3a70e', '#f2b705'), ...q(0.42, 0.42, 1, 0.58, 0.58, 1.02, '#87521f', '#6b3f17', '#7a4a22')];
      case 151: // Kürbis
        return [...q(0.2, 0.2, 0, 0.8, 0.8, 0.45, '#f08a24', '#c46a12', '#d97a1a'), ...k(0.46, 0.46, 0.45, 0.54, 0.54, 0.58, GRUEN)];
      case 152: // Gartenzwerg
        return [...k(0.35, 0.35, 0, 0.65, 0.65, 0.35, BLAU), ...q(0.38, 0.38, 0.35, 0.62, 0.62, 0.55, '#f6c9a8', '#d9a98a', '#e8b998'), ...k(0.4, 0.4, 0.55, 0.6, 0.6, 0.85, ROT)];
      case 153: // Vogelhaus
        return [...k(0.46, 0.46, 0, 0.54, 0.54, 0.6, DUNKELHOLZ), ...k(0.3, 0.3, 0.6, 0.7, 0.7, 0.85, HOLZ), ...k(0.25, 0.25, 0.85, 0.75, 0.75, 0.95, ROT)];
      case 154: // Teich
        return [...k(0.02, 0.02, 0, 0.98, 0.98, 0.12, METALL), ...q(0.1, 0.1, 0.12, 0.9, 0.9, 0.13, '#5fb7e6', '#3c8fc2', '#4aa2d4'), ...k(0.6, 0.25, 0.13, 0.75, 0.4, 0.16, GRUEN)];
      case 155: // Apfelbäumchen
        return [...k(0.44, 0.44, 0, 0.56, 0.56, 0.5, DUNKELHOLZ), ...k(0.12, 0.12, 0.5, 0.88, 0.88, 1.1, GRUEN), ...q(0.2, 0.1, 0.7, 0.3, 0.12, 0.8, '#e23a4e', '#a82838', '#e23a4e'), ...q(0.6, 0.1, 0.85, 0.7, 0.12, 0.95, '#e23a4e', '#a82838', '#e23a4e')];
      case 156: // Sonnenschirm
        return [...k(0.47, 0.47, 0, 0.53, 0.53, 1, WEISS), ...q(0.05, 0.05, 1, 0.95, 0.95, 1.08, '#e23a4e', '#fbfaf5', '#e23a4e')];
      // --- Spielplatz (seit 0.12) ---
      case 160: // Schaukel
        return [...k(0.02, 0.45, 0, 0.1, 0.55, 1.2, ROT), ...k(0.9, 0.45, 0, 0.98, 0.55, 1.2, ROT), ...k(0.02, 0.45, 1.2, 0.98, 0.55, 1.28, ROT), ...k(0.35, 0.4, 0.35, 0.65, 0.6, 0.42, HOLZ), ...k(0.37, 0.48, 0.42, 0.39, 0.52, 1.2, SCHWARZ), ...k(0.61, 0.48, 0.42, 0.63, 0.52, 1.2, SCHWARZ)];
      case 161: // Rutsche
        return [...k(0.05, 0.6, 0, 0.35, 0.95, 1, BLAU), ...k(0.1, 0.65, 1, 0.3, 0.9, 1.1, BLAU), ...k(0.35, 0.65, 0.8, 0.55, 0.9, 0.86, GELB), ...k(0.55, 0.65, 0.5, 0.75, 0.9, 0.56, GELB), ...k(0.75, 0.65, 0.2, 0.95, 0.9, 0.26, GELB), ...k(0.88, 0.65, 0, 0.95, 0.9, 0.2, GELB)];
      case 162: // Sandkasten (begehbar)
        return [...k(0.02, 0.02, 0, 0.98, 0.1, 0.2, HOLZ), ...k(0.02, 0.9, 0, 0.98, 0.98, 0.2, HOLZ), ...k(0.02, 0.1, 0, 0.1, 0.9, 0.2, HOLZ), ...k(0.9, 0.1, 0, 0.98, 0.9, 0.2, HOLZ), ...q(0.1, 0.1, 0, 0.9, 0.9, 0.12, '#f3dc9a', '#c9ad60', '#dcc177')];
      case 163: // Trampolin
        return [...k(0.1, 0.1, 0, 0.18, 0.18, 0.3, SCHWARZ), ...k(0.82, 0.82, 0, 0.9, 0.9, 0.3, SCHWARZ), ...k(0.82, 0.1, 0, 0.9, 0.18, 0.3, SCHWARZ), ...k(0.1, 0.82, 0, 0.18, 0.9, 0.3, SCHWARZ), ...q(0.05, 0.05, 0.3, 0.95, 0.95, 0.36, '#2a2c3a', '#3c78d8', '#3c78d8')];
      case 164: // Wippe
        return [...k(0.4, 0.42, 0, 0.6, 0.58, 0.25, ROT), ...k(0.02, 0.44, 0.25, 0.98, 0.56, 0.32, GELB), ...k(0.06, 0.4, 0.32, 0.12, 0.6, 0.5, ROT), ...k(0.88, 0.4, 0.32, 0.94, 0.6, 0.5, ROT)];
      default:
        return q(0, 0, 0, 1, 1, 1, '#ccc', '#999', '#aaa');
    }
  }

  return { quader, moebel };
}

/** Bildausschnitt (viewBox) für die Vorschau eines Teils in einem Feld bei Drehung 0. */
export const VORSCHAU_VIEWBOX = `${-A - 4} ${-1.4 * C - 4} ${2 * A + 8} ${A + 1.4 * C + 8}`;
