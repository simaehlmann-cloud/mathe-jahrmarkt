import { describe, expect, it } from 'vitest';
import { AUFTRAG_RICHTIG, auftragPruefen, auftraegeFuerTag, neueAuftraege, pruefeAuftraege, tagKennung } from '../src/domain/auftraege';
import {
  AUFTRAG_FELD,
  AUFTRAGSFOLGE,
  MAX_HOEHE,
  WELT,
  baueAuftrag,
  istGeloest,
  istUnverdeckt,
  leererBau,
  nimmBlock,
  pruefeBau,
  setzeBlock,
  verbaut,
} from '../src/domain/bau';
import { BUDEN, budeInfo } from '../src/domain/buden';
import { BEREICH_BUDEN, CHECK_PLAN, einschaetzung, pruefeCheck, werteCheckAus } from '../src/domain/check';
import { rundeVerbuchen } from '../src/domain/fortschritt/fortschritt';
import { stufeFreigabe } from '../src/domain/fortschritt/kaufgrenze';
import { neuesProfil, type Profil } from '../src/domain/profil';
import { RAENGE, rang } from '../src/domain/rang';
import { createRng } from '../src/domain/rng';
import { BUDEN_DEFINITIONEN } from '../src/buden';

const profil = (): Profil => neuesProfil('p1', 'Alex', 'mensch', 0);
const geschafft = (p: Profil, bude: string, stufe: 'bronze' | 'silber' | 'gold'): Profil =>
  rundeVerbuchen(p, { bude, stufe, start: 0, dauerMs: 1, punkte: 900, richtig: 9, gesamt: 10 }).profil;

describe('Bauplatz', () => {
  it('Blöcke setzen und abbauen: Lager und Welt bleiben im Gleichgewicht', () => {
    let b = leererBau();
    const start = b.bloecke;
    b = setzeBlock(b, 2, 3, 1);
    b = setzeBlock(b, 2, 3, 4);
    expect(b.welt[3 * WELT + 2]).toEqual([1, 4]);
    expect(b.bloecke + verbaut(b.welt)).toBe(start);
    b = nimmBlock(b, 2, 3);
    expect(b.welt[3 * WELT + 2]).toEqual([1]);
    expect(b.bloecke + verbaut(b.welt)).toBe(start);
    expect(nimmBlock(leererBau(), 0, 0)).toEqual(leererBau());
  });
  it('ohne Blöcke und über der Höchstgrenze wird nichts gesetzt', () => {
    let b = { ...leererBau(), bloecke: 0 };
    expect(setzeBlock(b, 0, 0, 1)).toBe(b);
    b = { ...leererBau(), bloecke: 100 };
    for (let i = 0; i < MAX_HOEHE + 3; i++) b = setzeBlock(b, 1, 1, 0);
    expect(b.welt[WELT + 1]).toHaveLength(MAX_HOEHE);
  });
  it('kaputte Speicherdaten werden repariert', () => {
    expect(pruefeBau(null)).toEqual(leererBau());
    const r = pruefeBau({ bloecke: -3, welt: [[1, 99, 'x']], erledigt: [1, 'a'] });
    expect(r.bloecke).toBe(leererBau().bloecke);
    expect(r.welt).toHaveLength(WELT * WELT);
    expect(r.erledigt).toEqual(['a']);
    const ok = pruefeBau({ bloecke: 5, welt: Array.from({ length: WELT * WELT }, (_, i) => (i === 0 ? [1, 99, 2] : [])), erledigt: [] });
    expect(ok.welt[0]).toEqual([1, 2]);
  });
  it('Bauaufträge: Vorlage löst sich selbst, Gebäude zum Nachbauen sind unverdeckt', () => {
    const rng = createRng(17);
    for (let i = 0; i < 400; i++) {
      const art = AUFTRAGSFOLGE[i % AUFTRAGSFOLGE.length]!;
      const a = baueAuftrag(art, rng, i);
      expect(a.ziel).toHaveLength(AUFTRAG_FELD * AUFTRAG_FELD);
      expect(istGeloest(a, a.ziel)).toBe(true);
      expect(a.wuerfel).toBe(a.ziel.reduce((s, v) => s + v, 0));
      expect(a.wuerfel).toBeGreaterThan(0);
      if (art === 'bauplan' || art === 'nachbauen') {
        expect(istUnverdeckt(a.ziel)).toBe(true);
        expect(a.ziel.filter((v) => v > 0).length).toBeGreaterThanOrEqual(4);
      }
      if (art === 'symmetrie') {
        for (let y = 0; y < AUFTRAG_FELD; y++) for (let x = 0; x < AUFTRAG_FELD; x++) expect(a.ziel[y * AUFTRAG_FELD + x]).toBe(a.ziel[y * AUFTRAG_FELD + AUFTRAG_FELD - 1 - x]);
        expect(a.fest?.slice(0, 2)).toEqual(a.ziel.slice(0, 2));
      }
      // Ein leerer Bau ist nie gelöst
      expect(istGeloest(a, Array(AUFTRAG_FELD * AUFTRAG_FELD).fill(0))).toBe(false);
    }
  });
  it('Quader: an jeder Stelle und gedreht richtig, Lücken und Stufen falsch', () => {
    const a = { ...baueAuftrag('quader', createRng(1), 0), masse: [3, 2, 2] as [number, number, number] };
    const feld = (zellen: [number, number][], h = 2): number[] => {
      const f = Array(16).fill(0);
      for (const [x, y] of zellen) f[y * 4 + x] = h;
      return f;
    };
    expect(istGeloest(a, feld([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]))).toBe(true);
    expect(istGeloest(a, feld([[3, 1], [3, 2], [3, 3], [2, 1], [2, 2], [2, 3]]))).toBe(true);
    expect(istGeloest(a, feld([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], 3))).toBe(false);
    expect(istGeloest(a, feld([[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]]))).toBe(false);
    expect(istGeloest(a, feld([[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]]))).toBe(false);
  });
  it('Verdeckung wird erkannt', () => {
    // Hinten 1, davor 3: verdeckt
    expect(istUnverdeckt([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0])).toBe(false);
    expect(istUnverdeckt([0, 0, 0, 0, 0, 3, 2, 0, 0, 2, 1, 0, 0, 0, 0, 0])).toBe(true);
  });
});

