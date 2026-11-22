/**
 * Klassen und Schülerprofile verwalten (Schulversion). Reine Funktionen auf dem Datenbestand:
 * Sie geben einen neuen Bestand zurück und ändern nichts an der Eingabe.
 */
import type { Datenbestand } from '../../services/datenbestand';
import { FIGUREN, MAX_NAME, bereinigeName, fortschrittZurueckgesetzt, neuesProfil, profilGrenze, type Profil } from '../../domain/profil';
import type { Rng } from '../../domain/rng';
import { erzeugePasswort } from './bildpasswort';
import { MAX_KLASSEN, MAX_KLASSENNAME, bereinigeText, type Klasse, type SchulDaten } from './schuldaten';

export class VerwaltungsFehler extends Error {}

function schule(b: Datenbestand): SchulDaten {
  if (!b.schule) throw new VerwaltungsFehler('Nur in der Schulversion möglich.');
  return b.schule;
}

const mitSchule = (b: Datenbestand, s: SchulDaten): Datenbestand => ({ ...b, schule: s });

/** Namen vergleichen ohne Groß-/Kleinschreibung und Leerraum („Mia S.“ = „mia s.“). */
const gleich = (a: string, b: string): boolean => a.toLocaleLowerCase('de').replace(/\s/g, '') === b.toLocaleLowerCase('de').replace(/\s/g, '');

export function klasseAnlegen(b: Datenbestand, id: string, name: string): Datenbestand {
  const s = schule(b);
  const n = bereinigeText(name, MAX_KLASSENNAME);
  if (!n) throw new VerwaltungsFehler('Bitte einen Namen für die Klasse eingeben.');
  if (s.klassen.length >= MAX_KLASSEN) throw new VerwaltungsFehler(`Auf einem Gerät haben höchstens ${MAX_KLASSEN} Klassen Platz.`);
  if (s.klassen.some((k) => gleich(k.name, n))) throw new VerwaltungsFehler(`Die Klasse „${n}“ gibt es schon.`);
  return mitSchule(b, { ...s, klassen: [...s.klassen, { id, name: n }] });
}

export function klasseUmbenennen(b: Datenbestand, id: string, name: string): Datenbestand {
  const s = schule(b);
  const n = bereinigeText(name, MAX_KLASSENNAME);
  if (!n) throw new VerwaltungsFehler('Bitte einen Namen für die Klasse eingeben.');
  if (s.klassen.some((k) => k.id !== id && gleich(k.name, n))) throw new VerwaltungsFehler(`Die Klasse „${n}“ gibt es schon.`);
  return mitSchule(b, { ...s, klassen: s.klassen.map((k) => (k.id === id ? { ...k, name: n } : k)) });
}

/** Anmelden ohne Bildpasswort für eine Klasse ein- oder ausschalten. */
export function klasseOhnePasswort(b: Datenbestand, id: string, ohne: boolean): Datenbestand {
  const s = schule(b);
  return mitSchule(b, { ...s, klassen: s.klassen.map((k) => (k.id !== id ? k : ohne ? { ...k, ohnePasswort: true } : { id: k.id, name: k.name })) });
}

/** Klasse löschen. Mit `profileAuch` verschwinden auch ihre Kinder samt Fortschritt, sonst stehen sie danach ohne Klasse da. */
export function klasseLoeschen(b: Datenbestand, id: string, profileAuch: boolean): Datenbestand {
  const s = schule(b);
  const profile = profileAuch
    ? b.profile.filter((p) => p.klasse !== id)
    : b.profile.map((p) => {
        if (p.klasse !== id) return p;
        const { klasse: _weg, ...rest } = p;
        return rest;
      });
  const aktiv = profile.some((p) => p.id === b.aktiv) ? b.aktiv : undefined;
  return { ...mitSchule(b, { ...s, klassen: s.klassen.filter((k) => k.id !== id), auftraege: s.auftraege.filter((a) => a.klasse !== id) }), profile, aktiv };
}

export interface Namensliste {
  namen: string[];
  /** Leere Zeilen, doppelte Namen und zu lange Namen (gekürzt). */
  doppelt: string[];
  gekuerzt: string[];
}

/**
 * Namensliste aus einem eingefügten Text: eine Zeile pro Kind (auch Kommas oder Semikolons trennen,
 * damit eine Zeile aus einer Tabelle passt). Doppelte fallen weg, zu lange werden gekürzt.
 */
export function namenAusText(textInhalt: string, vorhanden: readonly string[] = []): Namensliste {
  const roh = textInhalt.split(/[\n\r;,\t]+/).map((z) => z.trim()).filter((z) => z.length > 0);
  const namen: string[] = [];
  const doppelt: string[] = [];
  const gekuerzt: string[] = [];
  for (const z of roh) {
    const n = bereinigeName(z);
    if (!n) continue;
    if ([...z.replace(/\s+/g, ' ')].length > MAX_NAME) gekuerzt.push(n);
    if ([...vorhanden, ...namen].some((v) => gleich(v, n))) doppelt.push(n);
    else namen.push(n);
  }
  return { namen, doppelt, gekuerzt };
}

