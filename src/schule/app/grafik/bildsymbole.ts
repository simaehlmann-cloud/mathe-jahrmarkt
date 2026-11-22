/**
 * Zeichnungen der Bildsymbole für das Bildpasswort (Schulversion), 64 × 64.
 * Dieselben Zeichnungen erscheinen in der App und auf den ausgedruckten Kärtchen (services/kaertchen.ts).
 * Jede Zeichnung unterscheidet sich in Form und Farbe deutlich von den anderen.
 */
const T = '#1f2a6b';
const L = `stroke="${T}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

export const SYMBOL_SVG: Readonly<Record<string, string>> = {
  ballon: `<path d="M32 46 Q30 54 34 60" fill="none" ${L}/><ellipse cx="32" cy="25" rx="15" ry="19" fill="#e23a4e" ${L}/><path d="M28 44 L36 44 L32 48 Z" fill="#e23a4e" ${L}/><ellipse cx="26" cy="18" rx="4" ry="6" fill="#fff" opacity=".6"/>`,
  stern: `<path d="M32 5 L39.6 22.6 L58.6 24.3 L44.2 36.9 L48.5 55.6 L32 45.8 L15.5 55.6 L19.8 36.9 L5.4 24.3 L24.4 22.6 Z" fill="#ffc62b" ${L}/>`,
  herz: `<path d="M32 56 C10 40 4 28 10 18 C16 9 28 10 32 20 C36 10 48 9 54 18 C60 28 54 40 32 56 Z" fill="#b5713c" ${L}/><path d="M32 49 C15 37 11 28 15 21 C19 15 27 16 32 25 C37 16 45 15 49 21 C53 28 49 37 32 49 Z" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="3 3"/><circle cx="32" cy="33" r="4" fill="#e23a4e"/>`,
  eis: `<path d="M20 30 L32 60 L44 30 Z" fill="#e8b36b" ${L}/><path d="M24 36 L38 36 M27 43 L36 43" stroke="#b07a2a" stroke-width="2"/><circle cx="25" cy="25" r="9" fill="#f4a6c8" ${L}/><circle cx="39" cy="25" r="9" fill="#8fd9b6" ${L}/><circle cx="32" cy="15" r="9" fill="#7a4a2a" ${L}/><circle cx="32" cy="7" r="3" fill="#e23a4e" stroke="${T}" stroke-width="2"/>`,
  popcorn: `<circle cx="20" cy="20" r="7" fill="#fff4c2" ${L}/><circle cx="32" cy="15" r="8" fill="#fff4c2" ${L}/><circle cx="44" cy="20" r="7" fill="#fff4c2" ${L}/><circle cx="26" cy="24" r="6" fill="#ffe27a" ${L}/><circle cx="38" cy="24" r="6" fill="#ffe27a" ${L}/><path d="M14 26 L50 26 L45 60 L19 60 Z" fill="#fff" ${L}/><path d="M23 27 L25 59 M32 27 V59 M41 27 L39 59" stroke="#e23a4e" stroke-width="5"/><path d="M14 26 L50 26 L45 60 L19 60 Z" fill="none" ${L}/>`,
  riesenrad: `<path d="M32 30 L18 60 M32 30 L46 60 M14 60 H50" fill="none" ${L}/><circle cx="32" cy="28" r="20" fill="none" stroke="#7b5ea7" stroke-width="4"/><path d="M32 8 V48 M12 28 H52 M18 14 L46 42 M46 14 L18 42" stroke="#7b5ea7" stroke-width="2.5"/><circle cx="32" cy="28" r="4" fill="#7b5ea7" ${L}/><rect x="28" y="4" width="8" height="7" rx="2" fill="#ffc62b" stroke="${T}" stroke-width="2"/><rect x="48" y="25" width="8" height="7" rx="2" fill="#3fae6a" stroke="${T}" stroke-width="2"/><rect x="8" y="25" width="8" height="7" rx="2" fill="#e23a4e" stroke="${T}" stroke-width="2"/>`,
  mond: `<circle cx="32" cy="32" r="27" fill="#2e2a6f" ${L}/><path d="M38 12 A21 21 0 1 0 46 46 A16 16 0 1 1 38 12 Z" fill="#ffe57a" stroke="${T}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="46" cy="18" r="2" fill="#fff"/><circle cx="50" cy="30" r="1.6" fill="#fff"/>`,
  fahne: `<path d="M16 6 V60" fill="none" ${L}/><path d="M16 9 Q30 3 40 9 T58 9 L58 33 Q48 27 40 33 T16 33 Z" fill="#3c78d8" ${L}/><circle cx="16" cy="6" r="3" fill="#ffc62b" stroke="${T}" stroke-width="2"/><path d="M28 16 L36 16 L32 26 Z" fill="#fff"/>`,
  krone: `<path d="M8 22 L20 34 L32 12 L44 34 L56 22 L52 50 L12 50 Z" fill="#f2a81d" ${L}/><rect x="12" y="50" width="40" height="8" rx="2" fill="#f2a81d" ${L}/><circle cx="32" cy="38" r="4.5" fill="#e23a4e" stroke="${T}" stroke-width="2"/><circle cx="20" cy="42" r="3" fill="#3c78d8" stroke="${T}" stroke-width="2"/><circle cx="44" cy="42" r="3" fill="#3fae6a" stroke="${T}" stroke-width="2"/>`,
  zuckerwatte: `<path d="M32 36 L32 62" fill="none" stroke="#c8a878" stroke-width="5" stroke-linecap="round"/><path d="M32 36 L32 62" fill="none" stroke="${T}" stroke-width="1.5"/><path d="M14 26 C8 18 16 6 26 9 C30 2 42 3 44 11 C54 10 60 22 52 28 C54 36 44 42 38 37 C34 42 22 42 20 35 C12 36 8 30 14 26 Z" fill="#f9b8dc" ${L}/><path d="M24 20 C28 16 34 18 36 22" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
  apfel: `<path d="M32 18 C26 12 10 12 10 30 C10 46 20 58 28 56 C30 55 34 55 36 56 C44 58 54 46 54 30 C54 12 38 12 32 18 Z" fill="#6cc04a" ${L}/><path d="M32 18 Q32 10 36 5" fill="none" stroke="#7a4a2a" stroke-width="3.5" stroke-linecap="round"/><path d="M35 11 Q44 4 50 9 Q44 16 35 11 Z" fill="#3a8f3a" stroke="${T}" stroke-width="2"/><ellipse cx="21" cy="28" rx="4" ry="7" fill="#fff" opacity=".55"/>`,
  ente: `<path d="M8 40 Q8 56 30 56 L44 56 Q58 54 58 40 Q50 44 42 40 Q46 30 40 24 Z" fill="#ffd23f" ${L}/><circle cx="34" cy="22" r="13" fill="#ffd23f" ${L}/><path d="M45 22 L58 25 L46 30 Z" fill="#f28c28" ${L}/><circle cx="36" cy="18" r="2.6" fill="${T}"/><path d="M22 44 Q30 50 38 44" fill="none" stroke="#e0a800" stroke-width="2.4" stroke-linecap="round"/>`,
};

/** Vollständiges SVG eines Symbols (für das Umwandeln in ein Bild auf den Kärtchen). */
export const symbolSvg = (id: string, groesse = 256): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${groesse}" height="${groesse}">${SYMBOL_SVG[id] ?? ''}</svg>`;
