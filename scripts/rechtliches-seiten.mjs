// Erzeugt die öffentlichen Seiten docs/impressum.html, docs/datenschutz.html und docs/index.html
// aus src/app/rechtliches.ts – dieselben Texte wie in der App. Aufruf: npm run rechtliches
// GitHub Pages: im Repository unter Settings → Pages die Quelle „main“, Ordner „/docs“ wählen.
import { writeFileSync, mkdirSync } from 'node:fs';
import { ANBIETER, DATENSCHUTZ, IMPRESSUM, STAND } from '../src/app/rechtliches.ts';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const absatz = (p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`;
const abschnitte = (liste) =>
  liste
    .map((a) => `<h2>${esc(a.titel)}</h2>\n${a.absaetze.map(absatz).join('\n')}${a.liste ? `\n<ul>${a.liste.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}`)
    .join('\n');

const seite = (titel, inhalt, links) => `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titel)} – Mathe-Jahrmarkt</title>
<style>
  :root { --papier:#fdf6e9; --karte:#fff; --tinte:#1f2a6b; --weich:#5a628c; --rot:#e23a4e; --linie:#eadfca; }
  @media (prefers-color-scheme: dark) { :root { --papier:#151a33; --karte:#1f2647; --tinte:#eef0fa; --weich:#a7aed0; --linie:#323b6b; } }
  * { box-sizing: border-box; }
  body { margin:0; padding:24px 16px 48px; background:var(--papier); color:var(--tinte);
         font-family: ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif; line-height:1.6; }
  main { max-width:760px; margin:0 auto; background:var(--karte); border:2px solid var(--linie); border-radius:24px; padding:24px; border-top:8px solid var(--rot); }
  h1 { font-size:clamp(26px,5vw,34px); margin:0 0 4px; }
  h2 { font-size:clamp(18px,4vw,21px); margin:28px 0 8px; }
  .stand { color:var(--weich); font-size:14px; margin:0 0 20px; }
  a { color:var(--rot); }
  nav { margin-top:32px; display:flex; flex-wrap:wrap; gap:10px; }
  nav a { padding:10px 18px; border-radius:999px; border:2px solid var(--linie); text-decoration:none; font-weight:700; color:var(--tinte); }
</style>
</head>
<body>
<main>
<h1>${esc(titel)}</h1>
<p class="stand">Mathe-Jahrmarkt – Fit für Klasse 5 · Stand: ${esc(STAND)}</p>
${inhalt}
<nav>${links.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}</nav>
</main>
</body>
</html>
`;

mkdirSync('docs', { recursive: true });
writeFileSync('docs/impressum.html', seite('Impressum', abschnitte(IMPRESSUM), [['index.html', 'Mathe-Jahrmarkt'], ['datenschutz.html', 'Datenschutz']]));
writeFileSync('docs/datenschutz.html', seite('Datenschutzerklärung', abschnitte(DATENSCHUTZ), [['index.html', 'Mathe-Jahrmarkt'], ['impressum.html', 'Impressum']]));
writeFileSync(
  'docs/index.html',
  seite(
    'Mathe-Jahrmarkt – Fit für Klasse 5',
    `<p>Eine Lern-App für den Übergang von der Grundschule zur weiterführenden Schule im Fach Mathematik: 27 Buden auf einem Jahrmarkt, Aufgaben nach dem Kerncurriculum Niedersachsen, ohne Werbung, ohne Konto, alle Daten bleiben auf dem Gerät.</p>
<p>Kontakt: <a href="mailto:${ANBIETER.email}">${ANBIETER.email}</a></p>`,
    [['impressum.html', 'Impressum'], ['datenschutz.html', 'Datenschutz']],
  ),
);
writeFileSync('docs/.nojekyll', '');
console.log('docs/ geschrieben');
