import { describe, expect, it } from 'vitest';
import {
  BREITE,
  BRUECKE,
  EINRICHTUNG,
  GRUNDSTUECKE,
  HOEHE,
  INSEL,
  INSEL_AUFTRAEGE,
  LANDSCHAFT,
  LUFT,
  START,
  TIERE,
  bebaubar,
  idx,
  istBoden,
  kaufeEinrichtung,
  nimmAn,
  leereInsel,
  nimmTier,
  offenerInselAuftrag,
  pruefeInsel,
  pruefeInselAuftrag,
  setzeAn,
  setzeTier,
  tiereBummeln,
  wegAufInsel,
  type InselStand,
} from '../src/domain/insel';
import { createRng } from '../src/domain/rng';

const ok = (e: ReturnType<typeof setzeAn>): InselStand => {
  if (!e.ok) throw new Error(e.grund);
  return e.stand;
};
const grund = (id: string) => GRUNDSTUECKE.find((g) => g.id === id)!;

describe('Bauinsel: zweite Insel und Brücke', () => {
  it('über die Brücke kommt man zur zweiten Insel; Brücke und Wasser sind nicht bebaubar', () => {
    const s = leereInsel();
    const weg = wegAufInsel(s, START, { x: 35, y: 12, z: 0 });
    expect(weg.length).toBeGreaterThan(20);
    expect(weg.some((p) => p.x === BRUECKE.x0)).toBe(true);
    expect(bebaubar(BRUECKE.x0, BRUECKE.y)).toBe(false);
    expect(bebaubar(25, 3)).toBe(false);
    expect(LANDSCHAFT.art.length).toBe(BREITE * HOEHE);
  });
  it('alle Grundstücke liegen ganz auf bebaubarem Land hinter der ersten Brücke und sind erreichbar', () => {
    for (const g of GRUNDSTUECKE) {
      for (let y = g.y0; y < g.y0 + g.n; y++) for (let x = g.x0; x < g.x0 + g.n; x++) expect(bebaubar(x, y), `${g.id} ${x},${y}`).toBe(true);
      if (g.y0 < 40) expect(g.x0).toBeGreaterThan(BRUECKE.x1);
      expect(wegAufInsel(leereInsel(), START, { x: g.x0 + 1, y: g.y0 + 1, z: LANDSCHAFT.hoehe[idx(g.x0 + 1, g.y0 + 1)] ?? 0 }).length).toBeGreaterThan(0);
    }
  });
  it('alte Spielstände (24 × 24) werden auf den breiten Plan umgerechnet', () => {
    const alt = Array.from({ length: INSEL * INSEL }, () => [] as number[]);
    alt[18 * INSEL + 8] = [1, 2];
    const neu = pruefeInsel({ stapel: alt, inventar: { '101': 2 }, figur: START });
    expect(neu.stapel.length).toBe(BREITE * HOEHE);
    expect(neu.stapel[idx(8, 18)]).toEqual([1, 2]);
    expect(neu.inventar['101']).toBe(2);
    expect(neu.tiere).toEqual([]);
    expect(neu.erledigt).toEqual([]);
  });
  it('jede Einrichtung hat eine Kategorie, Preise sind positiv, Kennungen eindeutig', () => {
    const ids = [...EINRICHTUNG.map((e) => e.id), ...TIERE.map((t) => t.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of EINRICHTUNG) expect(['bauen', 'wohnen', 'garten', 'spielen']).toContain(e.kategorie);
    for (const e of [...EINRICHTUNG, ...TIERE]) expect(e.preis).toBeGreaterThan(0);
  });
});

describe('Bauinsel: Tiere', () => {
  it('kaufen, setzen, bummeln (bleiben auf Böden, nie ins Wasser) und zurücknehmen', () => {
    let s = leereInsel();
    const k = kaufeEinrichtung(s, 100, 140);
    expect(k.ok).toBe(true);
    if (!k.ok) return;
    s = k.stand;
    expect(s.inventar['140']).toBe(1);
    const e = setzeTier(s, 10, 20, 0, 140);
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    s = e.stand;
    expect(s.tiere).toEqual([{ art: 140, x: 10, y: 20, z: 0 }]);
    expect(setzeTier(s, 10, 20, 0, 140)).toEqual({ ok: false, grund: 'keinTeil' });
    // Auf ein Tier kann man nicht bauen
    expect(setzeAn(s, 10, 20, 0, 1, 5)).toEqual({ ok: false, grund: 'besetzt' });
    const rng = createRng(4);
    for (let i = 0; i < 300; i++) {
      s = tiereBummeln(s, () => rng.next());
      const t = s.tiere[0]!;
      expect(istBoden(s, t.x, t.y, t.z)).toBe(true);
      expect(LANDSCHAFT.art[idx(t.x, t.y)]).not.toBe('wasser');
    }
    const zurueck = nimmTier(s, s.tiere[0]!.x, s.tiere[0]!.y);
    expect(zurueck?.tiere).toEqual([]);
    expect(zurueck?.inventar['140']).toBe(1);
  });
  it('Tiere werden beim Laden geprüft', () => {
    const s = pruefeInsel({ ...leereInsel(), tiere: [{ art: 140, x: 10, y: 20, z: 0 }, { art: 999, x: 1, y: 1, z: 0 }, { art: 141, x: 25, y: 3, z: 0 }] });
    expect(s.tiere).toEqual([{ art: 140, x: 10, y: 20, z: 0 }]);
  });
});

describe('Bauinsel: Bauaufträge auf den Grundstücken', () => {
  it('Reihenfolge und Prüfungen: Fläche, Umfang, Turm, Würfel, Haus, Garten', () => {
    let s = leereInsel();
    expect(offenerInselAuftrag(s)?.id).toBe('flaeche8');
    // Fläche: 8 Felder auf A
    const a = grund('a');
    let n = 0;
    for (let y = a.y0; y < a.y0 + 2; y++) for (let x = a.x0; x < a.x0 + 4; x++, n++) s = ok(setzeAn(s, x, y, LANDSCHAFT.hoehe[idx(x, y)] ?? 0, 1, 99));
    expect(n).toBe(8);
    let r = pruefeInselAuftrag(s);
    expect(r?.auftrag.id).toBe('flaeche8');
    s = r!.stand;
    // Umfang: noch nicht alle Randfelder
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    for (let y = a.y0; y < a.y0 + a.n; y++)
      for (let x = a.x0; x < a.x0 + a.n; x++) {
        const rand = x === a.x0 || y === a.y0 || x === a.x0 + a.n - 1 || y === a.y0 + a.n - 1;
        if (rand && (s.stapel[idx(x, y)] ?? []).length === 0) s = ok(setzeAn(s, x, y, LANDSCHAFT.hoehe[idx(x, y)] ?? 0, 1, 99));
      }
    r = pruefeInselAuftrag(s);
    expect(r?.auftrag.id).toBe('umfang');
    s = r!.stand;
    // Turm: 5 hoch auf B (4 hoch reicht nicht)
    const b = grund('b');
    for (let z = 0; z < 4; z++) s = ok(setzeAn(s, b.x0, b.y0, z, 1, 99));
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    s = ok(setzeAn(s, b.x0, b.y0, 4, 1, 99));
    r = pruefeInselAuftrag(s);
    expect(r?.auftrag.id).toBe('turm5');
    s = r!.stand;
    // Würfel 2 · 2 · 2
    for (const [dx, dy] of [[1, 1], [2, 1], [1, 2], [2, 2]]) for (const z of [0, 1]) s = ok(setzeAn(s, b.x0 + dx!, b.y0 + dy!, z, 2, 99));
    r = pruefeInselAuftrag(s);
    expect(r?.auftrag.id).toBe('wuerfel8');
    s = r!.stand;
    // Haus auf C: Wände 2 hoch rundherum, Tür, Fenster, Dach
    const c = grund('c');
    s = { ...s, inventar: { '101': 1, '102': 1, '120': 6 } };
    for (let y = c.y0; y < c.y0 + c.n; y++)
      for (let x = c.x0; x < c.x0 + c.n; x++) {
        const rand = x === c.x0 || y === c.y0 || x === c.x0 + c.n - 1 || y === c.y0 + c.n - 1;
        if (!rand) continue;
        if (x === c.x0 + 1 && y === c.y0 + c.n - 1) s = ok(setzeAn(s, x, y, 0, 101, 99));
        else if (x === c.x0 + 2 && y === c.y0 + c.n - 1) {
          s = ok(setzeAn(s, x, y, 0, 3, 99));
          s = ok(setzeAn(s, x, y, 1, 102, 99));
        } else {
          s = ok(setzeAn(s, x, y, 0, 3, 99));
          s = ok(setzeAn(s, x, y, 1, 3, 99));
        }
      }
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    for (let y = c.y0; y < c.y0 + c.n; y++) for (let x = c.x0; x < c.x0 + c.n; x++) s = ok(setzeAn(s, x, y, 2, 2, 99));
    expect(s.stapel[idx(c.x0 + 1, c.y0 + 1)]).toEqual([LUFT, LUFT, 2]);
    r = pruefeInselAuftrag(s);
    expect(r?.auftrag.id).toBe('haus');
    s = r!.stand;
    // Garten: 6 Blumen auf C (oben auf das Dach zählt auch – Hauptsache auf dem Grundstück)
    for (let i = 0; i < 6; i++) s = ok(setzeAn(s, c.x0 + (i % 4), c.y0 + Math.floor(i / 4), 3, 120, 99));
    r = pruefeInselAuftrag(s);
    expect(r?.auftrag.id).toBe('garten6');
    s = r!.stand;
    expect(offenerInselAuftrag(s)?.id).toBe('treppe4');
    expect(s.erledigt).toEqual(INSEL_AUFTRAEGE.slice(0, 6).map((x) => x.id));
  });
});

describe('Bauinsel: Bauaufträge auf dem Bauland (0.14)', () => {
  /** Stand, in dem die ersten sechs Aufträge erledigt sind und genug im Inventar liegt. */
  const nachSechs = (): InselStand => ({
    ...leereInsel(),
    erledigt: INSEL_AUFTRAEGE.slice(0, 6).map((a) => a.id),
    inventar: { '101': 3, '102': 6, '105': 2, '112': 1, '115': 20, '117': 4, '120': 8, '121': 8, '140': 1, '143': 2 },
  });
  const turm = (s: InselStand, x: number, y: number, h: number, art = 1): InselStand => {
    for (let z = 0; z < h; z++) s = ok(setzeAn(s, x, y, z, art, 99));
    return s;
  };
  const geschafft = (s: InselStand, id: string): InselStand => {
    const r = pruefeInselAuftrag(s);
    expect(r?.auftrag.id).toBe(id);
    return r!.stand;
  };

  it('es gibt 16 Aufträge, D und E liegen auf dem Bauland', () => {
    expect(INSEL_AUFTRAEGE).toHaveLength(16);
    expect(new Set(INSEL_AUFTRAEGE.map((a) => a.id)).size).toBe(16);
    for (const id of ['d', 'e']) {
      const g = grund(id);
      expect(g.n).toBe(6);
      for (let y = g.y0; y < g.y0 + g.n; y++) for (let x = g.x0; x < g.x0 + g.n; x++) expect(aufBauland(x, y), `${id} ${x},${y}`).toBe(true);
    }
  });

  it('Bauplatz D: Treppe, doppelt so hoch, Rechteck, Muster, Spiegelbild', () => {
    const d = grund('d');
    let s = nachSechs();
    expect(offenerInselAuftrag(s)?.id).toBe('treppe4');
    // Treppe: 1, 2, 3 reicht nicht; dann die 4
    s = turm(s, d.x0, d.y0, 1);
    s = turm(s, d.x0 + 1, d.y0, 2);
    s = turm(s, d.x0 + 2, d.y0, 3);
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    s = geschafft(turm(s, d.x0 + 3, d.y0, 4), 'treppe4');
    // Doppelt so hoch: 3 und 6 nebeneinander (hier senkrecht im Plan)
    s = turm(s, d.x0 + 5, d.y0 + 1, 3);
    s = turm(s, d.x0 + 5, d.y0 + 2, 5);
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    s = geschafft(ok(setzeAn(s, d.x0 + 5, d.y0 + 2, 5, 1, 99)), 'doppelt');
    // Rechteck 12: frischer Stand, 3 · 4 (ein Quadrat 3 · 3 + 3 lose zählt nicht)
    s = { ...nachSechs(), erledigt: [...nachSechs().erledigt, 'treppe4', 'doppelt'] };
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) s = ok(setzeAn(s, d.x0 + x, d.y0 + y, 0, 2, 99));
    for (const [x, y] of [[5, 5], [4, 5], [5, 4]] as const) s = ok(setzeAn(s, d.x0 + x, d.y0 + y, 0, 2, 99));
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    for (const [x, y] of [[5, 5], [4, 5], [5, 4]] as const) s = { ...s, stapel: s.stapel.map((st, i) => (i === idx(d.x0 + x, d.y0 + y) ? [] : st)) };
    for (let y = 0; y < 3; y++) s = ok(setzeAn(s, d.x0 + 3, d.y0 + y, 0, 2, 99));
    s = geschafft(s, 'rechteck12');
    // Muster: unterste Reihe abwechselnd Ziegel und Gold
    const reihe = d.y0 + 5;
    for (let x = 0; x < 5; x++) s = ok(setzeAn(s, d.x0 + x, reihe, 0, x % 2 ? 6 : 3, 99));
    s = ok(setzeAn(s, d.x0 + 5, reihe, 0, 3, 99));
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    s = { ...s, stapel: s.stapel.map((st, i) => (i === idx(d.x0 + 5, reihe) ? [] : st)) };
    s = geschafft(ok(setzeAn(s, d.x0 + 5, reihe, 0, 6, 99)), 'muster');
    // Spiegelbild in Reihe 4: Höhen 1, 2, 3, 3, 2, 1
    const sp = d.y0 + 4;
    [1, 2, 3, 3, 2].forEach((h, x) => (s = turm(s, d.x0 + x, sp, h, 3)));
    s = turm(s, d.x0 + 5, sp, 2, 3);
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    s = { ...s, stapel: s.stapel.map((st, i) => (i === idx(d.x0 + 5, sp) ? [] : st)) };
    s = geschafft(turm(s, d.x0 + 5, sp, 1, 3), 'spiegel');
    expect(offenerInselAuftrag(s)?.id).toBe('quader12');
  });

  it('Bauplatz E: Quader, Gehege, Sitzgruppe, halb und halb, großes Haus', () => {
    const e = grund('e');
    let s: InselStand = { ...nachSechs(), erledigt: INSEL_AUFTRAEGE.slice(0, 11).map((a) => a.id) };
    // Quader 3 · 2 · 2 (ein 2 · 2 · 2 reicht nicht)
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) s = turm(s, e.x0 + x, e.y0 + y, 2);
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    for (let y = 0; y < 2; y++) s = turm(s, e.x0 + 2, e.y0 + y, 2);
    s = geschafft(s, 'quader12');
    // Gehege: 4 · 4 außen auf den unteren Reihen, innen 2 · 2, Tor vorne
    s = { ...s, stapel: s.stapel.map(() => []) };
    const x0 = e.x0;
    const y0 = e.y0 + 2;
    for (let y = y0; y < y0 + 4; y++)
      for (let x = x0; x < x0 + 4; x++) {
        const rand = x === x0 || y === y0 || x === x0 + 3 || y === y0 + 3;
        if (rand && !(x === x0 + 1 && y === y0 + 3)) s = ok(setzeAn(s, x, y, 0, 115, 99));
      }
    const t1 = setzeTier(s, x0 + 1, y0 + 1, 0, 140);
    if (!t1.ok) throw new Error('Tier');
    s = t1.stand;
    const t2 = setzeTier(s, x0 + 2, y0 + 2, 0, 143);
    if (!t2.ok) throw new Error('Tier');
    s = t2.stand;
    expect(pruefeInselAuftrag(s)).toBeUndefined(); // Lücke statt Tor
    s = geschafft(ok(setzeAn(s, x0 + 1, y0 + 3, 0, 105, 99)), 'gehege');
    // Tiere laufen nicht durch das Tor hinaus
    let b = s;
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) b = tiereBummeln(b, () => rng.next());
    for (const t of b.tiere) expect(t.x > x0 && t.x < x0 + 3 && t.y > y0 && t.y < y0 + 3, `${t.x},${t.y}`).toBe(true);
    // Sitzgruppe oben rechts: Tisch mit 4 Stühlen
    const tx = e.x0 + 4;
    const ty = e.y0 + 1;
    s = ok(setzeAn(s, tx, ty, 0, 112, 99));
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1]]) s = ok(setzeAn(s, tx + dx!, ty + dy!, 0, 117, 99));
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    s = geschafft(ok(setzeAn(s, tx, ty - 1, 0, 117, 99)), 'sitzgruppe');
    // Halb und halb: 6 rote, 6 gelbe
    s = { ...s, stapel: s.stapel.map(() => []), tiere: [] };
    for (let i = 0; i < 6; i++) s = ok(setzeAn(s, e.x0 + i, e.y0, 0, 120, 99));
    for (let i = 0; i < 5; i++) s = ok(setzeAn(s, e.x0 + i, e.y0 + 1, 0, 121, 99));
    expect(pruefeInselAuftrag(s)).toBeUndefined();
    s = geschafft(ok(setzeAn(s, e.x0 + 5, e.y0 + 1, 0, 121, 99)), 'halbhalb');
    // Großes Haus: 1 Tür, 3 Fenster, Dach
    s = { ...s, stapel: s.stapel.map(() => []) };
    const hy = e.y0 + 2;
    for (let y = hy; y < hy + 4; y++)
      for (let x = e.x0; x < e.x0 + 4; x++) {
        const rand = x === e.x0 || y === hy || x === e.x0 + 3 || y === hy + 3;
        if (!rand) continue;
        if (x === e.x0 + 1 && y === hy + 3) s = ok(setzeAn(s, x, y, 0, 101, 99));
        else if ((x === e.x0 + 2 && y === hy + 3) || (x === e.x0 && y === hy + 1) || (x === e.x0 + 3 && y === hy + 1)) {
          s = ok(setzeAn(s, x, y, 0, 3, 99));
          s = ok(setzeAn(s, x, y, 1, 102, 99));
        } else s = turm(s, x, y, 2, 3);
      }
    for (let y = hy; y < hy + 4; y++) for (let x = e.x0; x < e.x0 + 4; x++) s = ok(setzeAn(s, x, y, 2, 14, 99));
    s = geschafft(s, 'haus2');
    expect(offenerInselAuftrag(s)).toBeUndefined();
    expect(s.erledigt).toEqual(INSEL_AUFTRAEGE.map((x) => x.id));
  });
});

