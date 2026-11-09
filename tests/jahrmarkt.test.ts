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