export interface Anlegeergebnis {
  bestand: Datenbestand;
  angelegt: Profil[];
  /** Kein Platz mehr auf dem Gerät. */
  uebersprungen: string[];
}

/**
 * Kinder einer Klasse anlegen: Jedes bekommt ein Bildpasswort und eine zufällige Figur,
 * die es beim ersten Anmelden selbst gestaltet.
 */
export function schuelerAnlegen(b: Datenbestand, klasse: string, namen: readonly string[], neueId: () => string, rng: Rng, jetzt: number): Anlegeergebnis {
  const s = schule(b);
  if (!s.klassen.some((k) => k.id === klasse)) throw new VerwaltungsFehler('Diese Klasse gibt es nicht mehr.');
  const platz = Math.max(0, profilGrenze(true) - b.profile.length);
  const angelegt: Profil[] = [];
  for (const name of namen.slice(0, platz)) {
    const n = bereinigeName(name);
    if (!n) continue;
    const p: Profil = { ...neuesProfil(neueId(), n, rng.pick(FIGUREN).id, jetzt), klasse, passwort: erzeugePasswort(rng), figurGewaehlt: false };
    angelegt.push(p);
  }
  return { bestand: { ...b, profile: [...b.profile, ...angelegt] }, angelegt, uebersprungen: namen.slice(platz).map(bereinigeName).filter(Boolean) };
}

export function profilAendern(b: Datenbestand, id: string, teil: { name?: string; klasse?: string | null }): Datenbestand {
  const s = schule(b);
  return {
    ...b,
    profile: b.profile.map((p) => {
      if (p.id !== id) return p;
      let q: Profil = { ...p };
      if (teil.name !== undefined) {
        const n = bereinigeName(teil.name);
        if (!n) throw new VerwaltungsFehler('Bitte einen Namen eingeben.');
        q = { ...q, name: n };
      }
      if (teil.klasse === null) {
        const { klasse: _weg, ...rest } = q;
        q = rest;
      } else if (teil.klasse !== undefined) {
        if (!s.klassen.some((k) => k.id === teil.klasse)) throw new VerwaltungsFehler('Diese Klasse gibt es nicht mehr.');
        q = { ...q, klasse: teil.klasse };
      }
      return q;
    }),
  };
}

/** Neue Bildpasswörter für die genannten Profile (z. B. eines oder eine ganze Klasse). */
export function passwoerterNeu(b: Datenbestand, ids: readonly string[], rng: Rng): Datenbestand {
  schule(b);
  const welche = new Set(ids);
  return { ...b, profile: b.profile.map((p) => (welche.has(p.id) ? { ...p, passwort: erzeugePasswort(rng) } : p)) };
}

export function profileZuruecksetzen(b: Datenbestand, ids: readonly string[]): Datenbestand {
  const welche = new Set(ids);
  return { ...b, profile: b.profile.map((p) => (welche.has(p.id) ? fortschrittZurueckgesetzt(p) : p)) };
}

export function profileLoeschen(b: Datenbestand, ids: readonly string[]): Datenbestand {
  const welche = new Set(ids);
  const profile = b.profile.filter((p) => !welche.has(p.id));
  return { ...b, profile, aktiv: profile.some((p) => p.id === b.aktiv) ? b.aktiv : undefined };
}

/**
 * Schuljahreswechsel: alle Profile, Klassen und eingesammelten Ergebnisse löschen.
 * Lehrer-PIN, Wiederherstellungscode, Gerätename und Einstellungen bleiben.
 */
export function geraetLeeren(b: Datenbestand): Datenbestand {
  const s = schule(b);
  return { ...b, profile: [], aktiv: undefined, schule: { ...s, klassen: [], gesammelt: [], auftraege: [] } };
}

/** Klassen in fester Reihenfolge, dahinter „Ohne Klasse“, falls es Kinder ohne Klasse gibt. */
export const OHNE_KLASSE = '';
export function klassenMitKindern(b: Datenbestand): { klasse: Klasse | null; profile: Profil[] }[] {
  const s = b.schule;
  const klassen = s?.klassen ?? [];
  const ids = new Set(klassen.map((k) => k.id));
  const sortiert = (liste: Profil[]) => [...liste].sort((x, y) => x.name.localeCompare(y.name, 'de'));
  const aus: { klasse: Klasse | null; profile: Profil[] }[] = klassen.map((k) => ({ klasse: k, profile: sortiert(b.profile.filter((p) => p.klasse === k.id)) }));
  const ohne = b.profile.filter((p) => p.klasse === undefined || !ids.has(p.klasse));
  if (ohne.length) aus.push({ klasse: null, profile: sortiert(ohne) });
  return aus;
}