import { BOOT, BRUECKE2, STEG, aufInsel3 } from '../src/domain/insel';
describe('Strandinsel und Steg (0.11.1)', () => {
  it('Strandinsel über die zweite Brücke erreichbar, Steg vom Ankunftsplatz', () => {
    const s = leereInsel();
    const nach = (x: number, y: number) => wegAufInsel(s, START, { x, y, z: 0 });
    expect(nach(BRUECKE2.x, BRUECKE2.y1).length).toBeGreaterThan(0);
    expect(nach(33, 29).length).toBeGreaterThan(0);
    expect(aufInsel3(33, 29)).toBe(true);
    expect(nach(STEG.x, STEG.y1).length).toBeGreaterThan(0);
    expect(LANDSCHAFT.art[BOOT.y * BREITE + BOOT.x]).toBe('wasser');
  });
  it('Spielstände aus 0.11.0 (44 × 24) bleiben erhalten', () => {
    const alt = Array.from({ length: BREITE * 24 }, () => [] as number[]);
    alt[10 * BREITE + 5] = [2, 2];
    const p = pruefeInsel({ stapel: alt, inventar: {}, figur: { x: 12, y: 21, z: 0 }, tiere: [], erledigt: [] });
    expect(p.stapel).toHaveLength(BREITE * HOEHE);
    expect(p.stapel[10 * BREITE + 5]).toEqual([2, 2]);
  });
  it('Bauplätze bleiben frei von Wegen und Bäumen', () => {
    for (const g of GRUNDSTUECKE)
      for (let y = g.y0; y < g.y0 + g.n; y++)
        for (let x = g.x0; x < g.x0 + g.n; x++) {
          expect(LANDSCHAFT.art[y * BREITE + x], `${g.id} ${x},${y}`).not.toBe('weg');
          expect(LANDSCHAFT.baum[y * BREITE + x]).toBe(false);
        }
  });
});

