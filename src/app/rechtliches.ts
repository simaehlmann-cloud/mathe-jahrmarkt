/**
 * Impressum und Datenschutzerklärung – eine Quelle für die Seite „Über Mathe-Jahrmarkt“ in der App
 * und für die öffentlichen Seiten im Netz (scripts/rechtliches-seiten.mjs erzeugt daraus docs/).
 * Angaben zum Anbieter wie bei MatheSnack.
 */

export interface Abschnitt {
  titel: string;
  absaetze: string[];
  /** Aufzählung nach den Absätzen. */
  liste?: string[];
}

export const STAND = 'November 2026';

export const ANBIETER = {
  firma: 'Wisdompeak Apps',
  inhaber: 'Simon Mählmann',
  strasse: 'Oderstraße 13',
  ort: '28844 Weyhe',
  land: 'Deutschland',
  email: 'smaehlmann.appdev@gmail.com',
  ustId: 'DE430437820',
} as const;

const adresse = [`${ANBIETER.firma}`, `Inhaber: ${ANBIETER.inhaber}`, ANBIETER.strasse, ANBIETER.ort, ANBIETER.land];

export const IMPRESSUM: Abschnitt[] = [
  { titel: 'Angaben gemäß § 5 DDG', absaetze: [adresse.join('\n')] },
  { titel: 'Kontakt', absaetze: [`E-Mail: ${ANBIETER.email}`] },
  { titel: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV', absaetze: [`${ANBIETER.inhaber}, Anschrift wie oben.`] },
  {
    titel: 'Umsatzsteuer',
    absaetze: [
      `Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG: ${ANBIETER.ustId}`,
      'Kleinunternehmer gemäß § 19 UStG. Es wird keine Umsatzsteuer ausgewiesen und kein Vorsteuerabzug geltend gemacht.',
    ],
  },
  {
    titel: 'Verbraucherstreitbeilegung',
    absaetze: ['Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.'],
  },
  {
    titel: 'Haftung für Inhalte',
    absaetze: ['Die Inhalte dieser App wurden mit Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.'],
  },
  {
    titel: 'Urheberrecht und Lizenzen',
    absaetze: [
      'Die durch den Anbieter erstellten Inhalte, Aufgaben, Bilder, Figuren, Musikstücke und Spiele dieser App unterliegen dem deutschen Urheberrecht.',
      'Die App nutzt Open-Source-Bausteine. Ihre Lizenzhinweise stehen in der App unter „Über Mathe-Jahrmarkt → Lizenzen“.',
    ],
  },
];

export const DATENSCHUTZ: Abschnitt[] = [
  {
    titel: '1. Verantwortlicher',
    absaetze: [
      'Verantwortlich im Sinne von Art. 4 Nr. 7 DSGVO ist:',
      [...adresse, `E-Mail: ${ANBIETER.email}`].join('\n'),
      'Ein Datenschutzbeauftragter ist nicht bestellt, da die Voraussetzungen des Art. 37 DSGVO und des § 38 BDSG nicht vorliegen.',
    ],
  },
  {
    titel: '2. Grundsatz: keine Datenerhebung',
    absaetze: [
      'Mathe-Jahrmarkt verarbeitet keine personenbezogenen Daten auf Servern des Anbieters. Die App arbeitet offline. Es gibt keine Benutzerkonten, keine Registrierung, keine Analyse- oder Trackingdienste, keine Absturzberichte, keine Werbung und keine Weitergabe von Daten an Dritte.',
    ],
  },
  {
    titel: '3. Welche Daten auf dem Gerät gespeichert werden',
    absaetze: ['Damit das Spiel weitergeht, wo es aufgehört hat, liegen ausschließlich im lokalen Speicher des Geräts:'],
    liste: [
      'der selbst gewählte Spitzname und das Aussehen der Spielfigur jedes Profils (bis zu vier Profile)',
      'Spielergebnisse, Spielzeiten und die Art der gemachten Fehler – für die Anpassung der Aufgaben, das Lernprofil und den Bericht im Elternbereich',
      'Spielfortschritt wie Taler, Bausteine, Bauten auf Bauplatz und Bauinsel, Sammelkarten, Aufträge und Rekorde',
      'die zuletzt gestellten Aufgaben je Bude, damit sich Aufgaben nicht wiederholen, und falsch gelöste Aufgaben, die im Fundbüro nach einigen Tagen wiederkommen',
      'Einstellungen zu Ton, Musik, Stimme, Schrift und Darstellung',
      'ob das Zusatzpaket gekauft wurde',
    ],
  },
  {
    titel: '4. Löschen',
    absaetze: [
      'Diese Daten werden nicht übertragen. Im Elternbereich lassen sich Fortschritt und Profile löschen; beim Deinstallieren der App wird alles entfernt.',
      'Der Spitzname sollte kein vollständiger Name sein.',
    ],
  },
  {
    titel: '5. Vorlesen',
    absaetze: [
      'Aufgaben können mit der Sprachausgabe des Betriebssystems vorgelesen werden. Die App wählt dabei nur Stimmen, die auf dem Gerät installiert sind; es werden keine Texte an Online-Sprachdienste übertragen.',
    ],
  },
  {
    titel: '6. Bericht als PDF und Sicherung',
    absaetze: [
      'Im Elternbereich kann ein Bericht als PDF erstellt und über das Teilen-Menü des Geräts weitergegeben werden; außerdem lässt sich eine Sicherung als Text kopieren. Beides geschieht nur auf Ihre Veranlassung. Wohin Sie Datei oder Text schicken, entscheiden Sie selbst; die App sendet nichts von sich aus.',
    ],
  },
  {
    titel: '7. Kauf des Zusatzpakets',
    absaetze: [
      'Das Zusatzpaket wird als einmaliger In-App-Kauf über den App Store von Apple bzw. über Google Play abgewickelt. Zahlungs- und Kontodaten verarbeitet ausschließlich der jeweilige Store-Betreiber; der Anbieter erhält davon keine Kenntnis. Die App erfährt über dessen Schnittstelle (StoreKit bzw. Google Play Billing) nur, ob der Kauf besteht, und merkt sich das im lokalen Speicher. Es gelten die Datenschutzbestimmungen des jeweiligen Betreibers.',
      'Kauf und Wiederherstellung sind nur im Elternbereich möglich, der durch eine Rechenaufgabe für Erwachsene geschützt ist.',
    ],
  },
  {
    titel: '8. Verbindungen ins Internet und Berechtigungen',
    absaetze: [
      'Die App baut von sich aus keine Netzwerkverbindungen auf – mit Ausnahme der Verbindung zum App Store bzw. zu Google Play, die das Betriebssystem für Kauf und Wiederherstellung des Zusatzpakets herstellt. Sie lädt keine Schriftarten oder Bibliotheken von fremden Servern und bettet keine fremden Inhalte ein.',
      'Android-Berechtigungen: Internet (nur für den Kauf) und Abrechnung über Google Play. Kamera, Mikrofon, Standort, Kontakte und Fotos werden nicht verwendet.',
    ],
  },
  {
    titel: '9. Bezug über einen App-Vertrieb',
    absaetze: [
      'Beim Herunterladen der App über einen App-Vertrieb verarbeitet dessen Betreiber eigenständig Daten (etwa Konto, Gerät und Zeitpunkt des Downloads). Darauf hat der Anbieter dieser App keinen Einfluss. Es gelten die Datenschutzbestimmungen des jeweiligen Betreibers.',
    ],
  },
  {
    titel: '10. Diese Erklärung im Netz',
    absaetze: [
      'Diese Erklärung steht zusätzlich als Webseite bereit, die über GitHub Pages (GitHub Inc., USA) ausgeliefert wird. Beim Abruf der Webseite verarbeitet GitHub technisch notwendige Verbindungsdaten wie die IP-Adresse (Art. 6 Abs. 1 lit. f DSGVO; GitHub ist nach dem EU-US Data Privacy Framework zertifiziert). Die App selbst lädt nichts von GitHub.',
    ],
  },
  {
    titel: '11. Kinder',
    absaetze: [
      'Die App richtet sich an Kinder am Ende der Grundschule und am Anfang der weiterführenden Schule. Weil keine personenbezogenen Daten beim Anbieter verarbeitet werden, ist keine Einwilligung der Eltern in eine Datenverarbeitung nötig.',
    ],
  },
  {
    titel: '12. Ihre Rechte',
    absaetze: [
      'Ihnen stehen die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch nach Art. 15 bis 21 DSGVO zu sowie ein Beschwerderecht bei einer Aufsichtsbehörde. Da beim Anbieter keine personenbezogenen Daten gespeichert werden, laufen Auskunfts- und Löschersuchen gegenüber dem Anbieter in der Regel ins Leere. Sie können alle Daten jederzeit selbst in der App löschen.',
    ],
  },
  {
    titel: '13. Änderungen und Kontakt',
    absaetze: [
      'Diese Erklärung wird angepasst, sobald sich Funktionen der App ändern, die für den Datenschutz erheblich sind. Die jeweils gültige Fassung ist in der App abrufbar.',
      `Bei Fragen zum Datenschutz wenden Sie sich bitte an ${ANBIETER.email}.`,
    ],
  },
];
