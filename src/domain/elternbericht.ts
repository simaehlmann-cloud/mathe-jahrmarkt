/**
 * Inhalt des Eltern-Berichts (PDF) als einfache Bausteine. Das Zeichnen übernimmt services/pdf.ts;
 * so bleibt der Inhalt ohne PDF-Bibliothek testbar.
 */
import { spieltageDieseWoche, WOCHENZIEL_TAGE } from './belohnungen';
import { BUDEN, GASSEN, STUFEN, STUFEN_NAME } from './buden';
import { BEREICH_NAME, einschaetzung, type Bereich } from './check';
import { istGeschafft } from './fortschritt/fortschritt';
import { KOMPETENZEN, KOMPETENZ_REIHENFOLGE } from './kompetenzen/modell';
import { wochenbericht } from './lernprofil/bericht';
import { STATUS_TEXT, einschaetzen, elternSaetze } from './lernprofil/lernprofil';
import type { Profil } from './profil';

export type Baustein =
  | { art: 'titel'; text: string; unter: string }
  | { art: 'h'; text: string }
  | { art: 'h3'; text: string }
  | { art: 'p'; text: string }
  | { art: 'liste'; punkte: string[] }
  | { art: 'balken'; zeilen: { name: string; anteil: number; text: string }[]; neutral?: boolean }
  | { art: 'hinweis'; text: string };

const EINSCHAETZUNG_TEXT = { sicher: 'sicher', fastSicher: 'fast sicher', ueben: 'üben' } as const;
const datum = (t: number): string => new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

export function elternbericht(p: Profil, paket: boolean, jetzt: number): Baustein[] {
  const aus: Baustein[] = [{ art: 'titel', text: `Mathe-Jahrmarkt: Bericht für ${p.name}`, unter: `Erstellt am ${datum(jetzt)}` }];

  // Die letzten 7 Tage
  const w = wochenbericht(p, jetzt);
  aus.push({ art: 'h', text: 'Die letzten 7 Tage' });
  const minuten = w.gesamtMinuten < 1 ? 'weniger als eine Minute' : w.gesamtMinuten === 1 ? 'etwa 1 Minute' : `etwa ${w.gesamtMinuten} Minuten`;
  aus.push({ art: 'p', text: `${w.runden === 1 ? '1 Runde' : `${w.runden} Runden`}, zusammen ${minuten}.` });
  const tage = spieltageDieseWoche(p, new Date(jetzt));
  aus.push({ art: 'p', text: `Spieltage in dieser Woche: ${tage} von ${WOCHENZIEL_TAGE} (Wochenziel ${tage >= WOCHENZIEL_TAGE ? 'erreicht' : 'noch offen'}).` });
  const max = Math.max(10, ...w.minutenProTag.map((t) => t.minuten));
  aus.push({
    art: 'balken',
    neutral: true,
    zeilen: w.minutenProTag.map((t) => ({ name: new Date(t.tag).toLocaleDateString('de-DE', { weekday: 'long' }), anteil: t.minuten / max, text: `${t.minuten} min` })),
  });
  if (w.buden.length) aus.push({ art: 'p', text: `Gespielt: ${w.buden.join(', ')}.` });
  if (w.sicherer.length) aus.push({ art: 'p', text: `Sicherer geworden: ${w.sicherer.map((k) => KOMPETENZEN[k].name).join(', ')}.` });
  if (w.ueben.length) aus.push({ art: 'p', text: `Üben lohnt sich bei: ${w.ueben.map((k) => KOMPETENZEN[k].name).join(', ')}.` });

  // Jahrmarkt-Check
  aus.push({ art: 'h', text: 'Jahrmarkt-Check' });
  if (!paket) aus.push({ art: 'p', text: 'Der Jahrmarkt-Check gehört zum Zusatzpaket.' });
  else if (!p.check) aus.push({ art: 'p', text: `${p.name} hat den Jahrmarkt-Check noch nicht gemacht. Er dauert etwa 10 Minuten und steht im Menü.` });
  else {
    const c = p.check;
    aus.push({ art: 'p', text: `Zuletzt gemacht am ${datum(c.am)}. Je Bereich zwei Aufgaben:` });
    const zeilen = (Object.keys(BEREICH_NAME) as Bereich[]).flatMap((b) => {
      const rg = c.bereiche[b];
      return rg ? [{ name: BEREICH_NAME[b], anteil: rg[1] ? rg[0] / rg[1] : 0, text: `${rg[0]} von ${rg[1]}, ${EINSCHAETZUNG_TEXT[einschaetzung(rg)]}` }] : [];
    });
    aus.push({ art: 'balken', zeilen });
    const empf = c.empfehlung.map((id) => BUDEN.find((b) => b.id === id)?.name).filter((n): n is string => !!n);
    if (empf.length) aus.push({ art: 'p', text: `Empfohlene Buden zum Weiterüben: ${empf.join(', ')}.` });
  }

  // Fortschritt je Gasse
  aus.push({ art: 'h', text: 'Fortschritt an den Buden' });
  aus.push({ art: 'p', text: 'Jede Bude hat drei Stufen: Bronze, Silber und Gold.' });
  for (const g of GASSEN) {
    const buden = BUDEN.filter((b) => b.spielbar && b.gasse === g.id);
    if (!buden.length) continue;
    aus.push({ art: 'h3', text: g.name });
    aus.push({
      art: 'balken',
      zeilen: buden.map((b) => {
        const geschafft = STUFEN.filter((s) => istGeschafft(p, b.id, s));
        return { name: b.name, anteil: geschafft.length / STUFEN.length, text: geschafft.length ? geschafft.map((s) => STUFEN_NAME[s]).join(', ') : 'noch offen' };
      }),
    });
  }

  // Lernprofil (Zusatzpaket)
  if (paket) {
    aus.push({ art: 'h', text: 'Lernprofil' });
    const sichtbar = KOMPETENZ_REIHENFOLGE.filter((k) => BUDEN.some((b) => b.spielbar && b.kompetenzen.some((x) => x.kompetenz === k)));
    const offen: string[] = [];
    for (const k of sichtbar) {
      const e = einschaetzen(p.ereignisse, k);
      if (e.status === 'kennenlernen') {
        offen.push(KOMPETENZEN[k].name);
        continue;
      }
      aus.push({ art: 'h3', text: `${KOMPETENZEN[k].name}: ${STATUS_TEXT[e.status]}` });
      for (const s of elternSaetze(p.ereignisse, k, p.name)) aus.push({ art: 'p', text: s });
      const tipp = KOMPETENZEN[k].tippsFuerZuHause[0];
      if (tipp) aus.push({ art: 'liste', punkte: [`Tipp für zu Hause: ${tipp}`] });
    }
    if (offen.length) aus.push({ art: 'p', text: `Für diese Bereiche gibt es noch zu wenige Aufgaben für eine Einschätzung: ${offen.join(', ')}.` });
  }
  aus.push({
    art: 'hinweis',
    text: 'Dieser Bericht ist eine Einschätzung aus dem Spiel, keine Diagnose. Bei auffälligen Schwierigkeiten im Rechnen hilft ein Gespräch mit der Lehrkraft. Die Daten stammen nur von diesem Gerät.',
  });
  return aus;
}

/** Dateiname ohne Umlaute und Sonderzeichen, z. B. „mathe-jahrmarkt-bericht-lea-2026-11-09.pdf“. */
export function berichtDateiname(name: string, jetzt: number): string {
  const n = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const d = new Date(jetzt);
  const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `mathe-jahrmarkt-bericht-${n || 'kind'}-${tag}.pdf`;
}
