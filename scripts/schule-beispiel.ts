// Beispielklasse für Store-Bilder und Vorschauvideo der Schulversion (keine echten Kinderdaten).
// Liest eine Klassenliste, die die App selbst weitergegeben hat, und schreibt dazu Ergebnisdateien
// von mehreren „Kinder-iPads“ – genau das, was die Lehrkraft im Unterricht einsammelt.
//
// Wird von scripts/store-schule.mjs gebündelt und aufgerufen:
//   node schule-beispiel.mjs <klassenliste.jahrmarkt> <PIN> <Ausgabeordner> <jetzt-ms>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { entschluesseln, leseUmschlag, verschluesseln } from '../src/schule/dienste/schulkrypto';
import { pruefeKlassenliste, TYP_ERGEBNISSE, TYP_KLASSENLISTE, type Ergebnisse } from '../src/schule/domain/austausch';
import type { ErgebnisProfil } from '../src/schule/domain/schuldaten';
import { BEREICH_BUDEN, type Bereich, type CheckErgebnis } from '../src/domain/check';
import { BUDEN } from '../src/domain/buden';
import type { Ereignis } from '../src/domain/lernprofil/lernprofil';
import type { FehlerArt } from '../src/domain/aufgaben/typen';
import type { KompetenzId } from '../src/domain/kompetenzen/modell';
import { FIGUREN, type Runde, type StufenStand } from '../src/domain/profil';
import { TUECHER } from '../src/domain/aussehen';

const [datei, pin, ordner, jetztText] = process.argv.slice(2);
if (!datei || !pin || !ordner) throw new Error('Aufruf: <klassenliste> <PIN> <Ordner> [jetzt]');
const jetzt = Number(jetztText ?? Date.now());
const TAG = 86_400_000;

/** Fester Zufall, damit jede Aufnahme gleich aussieht. */
let saat = 20261123;
const zufall = () => {
  saat = (saat * 1103515245 + 12345) % 2147483648;
  return saat / 2147483648;
};

/** Typische Fehler je Kompetenz (für „häufige Fehlermuster“). */
const FEHLER: Partial<Record<KompetenzId, FehlerArt[]>> = {
  kopfrechnen: ['nachbaraufgabe', 'nachbaraufgabe', 'umkehr'],
  stellenwert: ['stelle', 'buendel'],
  zahlverstaendnis: ['skala', 'stelle'],
  halbschriftlich: ['zehner', 'operation'],
  schriftlich: ['uebertrag', 'uebertrag', 'ziffern'],
  groessen: ['runden', 'sonstige'],
  operationsverstaendnis: ['operation', 'umkehr'],
};

/** Klassenbild: Größen und schriftliches Rechnen schwächer, Raum und Muster stark. */
const KLASSE: Partial<Record<KompetenzId, number>> = {
  groessen: -0.16,
  schriftlich: -0.1,
  raum: 0.06,
  muster: 0.04,
  kopfrechnen: 0.02,
};

const budenDaten = BUDEN.filter((b) => b.spielbar && b.gasse !== 'abendmarkt');

