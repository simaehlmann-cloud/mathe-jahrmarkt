/**
 * Texte der Geschichte. Höchstens zwei kurze Sätze pro Blase, alles wird vorgelesen.
 */
export const INTRO = (name: string): string[] => [
  `Hey ${name}! Ich bin Flinka, mir gehört dieser Jahrmarkt.`,
  'Ein Sturm hat heute Nacht alles lahmgelegt – und morgen ist Sommerfest. Bring die Buden mit Mathe wieder zum Laufen!',
  'Tipp eine Bude an, dann läufst du hin. Oben hinter deiner Figur: Rang, Bauplatz und Jahrmarkt-Check.',
];

export const ABENDMARKT_ZU = ['Der Sternenmarkt öffnet, wenn alle Buden Silber haben. Dort warten Aufgaben aus Klasse 5.'];

/** Begrüßung beim ersten Besuch einer Gasse; der zweite Satz nennt die Bude, die das Kind gerade betritt. */
const GASSE_SATZ: Record<string, string> = {
  zahlengasse: 'Willkommen in der Zahlengasse! Hier geht es um große Zahlen und schnelles Rechnen.',
  groessenmarkt: 'Willkommen auf dem Größenmarkt! Hier wird gemessen, gewogen und bezahlt.',
  spiegelzelt: 'Willkommen in der Spiegelzelt-Gasse! Hier warten Formen, Spiegelbilder und Würfel.',
  musterbahn: 'Willkommen an der Musterbahn! Wer die Regel findet, kommt weiter.',
  forschergasse: 'Willkommen in der Forschergasse! Hier wird gezählt, verglichen und geschätzt.',
  abendmarkt: 'Willkommen auf dem Sternenmarkt! Hier gibt es schon Aufgaben aus Klasse 5.',
};
export const GASSE_BEGRUESSUNG = (gasse: string, bude: string, mechanik: string): string[] => [
  `${GASSE_SATZ[gasse] ?? 'Willkommen!'} Erste Station: ${bude} – ${mechanik}.`,
];

/** Erklärung der Auftragsfähnchen, einmal nach dem Intro. */
export const AUFTRAG_ERKLAERUNG = [
  'Siehst du die gelben Fähnchen über den Buden? Das sind deine drei Tagesaufträge.',
  'Schaffst du dort eine Runde mit mindestens 7 Treffern, gibt es Taler und Blöcke. Unten links findest du die Liste.',
];

export const NOCH_IM_AUFBAU = ['Hier bauen wir noch auf. Diese Gasse öffnet bald!'];

export const BUDE_WIEDER_AN = (bude: string): string[] => [`Die Lichter der ${bude} brennen wieder! Danke dir.`];
export const BUDE_FARBE = (bude: string): string[] => [`Die ${bude} leuchtet jetzt in voller Farbe. Hörst du die Musik?`];
export const BUDE_FEST = (bude: string): string[] => [`Die ${bude} ist festlich geschmückt. Stark!`];

export const ENTDECKUNGEN: Readonly<Record<string, { titel: string; text: string }>> = {
  katze: { titel: 'Die Dachkatze', text: 'Auf dem Dach der Dartbude schläft Mieze. Sie mag warme Lampen.' },
};
