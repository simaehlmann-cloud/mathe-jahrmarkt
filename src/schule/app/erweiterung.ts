/**
 * Umsetzung der Nahtstelle (src/app/schulschnittstelle.ts) für die Schulversion.
 * Wird nur in der Schulversion geladen (src/schule/app/start.ts).
 */
import type { SchulErweiterung } from '../../app/schulschnittstelle';
import { ANBIETER, adresse } from '../../app/rechtliches';
import { auftraegeFuer } from '../domain/auftraege';
import { mitCheckVerlauf } from '../domain/checkverlauf';
import { inselZugang } from '../domain/insel';
import { datenschutzSchule } from '../rechtliches';

export const schulErweiterung: SchulErweiterung = {
  inselZugang: (b, p, jetzt) => inselZugang(b.schule?.bauinsel ?? 'frei', p, jetzt),
  auftraegeFuer,
  nachCheck: mitCheckVerlauf,
  datenschutz: datenschutzSchule(ANBIETER, adresse),
};