async function los() {
  const u = leseUmschlag(readFileSync(datei!, 'utf8'));
  if (u.typ !== TYP_KLASSENLISTE) throw new Error('Das ist keine Klassenliste.');
  const liste = pruefeKlassenliste(await entschluesseln(u, pin!));
  mkdirSync(ordner!, { recursive: true });

  // Jedes Kind hat seine Figur schon gestaltet (sonst sähen alle Eintrittskarten gleich aus)
  const EXTRAS = ['keins', 'cap', 'sonnenbrille', 'schleife', 'brille', 'muetze', 'kopfhoerer'] as const;
  const figuren = liste.profile.map((lp, nr) => ({
    ...lp,
    figur: FIGUREN[(nr * 4 + 1) % FIGUREN.length]!.id,
    aussehen: { fell: nr % 3, tuch: nr % 4 === 3 ? 'keins' : TUECHER[nr % TUECHER.length]!.id, extra: EXTRAS[(nr * 3) % EXTRAS.length]! },
    figurGewaehlt: true,
  }));
  writeFileSync(
    `${ordner}/klassenliste-figuren.jahrmarkt`,
    await verschluesseln({ ...liste, profile: figuren }, TYP_KLASSENLISTE, 'Lehrer-iPad', pin!, jetzt, 20_000),
  );

  const profile: ErgebnisProfil[] = figuren.map((lp, nr) => {
    // Können des Kindes: zwei Kinder brauchen viel Übung, einige sind sehr sicher
    const grund = nr % 9 === 4 ? 0.52 : nr % 7 === 2 ? 0.6 : 0.7 + zufall() * 0.25;
    const fleiss = nr === 11 ? 0 : 0.7 + zufall() * 0.3; // ein Kind hat zwei Wochen nicht gespielt
    const eigen: Partial<Record<KompetenzId, number>> = {};
    for (const k of Object.keys(FEHLER) as KompetenzId[]) eigen[k] = (zufall() - 0.5) * 0.16;
    const quote = (k: KompetenzId) => Math.max(0.25, Math.min(0.98, grund + (KLASSE[k] ?? 0) + (eigen[k] ?? 0)));

    const ereignisse: Ereignis[] = [];
    const runden: Runde[] = [];
    const fortschritt: Record<string, Partial<Record<'bronze' | 'silber' | 'gold', StufenStand>>> = {};
    const tage = nr === 11 ? [24, 22, 19, 17] : [20, 18, 16, 15, 13, 11, 9, 8, 6, 4, 3, 2, 1, 0];
    for (const tagZurueck of tage) {
      if (zufall() > fleiss + 0.15) continue;
      const anzahlRunden = 2 + Math.floor(zufall() * 4);
      for (let r = 0; r < anzahlRunden; r++) {
        const bude = budenDaten[Math.floor(zufall() * budenDaten.length)]!;
        const stand = fortschritt[bude.id] ?? {};
        const stufe = stand.silber?.geschafft ? 'gold' : stand.bronze?.geschafft ? 'silber' : 'bronze';
        const start = jetzt - tagZurueck * TAG - (3 + r) * 3_600_000 + Math.floor(zufall() * 1_800_000);
        const gesamt = 10;
        let richtig = 0;
        for (let i = 0; i < gesamt; i++) {
          const komp = bude.kompetenzen[i % bude.kompetenzen.length]!;
          const ok = zufall() < quote(komp.kompetenz) + (stufe === 'bronze' ? 0.08 : stufe === 'gold' ? -0.08 : 0);
          if (ok) richtig++;
          const arten = FEHLER[komp.kompetenz];
          ereignisse.push({
            t: start + i * 18_000,
            bude: bude.id,
            kompetenz: komp.kompetenz,
            dimension: komp.dimension,
            richtig: ok,
            ms: 3000 + Math.floor(zufall() * 6000),
            ...(ok || !arten ? {} : { fehlerArt: arten[Math.floor(zufall() * arten.length)] }),
            gewertet: true,
          });
        }
        const punkte = richtig * 90 + Math.floor(zufall() * 60);
        runden.push({ bude: bude.id, stufe, start, dauerMs: 180_000 + Math.floor(zufall() * 120_000), punkte, richtig, gesamt });
        const alt = stand[stufe];
        const verlauf = [...(alt?.verlauf ?? []), punkte].slice(-10);
        fortschritt[bude.id] = {
          ...stand,
          [stufe]: { geschafft: (alt?.geschafft ?? false) || richtig >= 8, rekord: Math.max(alt?.rekord ?? 0, punkte), gespielt: (alt?.gespielt ?? 0) + 1, verlauf },
        };
      }
    }
    // Aufträge der Lehrkraft: gut die Hälfte der Klasse hat sie schon erledigt
    for (const a of liste.auftraege) {
      if (a.ziel.art !== 'bude' || (a.fuer && !a.fuer.includes(lp.id)) || nr % 5 === 1 || nr % 7 === 3 || nr === 11) continue;
      const bude = BUDEN.find((b) => b.id === (a.ziel as { bude: string }).bude)!;
      const stufe = a.ziel.stufe ?? 'bronze';
      const start = a.erstellt + 30_000 + nr * 7_000;
      let richtig = 0;
      for (let i = 0; i < 10; i++) {
        const komp = bude.kompetenzen[i % bude.kompetenzen.length]!;
        const ok = zufall() < quote(komp.kompetenz);
        if (ok) richtig++;
        ereignisse.push({ t: start + i * 500, bude: bude.id, kompetenz: komp.kompetenz, dimension: komp.dimension, richtig: ok, ms: 4000, gewertet: true });
      }
      runden.push({ bude: bude.id, stufe, start, dauerMs: 200_000, punkte: richtig * 90, richtig, gesamt: 10 });
    }
    ereignisse.sort((a, b) => a.t - b.t);
    runden.sort((a, b) => a.start - b.start);

    // Jahrmarkt-Check vor drei Wochen und letzte Woche: die meisten Kinder legen zu
    const check = (am: number, plus: number): CheckErgebnis => {
      const bereiche: Partial<Record<Bereich, [number, number]>> = {};
      for (const b of Object.keys(BEREICH_BUDEN) as Bereich[]) {
        const komp: KompetenzId = b === 'zahlen' ? 'stellenwert' : b === 'rechnen' ? 'halbschriftlich' : b;
        const g = 4;
        bereiche[b] = [Math.max(0, Math.min(g, Math.round(g * (quote(komp) - 0.12 + plus) + (zufall() - 0.5)))), g];
      }
      const schwach = (Object.entries(bereiche) as [Bereich, [number, number]][]).filter(([, [r, g]]) => r < g).map(([b]) => BEREICH_BUDEN[b][0]!);
      return { am, bereiche, empfehlung: schwach.slice(0, 3) };
    };
    const vorher = check(jetzt - 21 * TAG + nr * 60_000, 0);
    const nachher = check(jetzt - 2 * TAG + nr * 60_000, nr === 11 ? 0 : 0.1 + zufall() * 0.1);
    const mitCheck = nr !== 11;

    return {
      id: lp.id,
      name: lp.name,
      figur: lp.figur,
      aussehen: lp.aussehen,
      fortschritt,
      ereignisse,
      wochen: [],
      runden,
      check: mitCheck ? nachher : vorher,
      klasse: lp.klasse,
      checkVerlauf: mitCheck ? [vorher, nachher] : [vorher],
    };
  });

  // Je vier Kinder auf einem iPad, wie im Gerätewagen
  for (let i = 0; i * 4 < profile.length; i++) {
    const name = `iPad ${i + 2}`;
    const ergebnisse: Ergebnisse = {
      geraetId: `beispiel-ipad-${i + 2}`,
      geraetName: name,
      erstellt: jetzt - 3_600_000 + i * 60_000,
      klassen: liste.klassen,
      profile: profile.slice(i * 4, i * 4 + 4),
    };
    const text = await verschluesseln(ergebnisse, TYP_ERGEBNISSE, name, pin!, ergebnisse.erstellt, 20_000);
    writeFileSync(`${ordner}/ergebnisse-ipad-${i + 2}.jahrmarkt`, text);
  }
  console.log(`${profile.length} Kinder in ${Math.ceil(profile.length / 4)} Ergebnisdateien`);
}

await los();
