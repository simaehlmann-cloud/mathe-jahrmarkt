/**
 * Auswertung für Lehrkräfte (Schulversion): Ergebnisse dieses Geräts und eingesammelte Ergebnisse
 * anderer Geräte zusammenführen, dann Klassenübersicht und Einzelbericht erstellen.
 *
 * Grundsatz wie im Lernprofil: Aussagen nur, wenn die Datenlage sie trägt („Wir lernen uns noch kennen“).
 * Die Auswertung ist eine Einschätzung aus dem Spiel, keine Diagnose.
 */
import type { FehlerArt } from '../../domain/aufgaben/typen';
import { BUDEN, GASSEN, STUFEN, STUFEN_NAME, TAGESBUDEN, type Stufe } from '../../domain/buden';
import { BEREICH_NAME, einschaetzung, type Bereich, type CheckErgebnis } from '../../domain/check';
import type { Baustein, Ampel } from '../../domain/elternbericht';
import { KOMPETENZEN, KOMPETENZ_REIHENFOLGE, type KompetenzId } from '../../domain/kompetenzen/modell';
import { STATUS_TEXT, einschaetzen, unsichereReihen, type Ereignis, type Status, type Wochenwert } from '../../domain/lernprofil/lernprofil';
import type { Profil, Runde, StufenStand } from '../../domain/profil';
import { ergebnisProfil } from './austausch';
import { alleChecks, anteil, BEREICHE, entwicklung } from './checkverlauf';
import type { ErgebnisProfil, Klasse, Sammlung } from './schuldaten';

const TAG = 24 * 3600 * 1000;

export interface AnalyseKind extends ErgebnisProfil {
  /** Klassenname zur Anzeige (auch für Kinder, deren Klasse es nur auf einem anderen Gerät gibt). */
  klassenName: string;
  /** Auf welchen Geräten das Kind gespielt hat. */
  geraete: string[];
  /** Letzte Aktivität (ms) oder 0. */
  zuletzt: number;
}

const ereignisSchluessel = (e: Ereignis): string => `${e.t}|${e.bude}|${e.kompetenz}|${e.dimension}|${e.richtig ? 1 : 0}|${e.fakt ?? ''}`;
const rundenSchluessel = (r: Runde): string => `${r.bude}|${r.stufe}|${r.start}`;

function mischeStand(a: StufenStand | undefined, b: StufenStand | undefined): StufenStand | undefined {
  if (!a) return b;
  if (!b) return a;
  return { geschafft: a.geschafft || b.geschafft, rekord: Math.max(a.rekord, b.rekord), gespielt: a.gespielt + b.gespielt, verlauf: a.verlauf.length >= b.verlauf.length ? a.verlauf : b.verlauf };
}

function mischeFortschritt(a: Profil['fortschritt'], b: Profil['fortschritt']): Profil['fortschritt'] {
  const aus: Profil['fortschritt'] = {};
  for (const bude of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const eintrag: Partial<Record<Stufe, StufenStand>> = {};
    for (const s of STUFEN) {
      const m = mischeStand(a[bude]?.[s], b[bude]?.[s]);
      if (m) eintrag[s] = m;
    }
    aus[bude] = eintrag;
  }
  return aus;
}

function mischeWochen(a: readonly Wochenwert[], b: readonly Wochenwert[]): Wochenwert[] {
  const karte = new Map<string, Wochenwert>();
  for (const w of [...a, ...b]) {
    const k = `${w.woche}|${w.kompetenz}`;
    const alt = karte.get(k);
    karte.set(k, alt ? { ...alt, richtig: alt.richtig + w.richtig, gesamt: alt.gesamt + w.gesamt } : { ...w });
  }
  return [...karte.values()].sort((x, y) => x.woche.localeCompare(y.woche));
}

const neuererCheck = (a: CheckErgebnis | null, b: CheckErgebnis | null): CheckErgebnis | null => (!a ? b : !b ? a : b.am > a.am ? b : a);

