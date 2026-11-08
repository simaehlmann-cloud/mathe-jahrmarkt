import { describe, expect, it } from 'vitest';
import { faktGewichtung } from '../src/domain/adaptiv/gewichtung';
import { aehnlicheAufgabe, einmaleinsAufgabe } from '../src/domain/aufgaben/einmaleins';
import type { Aufgabe } from '../src/domain/aufgaben/typen';
import { BUDEN, GASSEN, TAGESBUDEN } from '../src/domain/buden';
import { erzeugeSperrfrage, pruefeSperre, zahlInWorten } from '../src/domain/elternsperre';
import { abendmarktOffen, budenZustand, rundeVerbuchen, sommerfest } from '../src/domain/fortschritt/fortschritt';
import { stufeFreigabe } from '../src/domain/fortschritt/kaufgrenze';
import { KOMPETENZEN } from '../src/domain/kompetenzen/modell';
import { bestimmeUrsache } from '../src/domain/lernprofil/fehlerursache';
import { einschaetzen, elternSaetze, verdichten, type Ereignis } from '../src/domain/lernprofil/lernprofil';
import { bereinigeName, neuesProfil, type Profil } from '../src/domain/profil';
import { createRng } from '../src/domain/rng';
import { Rundensteuerung } from '../src/domain/runde';

const TAG = 24 * 3600 * 1000;
const profil = (): Profil => neuesProfil('p1', 'Alex', 'fuchs', 0);

