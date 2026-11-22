/** Versionsnummer aus package.json, eingesetzt von Vite (vite.config.ts). */
declare const __APP_VERSION__: string;

/**
 * Zielplattform des Builds, eingesetzt von Vite (vite.config.ts) aus der Umgebungsvariable VITE_PLATTFORM.
 * 'ios' und 'android' für die Store-Versionen, 'alle' für Browser, Tests und die öffentlichen Seiten in docs/.
 * Weil der Wert schon beim Bauen feststeht, landen die Texte der anderen Plattform gar nicht erst im Bundle
 * (Apple-Richtlinie 2.3.10: keine Hinweise auf Google Play in der iOS-App).
 */
declare const __PLATTFORM__: 'ios' | 'android' | 'alle';

/**
 * Ausgabe der App, eingesetzt von Vite aus VITE_AUSGABE:
 * 'privat' für die Familien-App im App Store (kostenlos mit Zusatzpaket als In-App-Kauf),
 * 'schule' für die Schulversion (eigene App, Einmalkauf über Apple School Manager, alles freigeschaltet,
 * bis zu 32 Profile mit Bildpasswort, Lehrerbereich statt Elternbereich).
 */
declare const __AUSGABE__: 'privat' | 'schule';