import { BAULAND, BRUECKE3, INSEL_MAX, LIEGEN, SITZEN, aufBauland, einrichtung } from '../src/domain/insel';
describe('Bauland, neue Einrichtung, Sitzen und Liegen (0.12)', () => {
  it('Bauland ist groß, flach und über die dritte Brücke erreichbar', () => {
    const s = leereInsel();
    let flaeche = 0;
    for (let y = BAULAND.y0; y <= BAULAND.y1; y++) for (let x = BAULAND.x0; x <= BAULAND.x1; x++) if (aufBauland(x, y)) flaeche++;
    expect(flaeche).toBeGreaterThan(450);
    expect(wegAufInsel(s, START, { x: BRUECKE3.x, y: BRUECKE3.y1, z: 0 }).length).toBeGreaterThan(0);
    expect(wegAufInsel(s, START, { x: 20, y: 50, z: 0 }).length).toBeGreaterThan(0);
    expect(INSEL_MAX).toBeGreaterThanOrEqual(12);
  });
  it('Spielstände aus 0.11.1 (44 × 40) werden übernommen', () => {
    const alt = Array.from({ length: BREITE * 40 }, () => [] as number[]);
    alt[30 * BREITE + 30] = [3];
    const p = pruefeInsel({ stapel: alt, inventar: {}, figur: { x: 12, y: 21, z: 0 }, tiere: [], erledigt: [] });
    expect(p.stapel).toHaveLength(BREITE * HOEHE);
    expect(p.stapel[30 * BREITE + 30]).toEqual([3]);
  });
  it('Teppich und Gartentor sind begehbar, Sitz- und Liegemöbel sind Einrichtung', () => {
    let s = leereInsel();
    s = { ...s, inventar: { '131': 1, '105': 1 } };
    const a = setzeAn(s, 20, 50, 0, 131, 0);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(istBoden(a.stand, 20, 50, 0)).toBe(true);
    const b = setzeAn(a.stand, 21, 50, 0, 105, 0);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(wegAufInsel(b.stand, { x: 19, y: 50, z: 0 }, { x: 22, y: 50, z: 0 }).length).toBe(4);
    for (const id of [...Object.keys(SITZEN), ...Object.keys(LIEGEN)]) expect(einrichtung(Number(id))).toBeTruthy();
  });
});

