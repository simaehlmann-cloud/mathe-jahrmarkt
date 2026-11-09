/**
 * Texte der Geschichte. Höchstens zwei kurze Sätze pro Blase, alles wird vorgelesen.
 */
export const INTRO = (name: string): string[] => [
  `Hey ${name}! Ich bin Flinka, mir gehört dieser Jahrmarkt.`,
  'Ein Sturm hat heute Nacht alles lahmgelegt – und morgen ist Sommerfest. Bring die Buden mit Mathe wieder zum Laufen!',
  'Tipp eine Bude an, dann läufst du hin. Oben hinter deiner Figur: Rang, Bauplatz und Jahrmarkt-Check.',
];

export const ABENDMARKT_ZU = ['Der Sternenmarkt öffnet, wenn alle Buden Silber haben. Dort warten Aufgaben aus Klasse 5.'];

export const GASSE_BEGRUESSUNG: Record<string, string[]> = {
  zahlengasse: ['Willkommen in der Zahlengasse! Bruno von der Dartbude braucht Hilfe.'],
};

export const NOCH_IM_AUFBAU = ['Hier bauen wir noch auf. Diese Gasse öffnet bald!'];

export const BUDE_WIEDER_AN = (bude: string): string[] => [`Die Lichter der ${bude} brennen wieder! Danke dir.`];
export const BUDE_FARBE = (bude: string): string[] => [`Die ${bude} leuchtet jetzt in voller Farbe. Hörst du die Musik?`];
export const BUDE_FEST = (bude: string): string[] => [`Die ${bude} ist festlich geschmückt. Stark!`];

export const ENTDECKUNGEN: Readonly<Record<string, { titel: string; text: string }>> = {
  katze: { titel: 'Die Dachkatze', text: 'Auf dem Dach der Dartbude schläft Mieze. Sie mag warme Lampen.' },
};
