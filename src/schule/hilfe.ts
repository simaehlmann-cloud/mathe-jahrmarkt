/**
 * Texte für Lehrkräfte (Schulversion): Kurzanleitung und Elternbrief – als Bausteine für Bildschirm und PDF.
 */
import type { Baustein } from '../domain/elternbericht';
import { INSEL_MINUTEN } from './domain/schuldaten';

export function kurzanleitung(): Baustein[] {
  return [
    { art: 'titel', text: 'Mathe-Jahrmarkt Schule', unter: 'Kurzanleitung für Lehrkräfte' },
    { art: 'h', text: '1. Einrichten (einmal je iPad)' },
    {
      art: 'liste',
      punkte: [
        'Auf dem Startbildschirm „Lehrerbereich einrichten“ antippen, einen Namen für das iPad vergeben (z. B. „iPad 7“) und eine Lehrer-PIN mit 6 bis 8 Ziffern festlegen.',
        'Am besten auf allen iPads der Klasse dieselbe PIN nehmen – dann öffnen sich weitergegebene Dateien ohne Nachfrage.',
        'Den Wiederherstellungscode notieren. Mit ihm lässt sich eine vergessene PIN ersetzen.',
      ],
    },
    { art: 'h', text: '2. Klasse anlegen' },
    {
      art: 'liste',
      punkte: [
        'Unter „Klassen“ eine Klasse anlegen und die Namen einfügen – eine Zeile pro Kind. Vorname und Anfangsbuchstabe genügen (z. B. „Mia S.“).',
        'Jedes Kind bekommt ein Bildpasswort aus drei Bildern. „Kärtchen drucken“ erzeugt ein PDF mit 8 Kärtchen je Seite zum Ausschneiden.',
        'Für jüngere Kinder oder Förderschulen lässt sich je Klasse „Anmelden ohne Passwort“ einschalten.',
        'Bis zu 32 Kinder haben auf einem iPad Platz.',
      ],
    },
    { art: 'h', text: '3. Auf alle iPads verteilen' },
    {
      art: 'liste',
      punkte: [
        '„Daten austauschen → Klassenliste weitergeben“ und die Datei per AirDrop an die anderen iPads schicken (oder über die Schulcloud bzw. einen Stick).',
        'Auf dem anderen iPad öffnet sich die App, fragt nach der Lehrer-PIN und übernimmt die Liste. Alternativ: „Datei wählen“.',
        'Die Klassenliste enthält Namen, Bildpasswörter, Figuren, Aufträge und die Einstellungen – keinen Fortschritt. Was auf einem iPad schon gespielt wurde, bleibt erhalten.',
      ],
    },
    { art: 'h', text: '4. Spielen' },
    {
      art: 'liste',
      punkte: [
        'Das Kind tippt seine Eintrittskarte an und gibt seine drei Bilder ein. Beim ersten Mal gestaltet es seine Figur.',
        'Am Ende tippt es oben auf seine Figur und meldet sich ab. Nach 5 Minuten im Hintergrund und nach jedem Neustart meldet die App es selbst ab.',
        `Bauinsel und Bauplatz sind in der Grundeinstellung nach jeder gespielten Runde ${INSEL_MINUTEN} Minuten offen. Unter „Einstellungen“ lassen sie sich ganz öffnen oder schließen.`,
        'Am besten bekommt jedes Kind ein festes iPad (Nummer auf dem Kärtchen notieren).',
      ],
    },
    { art: 'h', text: '5. Auswerten und fördern' },
    {
      art: 'liste',
      punkte: [
        'Auf jedem iPad „Ergebnisse weitergeben“ und auf dem Lehrer-iPad die Dateien übernehmen (auch mehrere auf einmal).',
        '„Auswertung“ zeigt die Klassenübersicht mit Ampel je Kompetenzbereich, häufigen Fehlermustern und dem Stand je Bude, dazu Einzelberichte – auch als PDF.',
        'Unter „Gezielt üben lassen“ wird aus der Auswertung mit einem Tipp ein Auftrag für genau die Kinder, die es brauchen. Die Kinder sehen ein blaues Fähnchen an der Bude.',
        'Vorher-nachher: Lassen Sie den Jahrmarkt-Check zu Beginn und nach einigen Wochen erneut machen (als Auftrag). Die Auswertung zeigt dann die Entwicklung je Bereich.',
      ],
    },
    { art: 'h', text: '6. Neues Schuljahr' },
    { art: 'p', text: '„Einstellungen → Neues Schuljahr“ löscht Klassen, Kinder und eingesammelte Ergebnisse auf diesem iPad. PIN und Einstellungen bleiben.' },
    { art: 'h', text: 'Datenschutz in Kürze' },
    {
      art: 'p',
      text: 'Keine Konten, keine Server, keine Werbung, kein Tracking. Alle Daten bleiben auf den iPads der Schule; Dateien zwischen den iPads sind mit der Lehrer-PIN verschlüsselt. Die ausgedruckten Kärtchen und PDF-Berichte bitte wie andere Schülerunterlagen behandeln.',
    },
  ];
}