function zuletzt(k: Pick<ErgebnisProfil, 'ereignisse' | 'runden'>): number {
  let t = 0;
  for (const r of k.runden) t = Math.max(t, r.start + r.dauerMs);
  for (const e of k.ereignisse) t = Math.max(t, e.t);
  return t;
}

/**
 * Führt die Kinder dieses Geräts mit eingesammelten Ergebnissen zusammen (gleiche Profil-Kennung = dasselbe Kind).
 * Antworten und Runden kommen auf jedem Gerät nur einmal vor; doppelte (gleiche Zeit, gleiche Bude) zählen einmal.
 * Verdichtete Wochenwerte (ältere als 8 Wochen) werden addiert.
 */
export function zusammenfuehren(lokal: readonly Profil[], klassen: readonly Klasse[], gesammelt: readonly Sammlung[], hierName = 'dieses iPad'): AnalyseKind[] {
  const klassenName = (id: string | undefined, fremd: readonly Klasse[] = []): { id: string | undefined; name: string } => {
    if (id === undefined) return { id: undefined, name: '' };
    const hier = klassen.find((k) => k.id === id);
    if (hier) return { id, name: hier.name };
    // Klasse gibt es nur auf dem anderen Gerät: über den Namen zuordnen
    const name = fremd.find((k) => k.id === id)?.name ?? '';
    const gleich = klassen.find((k) => k.name.toLocaleLowerCase('de') === name.toLocaleLowerCase('de'));
    return gleich ? { id: gleich.id, name: gleich.name } : { id, name };
  };
  const kinder = new Map<string, AnalyseKind & { _e: Map<string, Ereignis>; _r: Map<string, Runde> }>();
  const neu = (p: ErgebnisProfil, geraet: string, fremd?: readonly Klasse[]) => {
    const k = klassenName(p.klasse, fremd);
    return {
      ...p,
      klasse: k.id,
      klassenName: k.name,
      geraete: [geraet],
      zuletzt: 0,
      _e: new Map(p.ereignisse.map((e) => [ereignisSchluessel(e), e])),
      _r: new Map(p.runden.map((r) => [rundenSchluessel(r), r])),
    };
  };
  for (const p of lokal) kinder.set(p.id, neu(ergebnisProfil(p), hierName));
  for (const g of gesammelt) {
    const geraet = g.geraetName || 'ein anderes iPad';
    for (const p of g.profile) {
      const alt = kinder.get(p.id);
      if (!alt) {
        kinder.set(p.id, neu(p, geraet, g.klassen));
        continue;
      }
      for (const e of p.ereignisse) alt._e.set(ereignisSchluessel(e), e);
      for (const r of p.runden) alt._r.set(rundenSchluessel(r), r);
      alt.fortschritt = mischeFortschritt(alt.fortschritt, p.fortschritt);
      alt.wochen = mischeWochen(alt.wochen, p.wochen);
      alt.check = neuererCheck(alt.check, p.check);
      alt.checkVerlauf = alleChecks({ check: null, checkVerlauf: [...(alt.checkVerlauf ?? []), ...(p.checkVerlauf ?? []), ...(p.check ? [p.check] : [])] });
      if (!alt.geraete.includes(geraet)) alt.geraete.push(geraet);
      if (!alt.klassenName && p.klasse) {
        const k = klassenName(p.klasse, g.klassen);
        alt.klasse = k.id;
        alt.klassenName = k.name;
      }
    }
  }
  return [...kinder.values()]
    .map(({ _e, _r, ...k }) => {
      const kind: AnalyseKind = { ...k, ereignisse: [..._e.values()].sort((x, y) => x.t - y.t), runden: [..._r.values()].sort((x, y) => x.start - y.start) };
      kind.zuletzt = zuletzt(kind);
      return kind;
    })
    .sort((x, y) => x.name.localeCompare(y.name, 'de'));
}

/* ---------- Texte ---------- */