describe('Kompetenzmodell und Budenregister', () => {
  it('24 Tagesbuden, 3 Abendbuden, Nummern lückenlos', () => {
    expect(TAGESBUDEN).toHaveLength(24);
    expect(BUDEN).toHaveLength(27);
    expect(BUDEN.map((b) => b.nr)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
    expect(new Set(BUDEN.map((b) => b.id)).size).toBe(27);
  });
  it('jede basale Kompetenz hat mindestens zwei Buden', () => {
    for (const k of Object.values(KOMPETENZEN).filter((x) => x.basal)) {
      const anzahl = BUDEN.filter((b) => b.kompetenzen.some((bk) => bk.kompetenz === k.id)).length;
      expect(anzahl, k.name).toBeGreaterThanOrEqual(2);
    }
  });
  it('jede Bude gehört zu einer bekannten Gasse', () => {
    const ids = new Set(GASSEN.map((g) => g.id));
    expect(BUDEN.every((b) => ids.has(b.gasse))).toBe(true);
  });
});

describe('Kaufgrenze', () => {
  it('Bronze ist immer frei', () => {
    expect(stufeFreigabe(profil(), 'dartbude', 'bronze', false).frei).toBe(true);
  });
  it('Silber braucht Paket und Bronze', () => {
    const p = profil();
    expect(stufeFreigabe(p, 'dartbude', 'silber', false)).toEqual({ frei: false, grund: 'paket' });
    expect(stufeFreigabe(p, 'dartbude', 'silber', true)).toEqual({ frei: false, grund: 'vorstufe' });
    const mitBronze = rundeVerbuchen(p, { bude: 'dartbude', stufe: 'bronze', start: 0, dauerMs: 1, punkte: 900, richtig: 9, gesamt: 10 }).profil;
    expect(stufeFreigabe(mitBronze, 'dartbude', 'silber', true).frei).toBe(true);
    expect(stufeFreigabe(mitBronze, 'dartbude', 'silber', false).frei).toBe(false);
    expect(stufeFreigabe(mitBronze, 'dartbude', 'gold', true)).toEqual({ frei: false, grund: 'vorstufe' });
  });
  it('nicht gebaute Buden und Abendmarkt sind gesperrt', () => {
    expect(stufeFreigabe(profil(), 'dosenwerfen', 'bronze', true).grund).toBe('nichtSpielbar');
  });
  it('Abendmarkt öffnet erst mit Paket und Silber überall', () => {
    let p = profil();
    expect(abendmarktOffen(p, true)).toBe(false);
    for (const b of TAGESBUDEN) {
      for (const stufe of ['bronze', 'silber'] as const) {
        p = rundeVerbuchen(p, { bude: b.id, stufe, start: 0, dauerMs: 1, punkte: 1, richtig: 10, gesamt: 10 }).profil;
      }
    }
    expect(sommerfest(p)).toBe(true);
    expect(abendmarktOffen(p, false)).toBe(false);
    expect(abendmarktOffen(p, true)).toBe(true);
  });
});

describe('Fortschritt', () => {
  it('8 von 10 schafft die Stufe, 7 nicht', () => {
    const r = { bude: 'dartbude', stufe: 'bronze' as const, start: 0, dauerMs: 1, punkte: 500 };
    expect(rundeVerbuchen(profil(), { ...r, richtig: 7, gesamt: 10 }).geschafft).toBe(false);
    const e = rundeVerbuchen(profil(), { ...r, richtig: 8, gesamt: 10 });
    expect(e.geschafft).toBe(true);
    expect(e.ersterErfolg).toBe(true);
    expect(budenZustand(e.profil, 'dartbude')).toBe('licht');
  });
  it('Taler fest, Rekord nur ab der zweiten Runde, altes Profil unverändert', () => {
    const p = profil();
    const r = { bude: 'dartbude', stufe: 'bronze' as const, start: 0, dauerMs: 1, richtig: 5, gesamt: 10 };
    const e1 = rundeVerbuchen(p, { ...r, punkte: 300 });
    expect(e1.taler).toBe(10);
    expect(e1.neuerRekord).toBe(false);
    const e2 = rundeVerbuchen(e1.profil, { ...r, punkte: 400 });
    expect(e2.neuerRekord).toBe(true);
    expect(e2.profil.fortschritt.dartbude?.bronze?.verlauf).toEqual([300, 400]);
    expect(p.taler).toBe(0);
    expect(p.fortschritt).toEqual({});
  });
});

describe('Fehlerursachen', () => {
  it('unterscheidet Mechanik, Tempo, Lesen, Verrechnen', () => {
    expect(bestimmeUrsache({ richtig: false, ms: 3000, uebung: true })).toBe('mechanik');
    expect(bestimmeUrsache({ richtig: false, ms: 300, uebung: false, fehlerArt: 'nachbaraufgabe' })).toBe('zuSchnell');
    expect(bestimmeUrsache({ richtig: false, ms: 3000, uebung: false, fehlerArt: 'operation' })).toBe('gelesen');
    expect(bestimmeUrsache({ richtig: false, ms: 3000, uebung: false, fehlerArt: 'zehner' })).toBe('verrechnet');
    expect(bestimmeUrsache({ richtig: false, ms: 3000, uebung: false, fehlerArt: 'umkehr' })).toBe('konzept');
    expect(bestimmeUrsache({ richtig: true, ms: 300, uebung: false })).toBeUndefined();
  });
});

const ereignis = (t: number, richtig: boolean, fakt = '6x7'): Ereignis => ({
  t,
  bude: 'dartbude',
  kompetenz: 'kopfrechnen',
  dimension: 'sicherheit',
  richtig,
  ms: 2000,
  fakt,
  gewertet: true,
});

describe('Lernprofil', () => {
  it('sagt erst ab 20 Aufgaben an 2 Tagen etwas', () => {
    const neunzehn = Array.from({ length: 19 }, (_, i) => ereignis(i * TAG, true));
    expect(einschaetzen(neunzehn, 'kopfrechnen').status).toBe('kennenlernen');
    const zwanzigEinTag = Array.from({ length: 20 }, (_, i) => ereignis(1000 + i, true));
    expect(einschaetzen(zwanzigEinTag, 'kopfrechnen').status).toBe('kennenlernen');
    const zwanzigZweiTage = Array.from({ length: 20 }, (_, i) => ereignis(i < 10 ? 1000 : TAG + 1000, true));
    expect(einschaetzen(zwanzigZweiTage, 'kopfrechnen').status).toBe('sicher');
  });
  it('ignoriert ungewertete Ereignisse', () => {
    const e = Array.from({ length: 40 }, (_, i) => ({ ...ereignis(i * TAG, false), gewertet: false }));
    expect(einschaetzen(e, 'kopfrechnen').anzahl).toBe(0);
  });
  it('nennt unsichere Reihen in Sätzen', () => {
    const e: Ereignis[] = [];
    for (let i = 0; i < 30; i++) e.push(ereignis(i * TAG / 3, i % 2 === 0, i % 3 === 0 ? '7x8' : '2x5'));
    const saetze = elternSaetze(e, 'kopfrechnen', 'Alex');
    expect(saetze.join(' ')).toMatch(/7 und 8/);
  });
  it('verdichtet alte Ereignisse zu Wochenwerten', () => {
    const jetzt = 100 * TAG;
    const alt = Array.from({ length: 10 }, (_, i) => ereignis(i * TAG, i % 2 === 0));
    const neu = [ereignis(99 * TAG, true)];
    const v = verdichten([...alt, ...neu], [], jetzt);
    expect(v.ereignisse).toHaveLength(1);
    const summe = v.wochen.reduce((s, w) => s + w.gesamt, 0);
    expect(summe).toBe(10);
    expect(v.wochen.reduce((s, w) => s + w.richtig, 0)).toBe(5);
  });
});

describe('Adaptivität', () => {
  it('zieht Fakten mit Fehlern häufiger', () => {
    const e = [ereignis(1, false, '7x8'), ereignis(2, false, '7x8')];
    const g = faktGewichtung(e);
    const rng = createRng(5);
    let siebenAcht = 0;
    for (let i = 0; i < 4000; i++) {
      const a = einmaleinsAufgabe('silber', rng, g);
      if (a.fakt === '7x8') siebenAcht++;
    }
    // Gleichverteilt wären es etwa 4000 · 2/(100+...) ≈ 1,5 %; mit Gewicht deutlich mehr.
    expect(siebenAcht / 4000).toBeGreaterThan(0.025);
  });
});

describe('Rundensteuerung', () => {
  const neueRunde = (seed: number, probe?: Aufgabe): Rundensteuerung => {
    let t = 0;
    return new Rundensteuerung({
      bude: 'dartbude',
      stufe: 'silber',
      rng: createRng(seed),
      erzeuge: einmaleinsAufgabe,
      aehnlich: aehnlicheAufgabe,
      gewichtung: () => 1,
      probe,
      jetzt: () => (t += 1000),
    });
  };
  const falsch = (a: Aufgabe): number => a.optionen.find((o) => o.wert !== a.antwort && o.fehlerArt === 'nachbaraufgabe')?.wert
    ?? (a.optionen.find((o) => o.wert !== a.antwort) as { wert: number }).wert;

  it('10 richtige Antworten: 10/10, Serienbonus, dann fertig', () => {
    const r = neueRunde(1);
    let a: Aufgabe | undefined = r.aktuelle;
    let n = 0;
    while (a) {
      const ant = r.antworte(a.antwort, 2000);
      expect(ant.richtig).toBe(true);
      n++;
      a = r.weiter();
    }
    expect(n).toBe(10);
    const e = r.ergebnis();
    expect(e.richtig).toBe(10);
    expect(e.gesamt).toBe(10);
    expect(e.punkte).toBe(100 * 10 + [0, 20, 40, 60, 80, 100, 100, 100, 100, 100].reduce((s, x) => s + x, 0));
    expect(r.ereignisse.every((x) => x.gewertet)).toBe(true);
  });

  it('nach einem Fehler: Hilfe, dann Nochmal-Aufgabe, die nicht zur Zehn zählt', () => {
    const r = neueRunde(2);
    const erste = r.aktuelle;
    const ant = r.antworte(falsch(erste), 3000);
    expect(ant.hilfe).toBe(true);
    const nochmal = r.weiter();
    expect(r.aktuellePhase).toBe('nochmal');
    expect(nochmal?.a === erste.a || nochmal?.b === erste.a).toBe(true);
    const n2 = r.antworte((nochmal as Aufgabe).antwort, 3000);
    expect(n2.durchgehalten).toBe(true);
    let a = r.weiter();
    let haupt = 1;
    while (a) {
      r.antworte(a.antwort, 2000);
      haupt++;
      a = r.weiter();
    }
    expect(haupt).toBe(10);
    expect(r.ergebnis().richtig).toBe(9);
    expect(r.ergebnis().gesamt).toBe(10);
  });

  it('zu schnell getippt: gleiche Aufgabe, nichts gezählt', () => {
    const r = neueRunde(3);
    const a = r.aktuelle;
    const ant = r.antworte(falsch(a), 200);
    expect(ant.ursache).toBe('zuSchnell');
    expect(ant.wiederholen).toBe(true);
    expect(r.weiter(true)).toBe(a);
    expect(r.ereignisse[0]?.gewertet).toBe(false);
  });

  it('Probewurf wird nie gewertet', () => {
    const probe: Aufgabe = { ...einmaleinsAufgabe('bronze', createRng(9)) };
    const r = neueRunde(4, probe);
    expect(r.aktuellePhase).toBe('probe');
    const ant = r.antworte(falsch(probe), 3000);
    expect(ant.wiederholen).toBe(true);
    expect(r.ereignisse).toHaveLength(0);
    r.antworte(probe.antwort, 3000);
    expect(r.weiter()).toBeDefined();
    expect(r.aktuellePhase).toBe('haupt');
    expect(r.nummer).toBe(1);
  });
});

describe('Elternsperre', () => {
  it('Zahlwörter', () => {
    expect(zahlInWorten(17)).toBe('siebzehn');
    expect(zahlInWorten(21)).toBe('einundzwanzig');
    expect(zahlInWorten(30)).toBe('dreißig');
    expect(zahlInWorten(101)).toBe('einhunderteins');
    expect(zahlInWorten(456)).toBe('vierhundertsechsundfünfzig');
  });
  it('Frage ist zweistellig mal zweistellig und wird geprüft', () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) {
      const f = erzeugeSperrfrage(rng);
      expect(f.loesung).toBeGreaterThanOrEqual(12 * 13);
      expect(pruefeSperre(f, String(f.loesung))).toBe(true);
      expect(pruefeSperre(f, ` ${f.loesung} `)).toBe(true);
      expect(pruefeSperre(f, String(f.loesung + 1))).toBe(false);
      expect(pruefeSperre(f, '')).toBe(false);
      expect(pruefeSperre(f, 'abc')).toBe(false);
    }
  });
});

