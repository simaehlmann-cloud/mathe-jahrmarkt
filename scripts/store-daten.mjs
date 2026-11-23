// Gemeinsame Beispielsitzung „Lea“ für Store-Bilder und Vorschauvideos (keine echten Kinderdaten).

/** Zahlwörter 10–99 wie in der App (Elternsperre). */
export const WOERTER = (() => {
  const e = ['', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun'];
  const z = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
  const w = { zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14, fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19 };
  for (let n = 20; n < 100; n++) w[n % 10 ? `${e[n % 10]}und${z[Math.floor(n / 10)]}` : z[n / 10]] = n;
  return w;
})();

/**
 * Legt das Profil „Lea“ an und füllt es beim nächsten Laden mit drei Wochen Spielverlauf,
 * gekauftem Zusatzpaket und Fortschritt an vielen Buden. Optional: heutige Spielzeit vorbelegen
 * (`{ spielzeit: { tag: 'YYYY-MM-DD', ms } }`, für die Pausen-Erinnerung) und mit dem Startbildschirm beginnen
 * (`{ startbildschirm: true }`); eine fertige Bauinsel mitgeben (`{ insel }`).
 */
export async function beispielprofil(page, url, extra = {}) {
  await page.goto(url);
  await page.getByPlaceholder('Spitzname').fill('Lea');
  await page.getByPlaceholder('Spitzname').press('Enter');
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  for (let i = 0; i < 6 && (await page.getByRole('button', { name: /Weiter|Los geht/ }).count()); i++) await page.getByRole('button', { name: /Weiter|Los geht/ }).last().click();
  await page.goto('about:blank');
  await page.addInitScript((extra) => {
    const k = 'CapacitorStorage.mathe-jahrmarkt.daten';
    const d = JSON.parse(localStorage.getItem(k) ?? 'null');
    if (!d || d.paket.gekauft) return;
    d.paket = { gekauft: true, seit: 1 };
    const p = d.profile[0];
    const st = { geschafft: true, rekord: 900, gespielt: 2, verlauf: [700, 900] };
    for (const id of ['dartbude', 'einmaleins-turbo', 'dosenwerfen', 'seilbahn', 'waage', 'rechendomino', 'kasse', 'schaetzbude', 'uhrkarussell', 'spiegelkabinett', 'wuerfelnetz', 'zahlenfolgenzug', 'rechenmauer', 'murmellabor']) p.fortschritt[id] = { bronze: st, silber: st };
    for (const id of ['rechenwerkstatt', 'fehlerdetektiv', 'tresor', 'umrechnungsmemory', 'achterbahn', 'labyrinth', 'formensortierer', 'riesenradtechniker', 'diagrammreporter']) p.fortschritt[id] = { bronze: st };
    p.taler = 86;
    p.bau.bloecke = 140;
    p.gesehen.gassen = ['zahlengasse', 'groessenmarkt', 'spiegelzelt', 'musterbahn', 'forschergasse'];
    p.gesehen.hinweise = ['auftraege', 'rundgang', 'insel-frei', 'insel-014', 'insel-019', 'insel-019f'];
    // Drei Wochen Spielverlauf für Bericht und Lernprofil
    const jetzt = Date.now();
    const K = ['kopfrechnen', 'stellenwert', 'halbschriftlich', 'groessen', 'raum', 'muster', 'zahlverstaendnis', 'operationsverstaendnis'];
    const B = { kopfrechnen: 'dartbude', stellenwert: 'dosenwerfen', halbschriftlich: 'rechendomino', groessen: 'kasse', raum: 'spiegelkabinett', muster: 'zahlenfolgenzug', zahlverstaendnis: 'seilbahn', operationsverstaendnis: 'waage' };
    for (let tag = 20; tag >= 0; tag--) {
      if (tag % 3 === 1) continue;
      const t0 = jetzt - tag * 86400000 - 3600000;
      for (const [j, kk] of K.entries()) {
        if ((tag + j) % 2) continue;
        p.runden.push({ bude: B[kk], stufe: 'silber', start: t0 + j * 300000, dauerMs: 240000 + j * 20000, punkte: 700, richtig: 8, gesamt: 10 });
        for (let i = 0; i < 10; i++) p.ereignisse.push({ t: t0 + j * 300000 + i * 20000, bude: B[kk], kompetenz: kk, dimension: i % 3 ? 'sicherheit' : 'wissen', richtig: (i + tag + j) % 5 !== 0, ms: 4000, gewertet: true });
      }
    }
    if (extra.insel) p.insel = extra.insel;
    if (extra.startbildschirm) delete d.aktiv; // mit den Eintrittskarten beginnen
    if (extra.spielzeit) p.spielzeit = { nachschlag: 0, erinnernAb: 0, ...extra.spielzeit };
    localStorage.setItem(k, JSON.stringify(d));
  }, extra);
}