describe('Tagesaufträge', () => {
  it('drei verschiedene, spielbare Buden aus möglichst verschiedenen Gassen, gleich am selben Tag', () => {
    const p = profil();
    for (const tag of ['2026-11-09', '2026-11-10', '2027-01-01']) {
      const a = neueAuftraege(p, false, tag);
      expect(a.liste).toHaveLength(3);
      expect(new Set(a.liste.map((x) => x.bude)).size).toBe(3);
      expect(new Set(a.liste.map((x) => budeInfo(x.bude).gasse)).size).toBe(3);
      for (const x of a.liste) expect(stufeFreigabe(p, x.bude, x.stufe, false).frei).toBe(true);
      expect(neueAuftraege(p, false, tag)).toEqual(a);
    }
    expect(neueAuftraege(p, false, '2026-11-09')).not.toEqual(neueAuftraege(p, false, '2026-11-10'));
  });
  it('Empfehlung aus dem Check kommt zuerst', () => {
    const a = neueAuftraege(profil(), false, '2026-11-09', ['rechenmauer']);
    expect(a.liste[0]?.bude).toBe('rechenmauer');
  });
  it('vorhandene Aufträge bleiben am selben Tag, am nächsten Tag kommen neue', () => {
    const p = { ...profil(), auftraege: { tag: '2026-11-09', liste: [{ bude: 'kasse', stufe: 'bronze' as const, erledigt: true }], bonus: false } };
    expect(auftraegeFuerTag(p, false, '2026-11-09')).toBe(p.auftraege);
    expect(auftraegeFuerTag(p, false, '2026-11-10').tag).toBe('2026-11-10');
  });
  it('erledigt nur mit genug Treffern, passender Bude und mindestens der Stufe; Bonus einmal', () => {
    const stand = { tag: 't', liste: [{ bude: 'kasse', stufe: 'silber' as const, erledigt: false }, { bude: 'waage', stufe: 'bronze' as const, erledigt: true }], bonus: false };
    expect(auftragPruefen(stand, { bude: 'kasse', stufe: 'silber', richtig: AUFTRAG_RICHTIG - 1 }, 't')?.neu).toHaveLength(0);
    expect(auftragPruefen(stand, { bude: 'kasse', stufe: 'bronze', richtig: 10 }, 't')?.neu).toHaveLength(0);
    expect(auftragPruefen(stand, { bude: 'kasse', stufe: 'silber', richtig: 10 }, 'anderer Tag')).toBeNull();
    const e = auftragPruefen(stand, { bude: 'kasse', stufe: 'gold', richtig: AUFTRAG_RICHTIG }, 't');
    expect(e?.neu).toHaveLength(1);
    expect(e?.bonus).toBe(true);
    expect(auftragPruefen(e!.stand, { bude: 'kasse', stufe: 'gold', richtig: 10 }, 't')?.bonus).toBe(false);
  });
  it('Tageskennung in Ortszeit, Speicherdaten werden geprüft', () => {
    expect(tagKennung(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
    expect(pruefeAuftraege({ tag: 'x', liste: [{ bude: 'gibtsnicht', stufe: 'bronze' }, { bude: 'kasse', stufe: 'bronze', erledigt: true }] })?.liste).toEqual([
      { bude: 'kasse', stufe: 'bronze', erledigt: true },
    ]);
    expect(pruefeAuftraege('kaputt')).toBeNull();
  });
});

describe('Jahrmarkt-Check', () => {
  it('jede Check-Aufgabe ist aus einer gebauten Bude und als Auswahl lösbar', () => {
    const rng = createRng(5);
    for (const c of CHECK_PLAN) {
      expect(BEREICH_BUDEN[c.bereich]).toContain(c.bude);
      const def = BUDEN_DEFINITIONEN[c.bude];
      expect(def, c.bude).toBeTruthy();
      for (let i = 0; i < 50; i++) {
        const a = def!.erzeuge(c.stufe, rng, () => 1);
        expect(a.optionen.some((o) => o.wert === a.antwort), c.bude).toBe(true);
        expect(a.eingabe).not.toBe('ziffern');
      }
    }
  });
  it('alle Bereichsbuden gibt es', () => {
    for (const ids of Object.values(BEREICH_BUDEN)) for (const id of ids) expect(BUDEN.some((b) => b.id === id)).toBe(true);
  });
  it('Auswertung je Bereich, Empfehlung für schwache Bereiche zuerst', () => {
    const p = profil();
    const e = werteCheckAus(
      [
        { bereich: 'raum', richtig: false },
        { bereich: 'raum', richtig: false },
        { bereich: 'rechnen', richtig: true },
        { bereich: 'daten', richtig: true },
        { bereich: 'daten', richtig: false },
      ],
      p,
      false,
      1,
    );
    expect(e.bereiche.raum).toEqual([0, 2]);
    expect(e.bereiche.daten).toEqual([1, 2]);
    expect(e.empfehlung[0] && BEREICH_BUDEN.raum).toContain(e.empfehlung[0]);
    expect(BEREICH_BUDEN.daten).toContain(e.empfehlung[1]);
    expect(e.empfehlung).toHaveLength(3);
    expect(einschaetzung([2, 2])).toBe('sicher');
    expect(einschaetzung([1, 2])).toBe('fastSicher');
    expect(einschaetzung([0, 2])).toBe('ueben');
    expect(pruefeCheck(JSON.parse(JSON.stringify(e)))).toEqual(e);
    expect(pruefeCheck({ am: 'x' })).toBeNull();
  });
  it('geschaffte Buden werden ohne Paket nicht mehr empfohlen', () => {
    let p = profil();
    for (const id of BEREICH_BUDEN.raum) p = geschafft(p, id, 'bronze');
    const e = werteCheckAus([{ bereich: 'raum', richtig: false }], p, false, 1);
    for (const id of e.empfehlung) expect(BEREICH_BUDEN.raum).not.toContain(id);
  });
});

describe('Ränge', () => {
  it('steigen mit geschafften Stufen', () => {
    let p = profil();
    expect(rang(p).name).toBe('Neuling');
    expect(rang(p).fehlen).toBe(RAENGE[1]!.ab);
    for (const id of ['dartbude', 'kasse', 'waage']) p = geschafft(p, id, 'bronze');
    expect(rang(p).name).toBe('Budenhelfer');
    expect(rang(p).sterne).toBe(3);
    expect(RAENGE[RAENGE.length - 1]!.ab).toBe(BUDEN.length * 3);
  });
});

import { wertText } from '../src/domain/aufgaben/anzeige';
import { baueKasse, baueUhr, baueAchterbahn } from '../src/domain/aufgaben/groessen';
import { baueBruch, baueDezimal, baueDivision } from '../src/domain/aufgaben/klasse5';
import { baueMauer, baueRiesenrad } from '../src/domain/aufgaben/muster';
import { STUFEN } from '../src/domain/buden';

describe('Spiel-Buden', () => {
  it('frei gebaute Antworten werden lesbar angezeigt', () => {
    const rng = createRng(1);
    const kasse = baueKasse('bronze', rng);
    expect(wertText(kasse, 345)).toBe('3,45 €');
    const uhr = baueUhr('bronze', rng);
    expect(wertText(uhr, 7 * 60 + 5)).toBe('7:05 Uhr');
    const pizza = baueBruch('silber', rng);
    expect(wertText(pizza, 803)).toBe('3/8');
    const div = baueDivision('silber', rng);
    expect(wertText(div, 452)).toBe('45 Rest 2');
    const lukas = baueDezimal('gold', rng, 'bruch');
    expect(wertText(lukas, 75)).toBe('0,75');
    expect(wertText(lukas, 50)).toBe('0,5');
    expect(wertText(baueDezimal('bronze', rng), 37)).toBe('3,7');
  });
  it('Spiel-Buden fragen frei ab und haben trotzdem Antwortmöglichkeiten für Bildschirmleser', () => {
    const rng = createRng(2);
    for (const baue of [baueKasse, baueUhr, baueAchterbahn, baueMauer, baueRiesenrad, baueDivision, baueBruch]) {
      for (const stufe of STUFEN) {
        for (let i = 0; i < 60; i++) {
          const a = baue(stufe, rng);
          expect(a.eingabe, `${a.bude} ${a.form}`).toBe('ziffern');
          expect(a.optionen.length).toBeGreaterThanOrEqual(3);
          expect(a.optionen.some((o) => o.wert === a.antwort)).toBe(true);
          // Jede Antwortmöglichkeit hat eine lesbare Beschriftung
          for (const o of a.optionen) expect(wertText(a, o.wert)).not.toBe('');
        }
      }
    }
  });
  it('Achterbahn: Die Schienen aus dem Lager reichen für jede Antwort', () => {
    const rng = createRng(3);
    for (let i = 0; i < 300; i++) {
      const a = baueAchterbahn(rng.pick(STUFEN), rng);
      const stuecke = a.daten.stuecke as number[];
      expect(a.antwort % Math.min(...stuecke)).toBe(0);
    }
  });
});

import { Rundensteuerung } from '../src/domain/runde';
import { einmaleinsAufgabe } from '../src/domain/aufgaben/einmaleins';
import { PAUSE_GUELTIG_MS, mitPause, ohnePause, pauseFuer, pruefePausen } from '../src/domain/pause';

describe('Unterbrochene Runde fortsetzen', () => {
  const neu = (fortsetzen?: Parameters<typeof mitPause>[1]) =>
    new Rundensteuerung({ bude: 'dartbude', stufe: 'bronze', rng: createRng(4), erzeuge: einmaleinsAufgabe, aehnlich: (a) => a, gewichtung: () => 1, fortsetzen, jetzt: () => 1000 });
  it('Zwischenstand nach drei Aufgaben, Fortsetzen zählt weiter bis 10', () => {
    const r = neu();
    expect(r.zwischenstand()).toBeUndefined();
    for (let i = 0; i < 3; i++) {
      r.antworte(r.aktuelle.antwort, 5000);
      r.weiter();
    }
    const z = r.zwischenstand()!;
    expect(z).toMatchObject({ gestellt: 3, richtig: 3, serie: 3 });
    expect(z.punkte).toBeGreaterThan(300);
    const r2 = neu({ ...z, bude: 'dartbude', stufe: 'bronze', am: 0, ergebnisse: [true, true, true] });
    expect(r2.aktuellePhase).toBe('haupt');
    expect(r2.nummer).toBe(4);
    let n = 0;
    while (r2.aktuellePhase !== 'fertig' && n++ < 30) {
      r2.antworte(r2.aktuelle.antwort, 5000);
      r2.weiter();
    }
    const e = r2.ergebnis();
    expect(e.gesamt).toBe(10);
    expect(e.richtig).toBe(10);
    expect(e.punkte).toBeGreaterThan(z.punkte);
  });
  it('Pausen: je Bude und Stufe eine, gilt einen Tag, Speicherdaten werden geprüft', () => {
    let p = profil();
    const pause = { bude: 'kasse', stufe: 'bronze' as const, am: 1000, gestellt: 4, richtig: 3, serie: 1, punkte: 420, durchhalte: 0, ergebnisse: [true, true, false, true] };
    p = mitPause(p, pause);
    p = mitPause(p, { ...pause, gestellt: 5 });
    expect(p.pausen).toHaveLength(1);
    expect(pauseFuer(p, 'kasse', 'bronze', 2000)?.gestellt).toBe(5);
    expect(pauseFuer(p, 'kasse', 'silber', 2000)).toBeUndefined();
    expect(pauseFuer(p, 'kasse', 'bronze', 1000 + PAUSE_GUELTIG_MS)).toBeUndefined();
    expect(ohnePause(p, 'kasse', 'bronze').pausen).toHaveLength(0);
    expect(pruefePausen([pause, { ...pause, gestellt: 0 }, { ...pause, richtig: 9 }, 'x'])).toEqual([pause]);
  });
});

import { frischmacher } from '../src/domain/auftraege';
import { KARTEN, gesammelt, neueKarten, offeneFeiern, spieltageDieseWoche, wochenKennung } from '../src/domain/belohnungen';
import { BLITZ_STUFEN, blitzAufgabe, blitzBloecke, pruefeBlitz } from '../src/domain/blitz';

describe('Frischmacher, Wochenziel, Feiern, Sammelalbum, Blitzrechnen', () => {
  it('Frischmacher: geschaffte Bude ohne Runde seit 10 Tagen kommt als Auftrag wieder', () => {
    let p = profil();
    p = rundeVerbuchen(p, { bude: 'kasse', stufe: 'bronze', start: Date.parse('2026-10-01T10:00'), dauerMs: 1, punkte: 900, richtig: 9, gesamt: 10 }).profil;
    p = rundeVerbuchen(p, { bude: 'waage', stufe: 'bronze', start: Date.parse('2026-11-08T10:00'), dauerMs: 1, punkte: 900, richtig: 9, gesamt: 10 }).profil;
    const jetzt = Date.parse('2026-11-09T12:00');
    expect(frischmacher(p, false, jetzt).map((f) => f.bude)).toEqual(['kasse']);
    const a = neueAuftraege(p, false, '2026-11-09');
    expect(a.liste.find((x) => x.frisch)?.bude).toBe('kasse');
    expect(a.liste).toHaveLength(3);
    expect(frischmacher(p, false, Date.parse('2026-10-05T12:00'))).toHaveLength(0);
  });
  it('Kalenderwoche nach ISO und Spieltage der Woche', () => {
    expect(wochenKennung(new Date(2026, 10, 9))).toBe('2026-W46');
    expect(wochenKennung(new Date(2027, 0, 1))).toBe('2026-W53');
    expect(wochenKennung(new Date(2026, 0, 1))).toBe('2026-W01');
    let p = profil();
    for (const d of ['2026-11-09T09:00', '2026-11-09T18:00', '2026-11-11T10:00', '2026-11-02T10:00'])
      p = rundeVerbuchen(p, { bude: 'kasse', stufe: 'bronze', start: Date.parse(d), dauerMs: 1, punkte: 100, richtig: 1, gesamt: 10 }).profil;
    expect(spieltageDieseWoche(p, new Date(2026, 10, 12))).toBe(2);
  });
  it('Feiern: Gasse fertig, danach nicht noch einmal', () => {
    let p = profil();
    for (const b of BUDEN.filter((x) => x.gasse === 'forschergasse')) p = geschafft(p, b.id, 'bronze');
    expect(offeneFeiern(p)).toEqual([{ art: 'gasse', gasse: 'forschergasse', name: 'Forschergasse' }]);
    expect(offeneFeiern({ ...p, belohnt: ['gasse:forschergasse'] })).toEqual([]);
  });
  it('Sammelkarten: eindeutige Kennungen, neue Karten werden erkannt', () => {
    expect(new Set(KARTEN.map((k) => k.id)).size).toBe(KARTEN.length);
    let p = profil();
    expect(gesammelt(p)).toBe(0);
    p = geschafft(p, 'kasse', 'bronze');
    expect(neueKarten(p).map((k) => k.id)).toEqual(['bude:kasse']);
    expect(neueKarten({ ...p, album: ['bude:kasse'] })).toEqual([]);
    expect(KARTEN.some((k) => k.seltenheit === 'legendaer')).toBe(true);
  });
  it('Blitzrechnen: richtige ganze Antworten, Belohnung, Speicherdaten', () => {
    const rng = createRng(12);
    for (const st of BLITZ_STUFEN)
      for (let i = 0; i < 500; i++) {
        const a = blitzAufgabe(st.id, rng);
        expect(Number.isInteger(a.antwort) && a.antwort > 0, a.text).toBe(true);
      }
    expect(blitzBloecke(10, true)).toBe(8);
    expect(blitzBloecke(0, true)).toBe(0);
    expect(pruefeBlitz({ rekorde: { leicht: 12, mittel: -1, quatsch: 3 }, zuletzt: 5 })).toEqual({ rekorde: { leicht: 12 }, zuletzt: 5 });
  });
});

import { KNOBEL_ARTEN, WOCHENRAETSEL, knobelRunde, raetselDerWoche } from '../src/domain/knobel';

describe('Knobelzelt', () => {
  it('jede Knobelaufgabe hat 2–3 Schritte mit ganzzahligen, nicht negativen Antworten', () => {
    const rng = createRng(31);
    for (const stufe of [1, 2, 3] as const)
      for (let i = 0; i < 200; i++)
        for (const bauer of KNOBEL_ARTEN) {
          const a = bauer(rng, stufe);
          expect(a.schritte.length, a.id).toBeGreaterThanOrEqual(1);
          expect(a.schritte.length).toBeLessThanOrEqual(3);
          for (const s of a.schritte) {
            expect(Number.isInteger(s.antwort) && s.antwort >= 0, `${a.id}: ${s.frage} = ${s.antwort}`).toBe(true);
            expect(s.tipp.length).toBeGreaterThan(5);
          }
        }
    expect(new Set(knobelRunde(createRng(1), 2).map((a) => a.id)).size).toBe(5);
  });
  it('Rätsel der Woche: jede Woche eines, gleich in derselben Woche, Lösungen stimmen', () => {
    expect(raetselDerWoche('2026-W46')).toBe(raetselDerWoche('2026-W46'));
    expect(raetselDerWoche('2026-W46')).not.toBe(raetselDerWoche('2026-W47'));
    for (const r of WOCHENRAETSEL) {
      expect(Number.isInteger(r.antwort)).toBe(true);
      expect(r.loesung).toContain(String(r.antwort === 2000 ? '2 000' : r.antwort));
    }
  });
});

import { INSEL, BREITE, LANDSCHAFT, START, boeden, istBoden, kaufeEinrichtung, leereInsel, nimm, oberkante, pruefeInsel, setze, wegAufInsel, TUER_OBEN } from '../src/domain/insel';

describe('Bauinsel', () => {
  const bau = (s: ReturnType<typeof leereInsel>, x: number, y: number, art: number, n = 1) => {
    let st = s;
    for (let i = 0; i < n; i++) {
      const e = setze(st, x, y, art, 100);
      if (!e.ok) throw new Error(`${x},${y}: ${e.grund}`);
      st = e.stand;
    }
    return st;
  };
  it('Landschaft: Start ist begehbar, Wasser und Bäume nicht, Hügel hat Höhe', () => {
    const s = leereInsel();
    expect(istBoden(s, START.x, START.y, START.z)).toBe(true);
    const wasser = LANDSCHAFT.art.indexOf('wasser');
    expect(wasser).toBeGreaterThan(0);
    expect(boeden(s, wasser % BREITE, Math.floor(wasser / BREITE))).toEqual([]);
    const baum = LANDSCHAFT.baum.indexOf(true);
    expect(boeden(s, baum % BREITE, Math.floor(baum / BREITE))).toEqual([]);
    expect(Math.max(...LANDSCHAFT.hoehe)).toBe(2);
    // Auf den Hügel kommt man zu Fuß
    expect(wegAufInsel(s, START, { x: 4, y: 4, z: 2 }).length).toBeGreaterThan(0);
  });
  it('Mauer versperrt den Weg, eine Tür öffnet ihn, ohne Treppe kommt man nicht auf einen Block', () => {
    let s = leereInsel();
    // Mauer quer über die Insel (Zeile 15), zwei Blöcke hoch, außer am Weg wird sie ganz geschlossen
    for (let x = 0; x < INSEL; x++) if (!LANDSCHAFT.baum[15 * BREITE + x]) s = bau(s, x, 15, 1, 2);
    const ziel = { x: 12, y: 12, z: 0 };
    expect(wegAufInsel(s, START, ziel)).toEqual([]);
    // Tür statt Mauer an einer Stelle
    let t = s;
    for (let i = 0; i < 2; i++) {
      const e = nimm(t, 12, 15, 100);
      if (e.ok) t = e.stand;
    }
    t = { ...t, inventar: { '101': 1 } };
    const tuer = setze(t, 12, 15, 101, 100);
    expect(tuer.ok).toBe(true);
    if (!tuer.ok) return;
    expect(tuer.stand.stapel[15 * BREITE + 12]).toEqual([101, TUER_OBEN]);
    const weg = wegAufInsel(tuer.stand, START, ziel);
    expect(weg.length).toBeGreaterThan(0);
    expect(weg.some((p) => p.x === 12 && p.y === 15)).toBe(true);
  });
  it('Treppe führt eine Ebene hinauf, hinunter springen geht', () => {
    let s = bau(leereInsel(), 12, 18, 2);
    expect(wegAufInsel(s, START, { x: 12, y: 18, z: 1 })).toEqual([]);
    s = { ...s, inventar: { '103': 1 } };
    const e = setze(s, 12, 19, 103, 100);
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    const hoch = wegAufInsel(e.stand, START, { x: 12, y: 18, z: 1 });
    expect(hoch.length).toBeGreaterThan(0);
    expect(wegAufInsel(e.stand, { x: 12, y: 18, z: 1 }, START).length).toBeGreaterThan(0);
  });
  it('Bauen kostet Blöcke, Abbauen gibt sie zurück; Einrichtung aus dem Inventar; Grenzen', () => {
    const s = leereInsel();
    const a = setze(s, 5, 15, 3, 2);
    expect(a.ok && a.bloecke).toBe(1);
    if (!a.ok) return;
    const b = nimm(a.stand, 5, 15, 1);
    expect(b.ok && b.bloecke).toBe(2);
    expect(setze(s, 5, 15, 3, 0)).toEqual({ ok: false, grund: 'keineBloecke' });
    expect(setze(s, 5, 15, 110, 5)).toEqual({ ok: false, grund: 'keinTeil' });
    expect(setze(s, START.x, START.y, 3, 5)).toEqual({ ok: false, grund: 'figur' });
    const wasser = LANDSCHAFT.art.indexOf('wasser');
    expect(setze(s, wasser % BREITE, Math.floor(wasser / BREITE), 3, 5)).toEqual({ ok: false, grund: 'feld' });
    let hoch = s;
    for (let i = 0; i < 8; i++) hoch = (setze(hoch, 5, 15, 1, 99) as { stand: typeof s }).stand;
    expect(oberkante(hoch, 5, 15)).toBe(8);
    expect(setze(hoch, 5, 15, 1, 99)).toEqual({ ok: false, grund: 'hoch' });
    const k = kaufeEinrichtung(s, 30, 110);
    expect(k.ok && k.taler).toBe(5);
    if (!k.ok) return;
    const bett = setze(k.stand, 5, 15, 110, 0);
    expect(bett.ok).toBe(true);
    if (!bett.ok) return;
    const zurueck = nimm(bett.stand, 5, 15, 0);
    expect(zurueck.ok && zurueck.stand.inventar['110']).toBe(1);
    expect(kaufeEinrichtung(s, 3, 110).ok).toBe(false);
  });
  it('Speicherdaten werden geprüft; die Figur fällt beim Abbauen auf den Boden darunter', () => {
    expect(pruefeInsel(null)).toEqual(leereInsel());
    let s = bau(leereInsel(), 8, 18, 1, 2);
    s = { ...s, figur: { x: 8, y: 18, z: 2 } };
    const e = nimm(s, 8, 18, 0);
    expect(e.ok && e.stand.figur).toEqual({ x: 8, y: 18, z: 1 });
    const g = pruefeInsel(JSON.parse(JSON.stringify({ ...s, inventar: { '101': 2, '7': 3, '110': -1 } })));
    expect(g.inventar).toEqual({ '101': 2 });
    expect(g.figur).toEqual(s.figur);
    expect(pruefeInsel({ ...s, figur: { x: 8, y: 18, z: 0 } }).figur).toEqual(START);
  });
});

import { setzeAn, nimmAn, LUFT } from '../src/domain/insel';

describe('Bauinsel: Haus mit Dach', () => {
  it('Wände, Tür, Dach über dem leeren Raum; die Figur geht hinein und steht unter dem Dach', () => {
    let s: ReturnType<typeof leereInsel> = { ...leereInsel(), inventar: { '101': 1 } };
    const n = (e: ReturnType<typeof setzeAn>) => {
      if (!e.ok) throw new Error(e.grund);
      return e.stand;
    };
    // Raum 3 × 3 (x 14–16, y 14–16) mit Wänden außen herum (x 13–17, y 13–17), zwei hoch
    for (let x = 13; x <= 17; x++)
      for (let y = 13; y <= 17; y++) {
        const rand = x === 13 || x === 17 || y === 13 || y === 17;
        if (!rand || (x === 15 && y === 17)) continue;
        s = n(setzeAn(s, x, y, 0, 3, 99));
        s = n(setzeAn(s, x, y, 1, 3, 99));
      }
    s = n(setzeAn(s, 15, 17, 0, 101, 99));
    // Dach in Ebene 2 über alles, auch über den leeren Raum (Halt durch die Nachbarn)
    for (let y = 13; y <= 17; y++) for (let x = 13; x <= 17; x++) s = n(setzeAn(s, x, y, 2, 2, 99));
    expect(s.stapel[15 * BREITE + 15]).toEqual([LUFT, LUFT, 2]);
    expect(istBoden(s, 15, 15, 0)).toBe(true);
    const weg = wegAufInsel(s, START, { x: 15, y: 15, z: 0 });
    expect(weg.length).toBeGreaterThan(0);
    // Ein Block ohne jeden Halt schwebt
    expect(setzeAn(leereInsel(), 5, 18, 3, 1, 9)).toEqual({ ok: false, grund: 'schwebt' });
    // Abbauen in der Mitte lässt das Dach stehen, Tür verschwindet ganz
    const ohneTuer = nimmAn(s, 15, 17, 1, 0);
    expect(ohneTuer.ok && ohneTuer.stand.stapel[17 * BREITE + 15]).toEqual([LUFT, LUFT, 2]);
    expect(ohneTuer.ok && ohneTuer.stand.inventar['101']).toBe(1);
    // Speicherdaten mit Luft bleiben erhalten
    expect(pruefeInsel(JSON.parse(JSON.stringify(s))).stapel[15 * BREITE + 15]).toEqual([LUFT, LUFT, 2]);
  });
});
