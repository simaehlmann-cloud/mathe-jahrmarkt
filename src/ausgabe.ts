/**
 * Welche Ausgabe der App gerade läuft. Der Wert steht schon beim Bauen fest (VITE_AUSGABE),
 * deshalb landen die Teile der anderen Ausgabe gar nicht erst im Bundle.
 *
 * Die Domäne fragt SCHULE nicht ab: Ihre Funktionen bekommen die nötigen Werte (z. B. die Profilgrenze)
 * als Argument und sind so für beide Ausgaben testbar.
 */
export const SCHULE: boolean = __AUSGABE__ === 'schule';