describe('Profil', () => {
  it('bereinigt Namen', () => {
    expect(bereinigeName('  Ali\u0000ce   B  ')).toBe('Alice B');
    expect([...bereinigeName('x'.repeat(40))]).toHaveLength(16);
  });
});

import { wochenbericht } from '../src/domain/lernprofil/bericht';
import { dekoKaufen } from '../src/domain/deko';
import { BUDEN_DEFINITIONEN } from '../src/buden';

describe('Wochenbericht', () => {
  it('zählt Spielzeit, Buden und Fortschritt gegenüber der Vorwoche', () => {
    const jetzt = 30 * TAG;
    let p = profil();
    p = { ...p, runden: [{ bude: 'dartbude', stufe: 'bronze', start: jetzt - TAG, dauerMs: 5 * 60000, punkte: 1, richtig: 8, gesamt: 10 }] };
    const vorwoche = Array.from({ length: 12 }, (_, i) => ereignis(jetzt - 10 * TAG + i, i < 6));
    const diese = Array.from({ length: 12 }, (_, i) => ereignis(jetzt - 2 * TAG + i, i < 11));
    const b = wochenbericht({ ...p, ereignisse: [...vorwoche, ...diese] }, jetzt);
    expect(b.gesamtMinuten).toBe(5);
    expect(b.minutenProTag).toHaveLength(7);
    expect(b.buden).toEqual(['Dartbude']);
    expect(b.sicherer).toEqual(['kopfrechnen']);
    expect(b.ueben).toEqual([]);
  });
});