import { INSEL_DAEMMERUNG_MS, INSEL_TAG_MS, dreheAn, drehbar, inselLicht, richtungVon } from '../src/domain/insel';
describe('Bauinsel 0.14: Drehen, Tag und Nacht', () => {
  it('Möbel drehen sich in Viertelumdrehungen, Blöcke und Türen nicht; Abbauen vergisst die Richtung', () => {
    let s: InselStand = { ...leereInsel(), inventar: { '117': 2, '101': 1 } };
    s = ok(setzeAn(s, 10, 20, 0, 117, 99));
    expect(richtungVon(s, 10, 20, 0)).toBe(0);
    for (let i = 1; i <= 4; i++) {
      s = dreheAn(s, 10, 20, 0)!;
      expect(richtungVon(s, 10, 20, 0)).toBe(i % 4);
    }
    s = dreheAn(s, 10, 20, 0)!;
    expect(s.richtung).toEqual({ '10,20,0': 1 });
    // gespeichert und wieder geladen
    expect(pruefeInsel(JSON.parse(JSON.stringify(s))).richtung).toEqual({ '10,20,0': 1 });
    // abbauen und neu setzen: steht wieder gerade
    s = ok(nimmAn(s, 10, 20, 0, 99));
    expect(s.richtung).toEqual({});
    s = ok(setzeAn(s, 10, 20, 0, 117, 99));
    expect(richtungVon(s, 10, 20, 0)).toBe(0);
    // Block und Tür sind nicht drehbar
    s = ok(setzeAn(s, 11, 20, 0, 3, 99));
    expect(dreheAn(s, 11, 20, 0)).toBeUndefined();
    s = ok(setzeAn(s, 12, 20, 0, 101, 99));
    expect(dreheAn(s, 12, 20, 0)).toBeUndefined();
    expect(drehbar(110) && drehbar(115) && drehbar(105) && drehbar(160)).toBe(true);
    expect(drehbar(103) || drehbar(120) || drehbar(3)).toBe(false);
  });
  it('fremde oder kaputte Richtungen beim Laden werden verworfen', () => {
    const s = pruefeInsel({ ...leereInsel(), richtung: { '1,1,0': 2, kaputt: 1, '10,20,0': 9 } });
    expect(s.richtung).toEqual({});
  });
  it('Tageslicht: 8 Minuten Tag, 2 Minuten Dämmerung, dann Nacht; Wachzeit wird geladen', () => {
    expect(inselLicht(0)).toBe(1);
    expect(inselLicht(INSEL_TAG_MS)).toBe(1);
    expect(inselLicht(INSEL_TAG_MS + INSEL_DAEMMERUNG_MS / 2)).toBeCloseTo(0.5);
    expect(inselLicht(INSEL_TAG_MS + INSEL_DAEMMERUNG_MS)).toBe(0);
    expect(inselLicht(10 * INSEL_TAG_MS)).toBe(0);
    expect(pruefeInsel({ ...leereInsel(), wach: 123_456 }).wach).toBe(123_456);
    expect(pruefeInsel({ ...leereInsel(), wach: 'x' }).wach).toBe(0);
  });
});

