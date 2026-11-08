# Mathe-Jahrmarkt – Fit für Klasse 5

Kostenlose App für iOS und Android, die Kinder in Klasse 4 spielerisch auf die Mathematik der weiterführenden Schule vorbereitet. Grundlage ist das Kerncurriculum Mathematik Grundschule Niedersachsen (in Kraft seit August 2025). Ein einmaliges Zusatzpaket (3,99 €) schaltet Silber- und Gold-Stufen, den Jahrmarkt-Check, das ausführliche Lernprofil und den Abendmarkt frei.

Konzept und Architektur: Dokument „Fit für Klasse 5 – Konzept und Architektur“ im claude.ai-Projekt.

## Stand dieser Version (0.1.0)

Fahrplan-Schritte 1 und 2 sind umgesetzt: das Grundgerüst und die Dartbude als Musterbude.

| Bereich | Stand |
| --- | --- |
| Jahrmarkt-Welt | Riesenrad als Fortschritt, fünf Gassen, Zahlengasse begehbar, die anderen „wird aufgebaut“ |
| Geschichte | Flinka mit Intro, Gassen-Begrüßung, Lob bei jeder neuen Stufe |
| Dartbude | Bronze, Silber, Gold, Probewurf, Hilfe nach Fehlern, Nochmal-Aufgabe, Rekord, Familien-Bestenliste, Verlaufskurve |
| Lebendige Welt | Buden grau → Licht → Farbe → Fest, Bruno winkt, Katze als Entdeckung, Deko aus dem Andenkenstand sichtbar |
| Lernprofil | Protokoll jeder Antwort, Fehlerursachen, Einschätzung ab 20 Aufgaben an 2 Tagen, Elternsätze, Verdichtung alter Daten |
| Elternbereich | Elternsperre, Wochenbericht, Lernprofil mit Tipps, Zusatzpaket, Einstellungen, Profile, Sicherung als Text |
| Barrierefreiheit | Vorlesen, Schriftgröße, Bewegung reduzieren, Antwortknöpfe für Bildschirmleser, Farben nie allein |
| Noch nicht | übrige 23 Buden, Jahrmarkt-Check, Abendmarkt, nativer Kauf, Musik, App-Symbol und Startbild |

## Schnellstart

```bash
npm install
npm run dev          # Entwicklung im Browser, mit gekennzeichnetem Testkauf
npm run verify       # Typprüfung, Unit-Tests, Build, Store-Regeln
npm run e2e          # Ablauftest in Chrome (vorher npm run build), Fotos in e2e-bilder/
```

Node 22 oder neuer. Für `npm run e2e` muss Chrome installiert sein (`CHROME_PFAD` setzen, falls nicht unter `/usr/bin/google-chrome`).

## Auf dem Gerät

```bash
npm run cap:sync     # baut die Web-App und kopiert sie in ios/ und android/
npx cap open ios     # Xcode
npx cap open android # Android Studio
```

Die nativen Projekte liegen im Repository (`ios/`, `android/`) und lassen sich direkt bearbeiten. iOS nutzt Swift Package Manager.

## Aufbau

```
src/
  app/          Svelte-Oberfläche: Bildschirme, Bausteine, SVG-Grafiken, Zustand, Stil
  buden/        eine Mappe pro Bude: Szene (PixiJS), Hilfe nach Fehlern, Anmeldung
  engine/       Bühne für PixiJS: Größe, Animationen, „Bewegung reduzieren“
  domain/       reine Logik ohne Grafik: Budenregister, Kompetenzmodell, Aufgaben,
                Adaptivität, Lernprofil, Fortschritt, Kaufgrenze, Runde, Elternsperre
  services/     Speicher mit Migration, Sicherung, Kauf, Vorlesen, Klang, Haptik
tests/          Unit-Tests der Domäne und der Services
scripts/        Store-Regel-Prüfung, Ablauftest im Browser
```

Grundregeln:

- Die Domäne kennt keine Grafik und ist vollständig ohne Browser testbar.
- Jeder Generator bekommt einen Zufallsgenerator mit Seed.
- Eine Bude meldet sich im Budenregister (`src/domain/buden.ts`, `spielbar: true`) und in `src/buden/index.ts` an. Ein Test prüft, dass beides übereinstimmt.
- Der Speicher ist versioniert (`SCHEMA` in `src/services/datenbestand.ts`). Jede Formatänderung bekommt eine Migration in `MIGRATIONEN`. Unlesbare Daten werden beiseitegelegt, nie gelöscht.
- Ob eine Stufe spielbar ist, entscheidet allein `stufeFreigabe` in `src/domain/fortschritt/kaufgrenze.ts`.
- Die Welt folgt allein dem gespeicherten Fortschritt (`budenZustand`).

## Eine neue Bude bauen

1. Generator in `src/domain/aufgaben/` mit Distraktoren aus Fehlermustern (`FehlerArt`), dazu Eigenschaftstests über 10 000 Aufgaben je Stufe.
2. Szene in `src/buden/<bude>/szene.ts` gegen die Schnittstelle `BudeSzene`.
3. Hilfe nach Fehlern als Svelte-Komponente mit `HilfeProps` (zeigen, hervorheben, vergleichen, nochmal).
4. Anmelden in `src/buden/index.ts`, `spielbar: true` im Budenregister.
5. `npm run verify` und `npm run e2e`.

## Store-Regeln für Kinder-Apps

`npm run store-check` prüft den Build automatisch:

- keine Analyse-, Werbe- oder Tracking-Pakete
- keine Adressen im Bundle außer Dokumentationstexten, Content-Security-Policy ohne externe Verbindungen und ohne `unsafe-eval`
- kein Testkauf im Produktions-Build
- keine Links nach außen, Kauf nur im Elternbereich hinter der nicht abschaltbaren Elternsperre

## Vor dem ersten TestFlight-Upload

- [ ] App-Kennung `de.maehlmann.mathejahrmarkt` in `capacitor.config.ts` mit App Store Connect und Play Console abgleichen (lässt sich später nicht ändern)
- [ ] Nativen Kauf anbinden (StoreKit 2, Google Play Billing) in `src/services/kauf.ts`, Produkt `…zusatzpaket` anlegen
- [ ] App-Symbol und Startbild
- [ ] Datenschutzhinweise der Kinder-Kategorie prüfen; die App sendet keine Daten
- [ ] Apple-Datenschutzmanifest: Nutzung von UserDefaults (Grund CA92.1) über Capacitor Preferences prüfen
- [ ] Android: Die Berechtigung INTERNET aus der Capacitor-Vorlage ist für die App nicht nötig und kann nach einem Gerätetest entfernt werden
- [ ] Store-Texte und Screenshots

Die Review-Befunde stehen in [REVIEW.md](REVIEW.md).