export const FEHLER_NAME: Readonly<Record<FehlerArt, string>> = {
  nachbaraufgabe: 'Nachbaraufgabe im Einmaleins (z. B. 7 · 7 statt 7 · 8)',
  operation: 'Rechenzeichen verwechselt',
  ziffern: 'Zahlendreher',
  zehner: 'Um 10 verrechnet',
  umkehr: 'Umkehraufgabe nicht genutzt (gegebene Zahl wiederholt)',
  stelle: 'Stellenwert verwechselt (Null vergessen oder zu viel)',
  buendel: 'Nicht gebündelt bzw. entbündelt',
  skala: 'Skala am Zahlenstrahl falsch gelesen',
  runden: 'Falsch gerundet',
  uebertrag: 'Übertrag vergessen oder zu viel',
  sonstige: 'Sonstige Fehler',
};

export const KOMPETENZ_KURZ: Readonly<Record<KompetenzId, string>> = {
  zahlverstaendnis: 'Zahl',
  operationsverstaendnis: 'Oper.',
  stellenwert: 'Stelle',
  kopfrechnen: 'Kopf',
  halbschriftlich: 'Halbs.',
  schriftlich: 'Schriftl.',
  groessen: 'Größen',
  raum: 'Raum',
  muster: 'Muster',
  daten: 'Daten',
  klasse5: 'Kl. 5',
};

export const STATUS_AMPEL: Readonly<Record<Status, Ampel>> = { sicher: 'gruen', aufGutemWeg: 'gelb', weiterUeben: 'rot', kennenlernen: 'grau' };
export const STATUS_KURZ: Readonly<Record<Status, string>> = { sicher: 'sicher', aufGutemWeg: 'guter Weg', weiterUeben: 'üben', kennenlernen: '–' };

/** Kompetenzen, die in der App vorkommen (ohne die Bonusbuden für Klasse 5). */
export const KOMPETENZEN_SCHULE: readonly KompetenzId[] = KOMPETENZ_REIHENFOLGE.filter((k) =>
  BUDEN.some((b) => b.spielbar && b.kompetenzen.some((x) => x.kompetenz === k)),
);

/* ---------- Klassenübersicht ---------- */

export interface KindZeile {
  kind: AnalyseKind;
  medaillen: Record<Stufe, number>;
  minuten7: number;
  minutenGesamt: number;
  /** Gewertete Aufgaben insgesamt (einschließlich verdichteter älterer Wochen). */
  aufgaben: number;
  /** Trefferquote der letzten 60 gewerteten Aufgaben (0..1) oder undefined bei weniger als 10. */
  quote: number | undefined;
  kompetenzen: Record<KompetenzId, Status>;
  /** Häufigste Fehlerart der letzten 8 Wochen (mindestens 3-mal). */
  hauptfehler: FehlerArt | undefined;
}

export interface Klassenuebersicht {
  zeilen: KindZeile[];
  /** Je Kompetenz: wie viele Kinder in welchem Stand. */
  verteilung: Record<KompetenzId, Record<Status, number>>;
  /** Häufige Fehlerarten der Klasse mit den Kindern, bei denen sie mindestens dreimal vorkamen. */
  fehler: { art: FehlerArt; anzahl: number; kinder: string[] }[];
  /** Je Bude: Anzahl Kinder mit Bronze, Silber, Gold. */
  buden: { id: string; name: string; gasse: string; stufen: Record<Stufe, number> }[];
  /** Kinder, die in den letzten 14 Tagen nicht gespielt haben. */
  ohneAktivitaet: string[];
}

const ACHT_WOCHEN = 56 * TAG;

function fehlerZaehlen(k: AnalyseKind, jetzt: number): Map<FehlerArt, number> {
  const m = new Map<FehlerArt, number>();
  for (const e of k.ereignisse) {
    if (!e.gewertet || e.richtig || !e.fehlerArt || e.fehlerArt === 'sonstige' || e.t < jetzt - ACHT_WOCHEN) continue;
    m.set(e.fehlerArt, (m.get(e.fehlerArt) ?? 0) + 1);
  }
  return m;
}