describe('Andenkenstand', () => {
  it('kauft nur mit genug Talern und nur einmal', () => {
    const p = { ...profil(), taler: 25 };
    expect(dekoKaufen(p, 'hut')).toEqual({ ok: false, grund: 'zuWenig' });
    const e = dekoKaufen(p, 'wimpel');
    expect(e.ok && e.profil.taler).toBe(5);
    expect(e.ok && dekoKaufen(e.profil, 'wimpel')).toEqual({ ok: false, grund: 'schonDa' });
    const hut = dekoKaufen({ ...profil(), taler: 40 }, 'hut');
    expect(hut.ok && hut.profil.aussehen.extra).toBe('strohhut');
  });
});

describe('Budenanmeldung', () => {
  it('jede spielbare Bude ist angemeldet und umgekehrt', () => {
    const spielbar = BUDEN.filter((b) => b.spielbar).map((b) => b.id).sort();
    expect(Object.keys(BUDEN_DEFINITIONEN).sort()).toEqual(spielbar);
  });
});

import { zurueckZiel } from '../src/app/navigation';

describe('Zurück-Taste', () => {
  it('führt Schritt für Schritt zurück und schließt nie direkt', () => {
    expect(zurueckZiel({ name: 'spiel', bude: 'dartbude', stufe: 'bronze' }, true)).toEqual({ name: 'bude', bude: 'dartbude' });
    expect(zurueckZiel({ name: 'bude', bude: 'dartbude' }, true)).toEqual({ name: 'gasse', gasse: 'zahlengasse' });
    expect(zurueckZiel({ name: 'gasse', gasse: 'zahlengasse' }, true)).toEqual({ name: 'jahrmarkt' });
    expect(zurueckZiel({ name: 'figur' }, true)).toEqual({ name: 'profil' });
    expect(zurueckZiel({ name: 'eltern' }, false)).toEqual({ name: 'start' });
    expect(zurueckZiel({ name: 'jahrmarkt' }, true)).toBe('jahrmarktVerlassen');
    expect(zurueckZiel({ name: 'laden' }, true)).toBe('nichts');
  });
});
