import type { Abschnitt } from '../app/rechtliches';

/**
 * Datenschutzerklärung der Schulversion (eigene App, Bezug über Apple School Manager).
 * Die Schule setzt die App ein und ist für die Daten auf ihren Geräten verantwortlich; der Anbieter erhält nichts.
 */
export function datenschutzSchule(
  ANBIETER: { email: string },
  adresse: readonly string[],
): Abschnitt[] {
  return [
    {
      titel: '1. Verantwortlichkeit',
      absaetze: [
        'Mathe-Jahrmarkt Schule wird von Schulen auf schuleigenen Geräten eingesetzt. Für die Verarbeitung personenbezogener Daten von Schülerinnen und Schülern mit der App ist die Schule verantwortlich im Sinne von Art. 4 Nr. 7 DSGVO. Die Daten bleiben auf den Geräten der Schule; der Anbieter der App erhält keine Daten und verarbeitet keine Daten im Auftrag der Schule. Ein Vertrag zur Auftragsverarbeitung ist deshalb nicht nötig.',
        'Anbieter der App:',
        [...adresse, `E-Mail: ${ANBIETER.email}`].join('\n'),
        'Ein Datenschutzbeauftragter ist beim Anbieter nicht bestellt, da die Voraussetzungen des Art. 37 DSGVO und des § 38 BDSG nicht vorliegen.',
      ],
    },
    {
      titel: '2. Grundsatz: keine Datenerhebung durch den Anbieter',
      absaetze: [
        'Die App arbeitet vollständig offline. Es gibt keine Benutzerkonten, keine Registrierung, keine Server des Anbieters, keine Analyse- oder Trackingdienste, keine Absturzberichte, keine Werbung und keine In-App-Käufe.',
      ],
    },
    {
      titel: '3. Welche Daten auf dem Gerät gespeichert werden',
      absaetze: ['Im lokalen Speicher des Geräts liegen ausschließlich:'],
      liste: [
        'die von der Lehrkraft eingetragenen Namen der Kinder (empfohlen: Vorname und Anfangsbuchstabe des Nachnamens), ihre Klasse, ihr Bildpasswort und das Aussehen ihrer Spielfigur (bis zu 32 Profile je Gerät)',
        'Spielergebnisse, Spielzeiten und die Art der gemachten Fehler – für die Anpassung der Aufgaben, das Lernprofil und die Auswertung im Lehrerbereich',
        'Spielfortschritt wie Taler, Bausteine, Bauten auf Bauplatz und Bauinsel, Sammelkarten, Aufträge und Rekorde',
        'die zuletzt gestellten Aufgaben je Bude und falsch gelöste Aufgaben, die nach einigen Tagen wiederkommen',
        'die Lehrer-PIN und der Wiederherstellungscode – nur als nicht umkehrbarer Hashwert, nie im Klartext',
        'der Name, den die Lehrkraft dem Gerät gibt (z. B. „iPad 7“), und eine zufällige Gerätekennung der App',
        'Ergebnisse anderer Geräte der Schule, wenn die Lehrkraft sie auf diesem Gerät eingesammelt hat',
        'Einstellungen zu Ton, Musik, Stimme, Schrift und Darstellung',
      ],
    },
    {
      titel: '4. Zugriff auf dem Gerät',
      absaetze: [
        'Kinder melden sich mit ihrem Bildpasswort aus drei Bildern an und sehen nur ihr eigenes Profil. Das Bildpasswort verhindert Verwechslungen und das Spielen unter fremdem Namen; einen Schutz gegen gezielte Angriffe bietet es nicht. Die Lehrkraft kann es anzeigen und ausdrucken.',
        'Der Lehrerbereich ist durch eine PIN mit 6 bis 8 Ziffern geschützt. Nach mehreren Fehlversuchen wird die Eingabe für eine wachsende Zeit gesperrt. Nach 5 Minuten ohne Eingabe oder einer längeren Pause schließt er sich von selbst. Eine Bestenliste innerhalb der Klasse ist nur zu sehen, wenn die Lehrkraft sie einschaltet.',
      ],
    },
    {
      titel: '5. Weitergabe zwischen Geräten und Berichte',
      absaetze: [
        'Im Lehrerbereich lassen sich eine Klassenliste (Namen, Klassen, Figuren, Bildpasswörter) und die Ergebnisse eines Geräts als Datei weitergeben, um sie auf anderen Geräten der Schule zu übernehmen. Diese Dateien sind mit der Lehrer-PIN verschlüsselt (AES-GCM, Schlüssel per PBKDF2 aus der PIN abgeleitet).',
        'Außerdem lassen sich Kärtchen mit den Bildpasswörtern, eine Klassenübersicht und Einzelberichte als PDF erstellen. Diese PDF-Dateien sind nicht verschlüsselt.',
        'Alles geschieht nur auf Veranlassung der Lehrkraft über das Teilen-Menü des Geräts (z. B. AirDrop, Drucken, Dateien). Wohin Dateien gehen und wie lange sie aufbewahrt werden, legt die Schule fest. Die App sendet nichts von sich aus.',
      ],
    },
    {
      titel: '6. Löschen',
      absaetze: [
        'Im Lehrerbereich lassen sich der Fortschritt einzelner Kinder zurücksetzen, einzelne Profile, ganze Klassen und eingesammelte Ergebnisse löschen sowie zum Schuljahreswechsel alle Daten des Geräts auf einmal. Beim Deinstallieren der App wird alles entfernt.',
      ],
    },
    {
      titel: '7. Vorlesen',
      absaetze: [
        'Aufgaben können mit der Sprachausgabe des Betriebssystems vorgelesen werden. Die App wählt dabei nur Stimmen, die auf dem Gerät installiert sind; es werden keine Texte an Online-Sprachdienste übertragen.',
      ],
    },
    {
      titel: '8. Verbindungen ins Internet und Berechtigungen',
      absaetze: [
        'Die App baut keine Netzwerkverbindungen auf. Sie lädt keine Schriftarten oder Bibliotheken von fremden Servern und bettet keine fremden Inhalte ein. Sie verwendet weder Kamera noch Mikrofon, Standort, Kontakte oder Fotos.',
      ],
    },
    {
      titel: '9. Bezug über Apple School Manager',
      absaetze: [
        'Schulen erwerben und verteilen die App über Apple School Manager und ihre Geräteverwaltung. Dabei verarbeitet Apple eigenständig Daten nach den Vereinbarungen zwischen Apple und der Schule. Darauf hat der Anbieter dieser App keinen Einfluss.',
      ],
    },
    {
      titel: '10. Diese Erklärung im Netz',
      absaetze: [
        'Diese Erklärung steht zusätzlich als Webseite bereit, die über GitHub Pages (GitHub Inc., USA) ausgeliefert wird. Beim Abruf der Webseite verarbeitet GitHub technisch notwendige Verbindungsdaten wie die IP-Adresse (Art. 6 Abs. 1 lit. f DSGVO; GitHub ist nach dem EU-US Data Privacy Framework zertifiziert). Die App selbst lädt nichts von GitHub.',
      ],
    },
    {
      titel: '11. Rechte der Betroffenen',
      absaetze: [
        'Betroffenen stehen die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch nach Art. 15 bis 21 DSGVO zu sowie ein Beschwerderecht bei einer Aufsichtsbehörde. Ansprechpartner ist die Schule, die die App einsetzt; dort liegen die Daten. Beim Anbieter sind keine Daten gespeichert.',
      ],
    },
    {
      titel: '12. Änderungen und Kontakt',
      absaetze: [
        'Diese Erklärung wird angepasst, sobald sich Funktionen der App ändern, die für den Datenschutz erheblich sind. Die jeweils gültige Fassung ist in der App abrufbar.',
        `Bei Fragen zum Datenschutz wenden Sie sich bitte an ${ANBIETER.email}.`,
      ],
    },
  ];
}