import { BRUECKE4, FREIE_TEILE, aufWueste, imFreienTeil, teilFrei } from '../src/domain/insel';
describe('Bauinsel 0.14: Wüste und freie Version', () => {
  it('die Wüste ist über die vierte Brücke erreichbar, hat Kakteen und Palmen, Kakteen sind fest', () => {
    const s = leereInsel();
    expect(HOEHE).toBe(76);
    expect(LANDSCHAFT.art[idx(BRUECKE4.x, BRUECKE4.y0)]).toBe('bruecke');
    const ziel = { x: 22, y: 68, z: LANDSCHAFT.hoehe[idx(22, 68)] ?? 0 };
    expect(aufWueste(22, 68)).toBe(true);
    expect(LANDSCHAFT.art[idx(22, 68)]).toBe('wueste');
    expect(wegAufInsel(s, START, ziel).length).toBeGreaterThan(40);
    const kakteen = LANDSCHAFT.pflanze.filter((p) => p === 'kaktus').length;
    const palmen = LANDSCHAFT.pflanze.filter((p) => p === 'palme').length;
    expect(kakteen).toBeGreaterThanOrEqual(8);
    expect(palmen).toBeGreaterThanOrEqual(3);
    expect(bebaubar(8, 63)).toBe(false);
    expect(bebaubar(22, 68)).toBe(true);
    // jede Pflanze steht auf Land
    LANDSCHAFT.pflanze.forEach((p, i) => p && expect(LANDSCHAFT.art[i]).not.toBe('wasser'));
  });
  it('Spielstände aus 0.12/0.13 (44 × 58) bleiben erhalten', () => {
    const alt = Array.from({ length: BREITE * 58 }, () => [] as number[]);
    alt[50 * BREITE + 10] = [3, 3];
    const p = pruefeInsel({ stapel: alt, inventar: {}, figur: { x: 12, y: 21, z: 0 }, tiere: [], erledigt: [] });
    expect(p.stapel).toHaveLength(BREITE * HOEHE);
    expect(p.stapel[50 * BREITE + 10]).toEqual([3, 3]);
  });
  it('freie Version: erste Insel mit Steg, Grundausstattung', () => {
    expect(imFreienTeil(START.x, START.y)).toBe(true);
    expect(imFreienTeil(11, 25)).toBe(true);
    expect(imFreienTeil(BRUECKE.x0, BRUECKE.y)).toBe(false);
    expect(imFreienTeil(30, 10)).toBe(false);
    expect(imFreienTeil(22, 68)).toBe(false);
    for (const id of [101, 102, 103, 115, 110, 112, 117, 120]) expect(teilFrei(id, false)).toBe(true);
    for (const id of [116, 160, 140, 157]) expect(teilFrei(id, false)).toBe(false);
    expect(teilFrei(160, true)).toBe(true);
    for (const id of FREIE_TEILE) expect(EINRICHTUNG.some((e) => e.id === id)).toBe(true);
  });
});

