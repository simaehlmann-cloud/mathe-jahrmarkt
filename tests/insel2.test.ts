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
  it('alle Grundstücke liegen ganz auf bebaubarem Land der zweiten Insel und sind erreichbar', () => {
    for (const g of GRUNDSTUECKE) {
      for (let y = g.y0; y < g.y0 + g.n; y++) for (let x = g.x0; x < g.x0 + g.n; x++) expect(bebaubar(x, y), `${g.id} ${x},${y}`).toBe(true);
      expect(g.x0).toBeGreaterThan(BRUECKE.x1);
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
    for (const e of EINRICHTUNG) expect(['bauen', 'wohnen', 'garten']).toContain(e.kategorie);
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
    expect(offenerInselAuftrag(s)).toBeUndefined();
    expect(s.erledigt).toEqual(INSEL_AUFTRAEGE.map((x) => x.id));
  });
});