export function kindZeile(k: AnalyseKind, jetzt: number): KindZeile {
  const medaillen: Record<Stufe, number> = { bronze: 0, silber: 0, gold: 0 };
  for (const b of TAGESBUDEN) for (const s of STUFEN) if (k.fortschritt[b.id]?.[s]?.geschafft) medaillen[s]++;
  const ms7 = k.runden.filter((r) => r.start >= jetzt - 7 * TAG && r.start <= jetzt).reduce((s, r) => s + r.dauerMs, 0);
  const msAlle = k.runden.reduce((s, r) => s + r.dauerMs, 0);
  const gewertet = k.ereignisse.filter((e) => e.gewertet);
  const fenster = gewertet.slice(-60);
  const kompetenzen = {} as Record<KompetenzId, Status>;
  for (const kid of KOMPETENZ_REIHENFOLGE) kompetenzen[kid] = einschaetzen(k.ereignisse, kid).status;
  let hauptfehler: FehlerArt | undefined;
  let max = 2;
  for (const [art, n] of fehlerZaehlen(k, jetzt)) if (n > max) [hauptfehler, max] = [art, n];
  return {
    kind: k,
    medaillen,
    minuten7: Math.round(ms7 / 60000),
    minutenGesamt: Math.round(msAlle / 60000),
    aufgaben: gewertet.length + k.wochen.reduce((s, w) => s + w.gesamt, 0),
    quote: fenster.length >= 10 ? fenster.filter((e) => e.richtig).length / fenster.length : undefined,
    kompetenzen,
    hauptfehler,
  };
}

export function klassenuebersicht(kinder: readonly AnalyseKind[], jetzt: number): Klassenuebersicht {
  const zeilen = kinder.map((k) => kindZeile(k, jetzt));
  const verteilung = {} as Record<KompetenzId, Record<Status, number>>;
  for (const kid of KOMPETENZ_REIHENFOLGE) {
    const v: Record<Status, number> = { sicher: 0, aufGutemWeg: 0, weiterUeben: 0, kennenlernen: 0 };
    for (const z of zeilen) v[z.kompetenzen[kid]]++;
    verteilung[kid] = v;
  }
  const fehlerKarte = new Map<FehlerArt, { anzahl: number; kinder: string[] }>();
  for (const k of kinder) {
    for (const [art, n] of fehlerZaehlen(k, jetzt)) {
      const f = fehlerKarte.get(art) ?? { anzahl: 0, kinder: [] };
      f.anzahl += n;
      if (n >= 3) f.kinder.push(k.name);
      fehlerKarte.set(art, f);
    }
  }
  const fehler = [...fehlerKarte.entries()]
    .map(([art, f]) => ({ art, ...f }))
    .filter((f) => f.anzahl >= 3)
    .sort((a, b) => b.anzahl - a.anzahl)
    .slice(0, 6);
  const buden = TAGESBUDEN.filter((b) => b.spielbar).map((b) => {
    const stufen: Record<Stufe, number> = { bronze: 0, silber: 0, gold: 0 };
    for (const k of kinder) for (const s of STUFEN) if (k.fortschritt[b.id]?.[s]?.geschafft) stufen[s]++;
    return { id: b.id, name: b.name, gasse: b.gasse, stufen };
  });
  const ohneAktivitaet = kinder.filter((k) => k.zuletzt < jetzt - 14 * TAG).map((k) => k.name);
  return { zeilen, verteilung, fehler, buden, ohneAktivitaet };
}

/* ---------- Berichte als Bausteine (Bildschirm und PDF) ---------- */