export interface Elternbriefangaben {
  schule: string;
  klasse: string;
  lehrkraft: string;
  datum: string;
}

export function elternbrief(a: Elternbriefangaben): Baustein[] {
  const klasse = a.klasse.trim() ? `der Klasse ${a.klasse.trim()}` : 'unserer Klasse';
  return [
    { art: 'titel', text: 'Mathe üben mit dem „Mathe-Jahrmarkt“', unter: [a.schule.trim(), a.datum.trim()].filter(Boolean).join(' · ') },
    { art: 'p', text: 'Liebe Eltern,' },
    {
      art: 'p',
      text: `die Kinder ${klasse} üben im Mathematikunterricht künftig auch mit der App „Mathe-Jahrmarkt“ auf den iPads der Schule. Auf einem Jahrmarkt mit vielen Buden trainieren sie die Inhalte des Mathematikunterrichts am Ende der Grundschule und am Anfang der weiterführenden Schule: Zahlen und Stellenwerte, Kopfrechnen und schriftliches Rechnen, Größen, Geometrie, Muster sowie Daten und Zufall.`,
    },
    { art: 'h', text: 'Wie die App arbeitet' },
    {
      art: 'liste',
      punkte: [
        'Die Aufgaben passen sich dem Kind an. Nach Fehlern hilft die App in kleinen Schritten und stellt später ähnliche Aufgaben noch einmal.',
        'Jedes Kind meldet sich mit einem Bildpasswort aus drei Bildern an. Es sieht nur seinen eigenen Fortschritt.',
        'Die Lehrkraft sieht, in welchen Bereichen ein Kind schon sicher ist und wo Üben lohnt, und kann gezielt Aufgaben geben.',
        'Es gibt keine Werbung, keine Käufe in der App und eine Pausen-Erinnerung.',
      ],
    },
    { art: 'h', text: 'Datenschutz' },
    {
      art: 'liste',
      punkte: [
        'Die App braucht kein Konto und keine E-Mail-Adresse. Gespeichert werden nur der Vorname mit Anfangsbuchstaben des Nachnamens, die Klasse und die Ergebnisse aus dem Spiel.',
        'Alle Daten bleiben auf den iPads der Schule. Die App sendet nichts an den Anbieter oder an andere Server; sie hat keine Werbe- oder Analysedienste.',
        'Zwischen den iPads der Schule werden Daten nur verschlüsselt und nur durch die Lehrkraft weitergegeben.',
        'Zum Ende des Schuljahres werden die Daten auf den iPads gelöscht.',
      ],
    },
    { art: 'p', text: 'Bei Fragen sprechen Sie mich gern an.' },
    { art: 'p', text: `Mit freundlichen Grüßen\n${a.lehrkraft.trim() || '______________________'}` },
  ];
}