import { autoRichtung, mitRichtung } from '../src/domain/insel';
describe('Bauinsel 0.14: Möbel richten sich aus', () => {
  it('Stühle schauen zum Tisch, Betten mit dem Kopfende an die Wand', () => {
    let s: InselStand = { ...leereInsel(), inventar: { '112': 1 } };
    s = ok(setzeAn(s, 10, 20, 0, 112, 99));
    expect(autoRichtung(s, 10, 21, 0, 117)).toBe(0); // Tisch bei −y
    expect(autoRichtung(s, 9, 20, 0, 117)).toBe(1); // Tisch bei +x
    expect(autoRichtung(s, 10, 19, 0, 116)).toBe(2); // Tisch bei +y
    expect(autoRichtung(s, 11, 20, 0, 136)).toBe(3); // Tisch bei −x
    expect(autoRichtung(s, 5, 5, 0, 117)).toBeUndefined();
    s = ok(setzeAn(s, 14, 20, 0, 3, 99));
    expect(autoRichtung(s, 15, 20, 0, 110)).toBe(3); // Wand bei −x
    expect(autoRichtung(s, 14, 21, 0, 112)).toBeUndefined();
    s = { ...s, inventar: { '117': 1 } };
    s = ok(setzeAn(s, 10, 21, 0, 117, 99));
    expect(richtungVon(mitRichtung(s, 10, 21, 0, 2), 10, 21, 0)).toBe(2);
    expect(mitRichtung(s, 14, 20, 0, 2)).toBe(s); // Block bleibt
  });
});

