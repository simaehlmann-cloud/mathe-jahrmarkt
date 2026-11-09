/**
 * Texte der Geschichte. Höchstens zwei kurze Sätze pro Blase, alles wird vorgelesen.
 */
export const INTRO = (name: string): string[] => [
  `Hallo ${name}! Ich bin Flinka und leite diesen Jahrmarkt.`,
  'Heute Nacht hat ein Sturm Lichter, Musik und Fahrgeschäfte lahmgelegt. Und morgen ist das große Sommerfest!',
  'Hilfst du mir, die Buden wieder zum Laufen zu bringen? Fang am besten in der Zahlengasse an.',
  'Tippe auf eine Bude, dann läufst du hin. Mit dem Finger kannst du den Jahrmarkt verschieben.',
];

export const ABENDMARKT_ZU = ['Der Abendmarkt öffnet erst, wenn alle Buden Silber haben. Dann gibt es Aufgaben aus Klasse 5!'];

export const GASSE_BEGRUESSUNG: Record<string, string[]> = {
  zahlengasse: ['Willkommen in der Zahlengasse! Bruno an der Dartbude wartet schon auf dich.'],
};

export const NOCH_IM_AUFBAU = ['Hier bauen wir noch auf. Diese Gasse öffnet bald!'];

export const BUDE_WIEDER_AN = (bude: string): string[] => [`Die Lichter der ${bude} brennen wieder! Danke dir.`];
export const BUDE_FARBE = (bude: string): string[] => [`Die ${bude} leuchtet jetzt in voller Farbe. Hörst du die Musik?`];
export const BUDE_FEST = (bude: string): string[] => [`Die ${bude} ist festlich geschmückt. Du bist ein echter Profi!`];

export const ENTDECKUNGEN: Readonly<Record<string, { titel: string; text: string }>> = {
  katze: { titel: 'Die Dachkatze', text: 'Auf dem Dach der Dartbude schläft Mieze. Sie mag warme Lampen.' },
};