const datum = (t: number): string => new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
const kurzDatum = (t: number): string => (t ? new Date(t).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' }) : '–');
const prozent = (q: number | undefined): string => (q === undefined ? '–' : `${Math.round(q * 100)} %`);
const veraenderung = (v: number, n: number): string => {
  const d = Math.round((n - v) * 100);
  return d === 0 ? '±0' : d > 0 ? `+${d} Punkte` : `−${-d} Punkte`;
};

export function klassenbericht(klassenName: string, u: Klassenuebersicht, jetzt: number, quellen: string): Baustein[] {
  const aus: Baustein[] = [
    { art: 'titel', text: `Mathe-Jahrmarkt: Klasse ${klassenName}`, unter: `Klassenübersicht vom ${datum(jetzt)} · ${quellen}` },
  ];
  if (u.zeilen.length === 0) {
    aus.push({ art: 'p', text: 'In dieser Klasse gibt es noch keine Kinder.' });
    return aus;
  }
  aus.push({ art: 'h', text: 'Übersicht' });
  aus.push({
    art: 'tabelle',
    spalten: ['Name', 'B / S / G', 'Min. 7 Tage', 'Aufgaben', 'Treffer', ...KOMPETENZEN_SCHULE.map((k) => KOMPETENZ_KURZ[k]), 'Zuletzt'],
    zeilen: u.zeilen.map((z) => ({
      zellen: [
        z.kind.name,
        `${z.medaillen.bronze} / ${z.medaillen.silber} / ${z.medaillen.gold}`,
        String(z.minuten7),
        String(z.aufgaben),
        prozent(z.quote),
        ...KOMPETENZEN_SCHULE.map((k) => STATUS_KURZ[z.kompetenzen[k]]),
        kurzDatum(z.kind.zuletzt),
      ],
      ampeln: [null, null, null, null, null, ...KOMPETENZEN_SCHULE.map((k) => STATUS_AMPEL[z.kompetenzen[k]]), null],
    })),
  });
  aus.push({
    art: 'hinweis',
    text: `B / S / G: geschaffte Stufen Bronze, Silber, Gold an ${TAGESBUDEN.length} Buden. Treffer: Anteil richtiger Antworten der letzten 60 Aufgaben. Kompetenzen: ${KOMPETENZEN_SCHULE.map((k) => `${KOMPETENZ_KURZ[k]} = ${KOMPETENZEN[k].name}`).join(', ')}. „–“: noch zu wenige Aufgaben für eine Einschätzung (mindestens 20 an 2 Tagen).`,
  });

  aus.push({ art: 'h', text: 'Wo die Klasse steht' });
  aus.push({
    art: 'balken',
    zeilen: KOMPETENZEN_SCHULE.map((k) => {
      const v = u.verteilung[k];
      const bekannt = v.sicher + v.aufGutemWeg + v.weiterUeben;
      return {
        name: KOMPETENZEN[k].name,
        anteil: bekannt ? (v.sicher + v.aufGutemWeg * 0.5) / bekannt : 0,
        text: bekannt ? `${v.sicher} sicher, ${v.aufGutemWeg} guter Weg, ${v.weiterUeben} üben` : 'noch keine Einschätzung',
      };
    }),
  });
  const ueben = KOMPETENZEN_SCHULE.map((k) => ({ k, namen: u.zeilen.filter((z) => z.kompetenzen[k] === 'weiterUeben').map((z) => z.kind.name) })).filter((x) => x.namen.length);
  if (ueben.length) {
    aus.push({ art: 'h3', text: 'Üben lohnt sich' });
    aus.push({ art: 'liste', punkte: ueben.map((x) => `${KOMPETENZEN[x.k].name}: ${x.namen.join(', ')}`) });
  }

  const ent = entwicklung(u.zeilen.map((z) => z.kind));
  if (ent.kinder > 0) {
    aus.push({ art: 'h', text: 'Entwicklung im Jahrmarkt-Check' });
    aus.push({ art: 'p', text: `Erster und letzter Check von ${ent.kinder === 1 ? '1 Kind' : `${ent.kinder} Kindern`} mit mindestens zwei Checks (Anteil richtig, gemittelt):` });
    aus.push({
      art: 'tabelle',
      spalten: ['Bereich', 'Erster Check', 'Letzter Check', 'Veränderung'],
      zeilen: ent.bereiche.map((e) => ({
        zellen: [BEREICH_NAME[e.bereich], prozent(e.vorher), prozent(e.nachher), veraenderung(e.vorher, e.nachher)],
        ampeln: [null, null, null, e.nachher - e.vorher >= 0.1 ? 'gruen' : e.nachher - e.vorher <= -0.1 ? 'rot' : null],
      })),
    });
  }

  aus.push({ art: 'h', text: 'Häufige Fehler' });
  if (u.fehler.length === 0) aus.push({ art: 'p', text: 'In den letzten 8 Wochen gibt es kein Fehlermuster, das öfter als zweimal vorkam.' });
  else
    aus.push({
      art: 'liste',
      punkte: u.fehler.map((f) => `${FEHLER_NAME[f.art]}: ${f.anzahl}-mal${f.kinder.length ? ` (mehrfach bei ${f.kinder.join(', ')})` : ''}`),
    });

  aus.push({ art: 'h', text: 'Buden' });
  for (const g of GASSEN.filter((x) => x.id !== 'abendmarkt')) {
    const buden = u.buden.filter((b) => b.gasse === g.id);
    if (!buden.length) continue;
    aus.push({ art: 'h3', text: g.name });
    aus.push({
      art: 'balken',
      zeilen: buden.map((b) => ({
        name: b.name,
        anteil: u.zeilen.length ? b.stufen.bronze / u.zeilen.length : 0,
        text: `${b.stufen.bronze} B · ${b.stufen.silber} S · ${b.stufen.gold} G`,
      })),
    });
  }
  if (u.ohneAktivitaet.length) aus.push({ art: 'p', text: `In den letzten 14 Tagen nicht gespielt: ${u.ohneAktivitaet.join(', ')}.` });
  aus.push({ art: 'hinweis', text: 'Die Auswertung ist eine Einschätzung aus dem Spiel, keine Diagnose. Sie ersetzt keine Lernstandserhebung, kann aber Hinweise für Förderung und Gespräche geben.' });
  return aus;
}

export function schuelerbericht(k: AnalyseKind, jetzt: number): Baustein[] {
  const z = kindZeile(k, jetzt);
  const aus: Baustein[] = [
    { art: 'titel', text: `Mathe-Jahrmarkt: ${k.name}`, unter: `${k.klassenName ? `Klasse ${k.klassenName} · ` : ''}Bericht vom ${datum(jetzt)}` },
  ];
  aus.push({ art: 'h', text: 'Überblick' });
  aus.push({
    art: 'liste',
    punkte: [
      `Übungszeit an den Buden: ${z.minuten7} Minuten in den letzten 7 Tagen, ${z.minutenGesamt} Minuten insgesamt`,
      `Gewertete Aufgaben: ${z.aufgaben}${z.quote !== undefined ? `, davon zuletzt ${prozent(z.quote)} richtig` : ''}`,
      `Geschaffte Stufen: ${z.medaillen.bronze}-mal Bronze, ${z.medaillen.silber}-mal Silber, ${z.medaillen.gold}-mal Gold (von je ${TAGESBUDEN.length})`,
      `Zuletzt gespielt: ${k.zuletzt ? datum(k.zuletzt) : 'noch nicht'}`,
      `Gespielt auf: ${k.geraete.join(', ')}`,
    ],
  });

  aus.push({ art: 'h', text: 'Kompetenzen' });
  aus.push({
    art: 'tabelle',
    spalten: ['Bereich', 'Stand', 'Aufgaben', 'Wissen', 'Sicherheit', 'Anwendung'],
    zeilen: KOMPETENZEN_SCHULE.map((kid) => {
      const e = einschaetzen(k.ereignisse, kid);
      const d = (x: Status | undefined): string => (x ? STATUS_TEXT[x] : '–');
      return {
        zellen: [KOMPETENZEN[kid].name, STATUS_TEXT[e.status], String(e.anzahl), d(e.dimensionen.wissen), d(e.dimensionen.sicherheit), d(e.dimensionen.anwendung)],
        ampeln: [null, STATUS_AMPEL[e.status], null, e.dimensionen.wissen ? STATUS_AMPEL[e.dimensionen.wissen] : null, e.dimensionen.sicherheit ? STATUS_AMPEL[e.dimensionen.sicherheit] : null, e.dimensionen.anwendung ? STATUS_AMPEL[e.dimensionen.anwendung] : null],
      };
    }),
  });
  const reihen = unsichereReihen(k.ereignisse.filter((e) => e.kompetenz === 'kopfrechnen'));
  if (reihen.length) aus.push({ art: 'p', text: `Einmaleins: noch unsicher bei den Reihen ${reihen.join(', ')}.` });
  aus.push({ art: 'hinweis', text: 'Wissen: Konzept verstanden. Sicherheit: zuverlässig gelöst. Anwendung: in anderen Situationen genutzt. Eine Einschätzung gibt es ab 20 Aufgaben an 2 Tagen.' });

  const fehler = [...fehlerZaehlen(k, jetzt).entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  aus.push({ art: 'h', text: 'Fehlermuster (letzte 8 Wochen)' });
  if (fehler.length === 0) aus.push({ art: 'p', text: 'Kein wiederkehrendes Fehlermuster erkannt.' });
  else aus.push({ art: 'liste', punkte: fehler.map(([art, n]) => `${FEHLER_NAME[art]}: ${n}-mal`) });

  aus.push({ art: 'h', text: 'Jahrmarkt-Check' });
  const checks = alleChecks(k);
  if (checks.length >= 2) {
    aus.push({ art: 'p', text: `${checks.length} Checks – Anteil richtig je Bereich:` });
    aus.push({
      art: 'tabelle',
      spalten: ['Bereich', ...checks.map((c) => new Date(c.am).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: '2-digit' }))],
      zeilen: BEREICHE.filter((b) => checks.some((c) => anteil(c, b) !== undefined)).map((b) => ({ zellen: [BEREICH_NAME[b], ...checks.map((c) => prozent(anteil(c, b)))] })),
    });
  }
  if (!k.check) aus.push({ art: 'p', text: 'Noch nicht gemacht. Er dauert etwa 10 Minuten und steht im Menü des Kindes.' });
  else {
    const c = k.check;
    aus.push({ art: 'p', text: `Zuletzt am ${datum(c.am)}:` });
    aus.push({
      art: 'balken',
      zeilen: (Object.keys(BEREICH_NAME) as Bereich[]).flatMap((b) => {
        const rg = c.bereiche[b];
        const text = { sicher: 'sicher', fastSicher: 'fast sicher', ueben: 'üben' } as const;
        return rg ? [{ name: BEREICH_NAME[b], anteil: rg[1] ? rg[0] / rg[1] : 0, text: `${rg[0]} von ${rg[1]}, ${text[einschaetzung(rg)]}` }] : [];
      }),
    });
  }

  aus.push({ art: 'h', text: 'Fortschritt an den Buden' });
  for (const g of GASSEN) {
    const buden = BUDEN.filter((b) => b.spielbar && b.gasse === g.id);
    if (!buden.length) continue;
    aus.push({ art: 'h3', text: g.name });
    aus.push({
      art: 'balken',
      zeilen: buden.map((b) => {
        const geschafft = STUFEN.filter((s) => k.fortschritt[b.id]?.[s]?.geschafft);
        return { name: b.name, anteil: geschafft.length / STUFEN.length, text: geschafft.length ? geschafft.map((s) => STUFEN_NAME[s]).join(', ') : 'noch offen' };
      }),
    });
  }
  aus.push({ art: 'hinweis', text: 'Die Auswertung ist eine Einschätzung aus dem Spiel, keine Diagnose.' });
  return aus;
}