describe('Bauinsel 0.18.1: Hecken stehen einzeln', () => {
  it('Eine neue Hecke reiht sich längs an eine Hecke daneben', () => {
    let s: InselStand = { ...leereInsel(), inventar: { '123': 2 } };
    s = ok(setzeAn(s, 10, 20, 0, 123, 99));
    expect(drehbar(123)).toBe(true);
    expect(autoRichtung(s, 11, 20, 0, 123)).toBe(0);
    expect(autoRichtung(s, 10, 21, 0, 123)).toBe(1);
    expect(autoRichtung(s, 5, 5, 0, 123)).toBeUndefined();
  });
});

import { AKTIONEN } from '../src/domain/insel';
describe('Bauinsel 0.18.1: Spielgeräte und Tiere', () => {
  it('Jedes Spielgerät mit Aktion gibt es im Laden; in den Sandkasten geht man hinein', () => {
    for (const [id, a] of Object.entries(AKTIONEN)) {
      const e = EINRICHTUNG.find((x) => x.id === Number(id));
      expect(e?.kategorie).toBe('spielen');
      expect(a.ms).toBeGreaterThan(1000);
      if (a.hinein) expect(e?.begehbar).toBe('flach');
    }
    expect(Object.values(AKTIONEN).map((a) => a.typ).sort()).toEqual(['buddeln', 'rutschen', 'schaukeln', 'springen']);
  });
  it('Jedes Tier sagt etwas', () => {
    for (const t of TIERE) expect(t.laut.length).toBeGreaterThan(1);
  });
});

