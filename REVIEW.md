# Code-Review Version 0.7.0

Geprüft nach der Checkliste im Konzept (Mathematik, Zustand, Speicher, Kaufgrenze, Elternsperre, Datenschutz, Barrierefreiheit, Leistung, kindgerecht, Tests). Stufen: **kritisch** (Absturz, falsche Mathematik, Datenverlust, Store-Ablehnung), **wichtig** (Bedienung, Barrierefreiheit, Wartbarkeit), **Verbesserung**.

## Behoben während der Entwicklung

| Stufe | Befund | Behebung |
| --- | --- | --- |
| kritisch | Spielfläche startete im Produktions-Build nicht: PixiJS braucht `eval`, die Content-Security-Policy verbietet es | `pixi.js/unsafe-eval` eingebunden (Variante ohne eval), Fehler werden protokolliert |
| kritisch | Über die Bildschirmleser-Knöpfe ließ sich während der Wurfanimation ein zweites Mal antworten; die Aufgabe wäre doppelt gewertet worden | Eingabesperre im Spielbildschirm, Ablauftest tippt absichtlich doppelt |
| kritisch | Hilfe zerlegte Kernaufgaben wie 8 · 1 in 5 · 1 + 3 · 1 statt in Kernzahl-Schritten zu zählen | `zerlegung` dreht das Punktefeld bei Kernaufgaben, Test über alle 100 Fakten |
| wichtig | Absturz („Cannot set properties of null“), wenn sich die Größe während der Ballon-Animation änderte | Bei Größenänderung nur neu anordnen, Animationen prüfen auf zerstörte Objekte |
| wichtig | „Nochmal spielen“ startete keine neue Runde (gleicher Schlüssel) | Jede Runde bekommt eine eigene Kennung |
| wichtig | Verlassen der Bude während des Ladens ließ die Grafik-Engine weiterlaufen | Späte Szene wird sofort zerstört |
| wichtig | Katze war ein Knopf im Budenknopf (ungültiges HTML, für Bildschirmleser unerreichbar) | Eigener Knopf über der Grafik |
| wichtig | Auf schmalen Handys liefen Kopfzeile und Mathe-Profil über den Rand | Kopfzeile verkleinert sich, Statuswörter umbrechen; Ablauftest misst Überlauf |
| wichtig | Bei kleinen Ergebnissen war „Ergebnis − 10“ als „knapp daneben“ markiert (6 · 2 → 2 ergab „Fast!“) | Zehner-Distraktor erst ab Ergebnis 20, Test |
| wichtig | Ablauftest scheiterte auf GitHub (langsame Rechner ohne Grafikkarte) | längere Wartezeiten, Drosselung lokal nachstellbar mit `DROSSEL=6 npm run e2e`, Foto bei Abbruch |
| Verbesserung | „etwa 1 Minuten“ im Wochenbericht, fehlende Leerzeichen in der Hilfe, Musik-Regler ohne Musik | korrigiert; Regler wirkt seit 0.3.0 auf die neue Musik |

## Neu in 0.2.0 geprüft

| Bereich | Prüfung |
| --- | --- |
| Speicher | Schema 2 mit Migration: vorhandene Profile bekommen ein Aussehen, ein schon gekaufter Strohhut bleibt auf; Tests für Migration und ungültige Werte |
| Kaufgrenze im Baukasten | Strohhut nur nach Kauf im Andenkenstand, auch beim Einspielen einer Sicherung |
| Datenschutz | Baukasten ohne Kamera und Fotos |
| Android | fester Debug-Schlüssel, damit Test-APKs sich überschreiben lassen, ohne den Spielstand zu löschen |

## Neu in 0.3.0 geprüft (Rückmeldung aus dem Test auf dem Samsung-Handy)

| Stufe | Befund | Behebung |
| --- | --- | --- |
| kritisch | Auf dem Budenvorplatz lag „Bronze spielen“ unterhalb des sichtbaren Bereichs; das Kind kam nicht zu den Aufgaben | Spielknopf in einer festen Leiste am unteren Rand, Bild der Bude kleiner auf niedrigen Bildschirmen |
| kritisch | Android-Zurück-Taste schloss die App sofort | Zurück führt eine Ebene zurück (Spiel → Bude → Gasse → Jahrmarkt); auf dem Jahrmarkt erst nach zweitem Druck verlassen; während der Hilfe gesperrt; Tests für alle Bildschirme |
| wichtig | Stimme zu langsam und unnatürlich | Tempo 1,1 statt verlangsamt, beste deutsche Offline-Stimme wird gewählt (hochwertige vor kompakten), Tempo und Stimme einstellbar, Netzstimmen ausgeschlossen (Datenschutz) |
| wichtig | Keine Musik | eigene Komposition per Web Audio, im Hintergrund sofort stumm, beim Rechnen nur auf Wunsch |
| wichtig | Standard-Symbol von Capacitor | eigenes Symbol (Flinka unter der Markise) als adaptives Android-Symbol und iOS-Symbol ohne Transparenz, eigenes Startbild |

## Neu in 0.4.0 geprüft

| Stufe | Befund | Behebung |
| --- | --- | --- |
| wichtig | Beim Anlegen schickte die Enter-Taste der Handytastatur das Profil sofort ab; der Baukasten war unter der Tastatur verborgen | zwei Schritte: Name (Taste heißt „Weiter“), dann Figur mit Vorschau, die beim Blättern oben bleibt; Ablauftest prüft, dass Figur und „Los geht’s“ sichtbar sind |
| wichtig | App begann mit Musik und Stimme | Start still, Schalter in der Kopfzeile; ausdrückliches „Vorlesen“ spricht trotzdem |
| Architektur | Aufgaben waren fest aufs 1×1 zugeschnitten | Aufgabe als Typ-Vereinigung (Einmaleins, Stellenwert), Gewichtung über Schlüssel, freie Eingabe mit Fehlerkatalog; „zu schnell“ gilt nur fürs Antippen |
| Mathematik | Stellenwert-Distraktoren | aus Fehlvorstellungen (Null vergessen, Schreibweise wie gesprochen, Zahlendreher, nicht entbündelt), Tests prüfen Eindeutigkeit, Zahlenraum und Bündelsummen |
| Barrierefreiheit | Ziffernfeld | echte Knöpfe, auch mit Tastatur (Ziffern, Rücktaste, Enter) |

## Neu in 0.5.0 geprüft

| Stufe | Befund | Behebung |
| --- | --- | --- |
| Architektur | Karte und Wege | reine Funktionen in `domain/karte.ts` (Lage der Buden, Weg über die Allee, nächster Wegpunkt), mit Tests; die Darstellung kennt keine Geometrie-Regeln |
| wichtig | Intro erschien bei jeder Rückkehr auf den Jahrmarkt (Vergleich mit einem Svelte-Proxy statt mit dem Original) | „gesehen“ wird im Abschluss des Dialogs gesetzt, Ablauftest läuft mehrfach über die Karte |
| wichtig | doppelte Schlüssel in einer Liste brachen die Darstellung ab | eindeutige Schlüssel; der Ablauftest meldet Konsolenfehler jetzt auch beim Abbruch |
| Barrierefreiheit | Buden auf der Karte sind echte Knöpfe („Dartbude öffnen“, „…, bald geöffnet“); bei „Bewegung reduzieren“ springt die Figur ohne Laufen | |
| Leistung | Karte als skalierte Ebene mit nativem Wischen; Laufen per requestAnimationFrame, Kamera folgt weich | |

## Neu in 0.5.1 (Test auf dem Samsung S25)

| Stufe | Befund | Behebung |
| --- | --- | --- |
| kritisch | Figur gestalten: mit großer Systemschrift war „Speichern“ nicht erreichbar | feste Höhe: Vorschau oben, nur die Auswahl blättert, Knöpfe immer sichtbar; Ablauftest prüft das mit 125 % Schrift |
| wichtig | Lange Zahlwörter im Dosenwerfen liefen aus dem Schild | Umbruch an den Wortteilen (tausend, hundert, und), kleinere Schrift bei langen Aufgaben |
| wichtig | Figur schaute beim Laufen immer nach vorne | Seitenansicht beim Laufen nach links/rechts, Hinterkopf beim Laufen nach oben, im Stehen Blick zum Kind |
| Text | „Abendmarkt“ | heißt jetzt „Sternenmarkt“ (interne Kennung bleibt, keine Datenumstellung nötig) |

## Neu in 0.6.0 geprüft

| Stufe | Befund | Behebung |
| --- | --- | --- |
| Mathematik | Überschlag: eine falsche Option könnte dem genauen Ergebnis näher sein als der richtige Überschlag | Aufgaben werden nur verwendet, wenn der Überschlag eindeutig am nächsten liegt; Test über 1 200 Aufgaben |
| Mathematik | Rechendomino | Bronze immer mit Übertrag/Entbündeln, Ergebnisse ganzzahlig und positiv, Rechenweg endet beim Ergebnis (Test) |
| Bedienung | Seilbahn auf kleinen Handys | 20 Abschnitte mit Einrasten, Tippen aufs Seil als Alternative zum Ziehen, Bestätigen mit „Hier halten!“; Zahlen über dem Seil, damit die Gondel sie nicht verdeckt |
| Barrierefreiheit | Ziehen ist für Bildschirmleser nicht bedienbar | versteckte Antwortknöpfe bleiben, nur Buden mit eigener zugänglicher Eingabe (Ziffernfeld) blenden sie aus |
| Architektur | gemeinsame Auswahl-Logik und Hilfe-Rahmen für alle Buden; neue Fehlerarten (Skala, Runden, Übertrag) fließen ins Lernprofil | |

## Neu in 0.6.1

| Stufe | Befund | Behebung |
| --- | --- | --- |
| Fachdidaktik | Eine Waage steht für Gleichheit; beim Runden war sie nur ungefähr im Gleichgewicht, das Bild war irreführend | Gleichgewichts-Waage: nur genaue Gleichheit (Ergänzen, Vergleichen, Platzhalter). Test: jede richtige Zahl macht beide Seiten gleich, jede falsche nicht. Der Überschlag (`ueberschlag.ts`, getestet) kommt in den Fehlerdetektiv als „Kann das stimmen?“ |
| Daten | Kennung der Bude geändert | Migration 2 → 3 zieht Fortschritt, Runden und Lernprotokoll von „ueberschlagswaage“ nach „waage“ um (Test) |
| Eltern | Fortschritt ließ sich nur durch Löschen des Profils entfernen | „Fortschritt zurücksetzen“ je Profil mit Rückfrage; Name und Figur bleiben (Test) |
| Barrierefreiheit | Vergleichs-Antworten sind Codes (1, 2, 3) | Bildschirmleser hören <, = oder > |

## Neu in 0.7.0 geprüft

| Stufe | Befund | Behebung |
| --- | --- | --- |
| Architektur | Rechenblatt, Lupe und Tresor brauchen echte Bedienelemente | Buden können statt einer PixiJS-Bühne eine Svelte-Komponente nutzen (`svelteSzene`); besser für Bildschirmleser und schwache Geräte |
| Mathematik | Tresor-Hinweise | Hinweise werden so gewählt, dass genau eine Zahl übrig bleibt; Test prüft jede Zahl im Bereich gegen alle Hinweise |
| Mathematik | Fehlerdetektiv | genau eine falsche Ergebnisziffer oder alles richtig (ca. 25 %); Test |
| Mathematik | Subtraktion | Rechenweg in allen fünf Verfahren ergibt das richtige Ergebnis (Test) |
| Didaktik | Rechen-Werkstatt verrät die Länge des Ergebnisses nicht (immer ein Kästchen mehr); Überträge sind Notiz, nicht Bewertung | |
| Schichten | `schriftlich.ts` kennt den Typ des Subtraktionsverfahrens aus dem Datenbestand (nur Typ, keine Abhängigkeit zur Laufzeit) | später in die Domäne verschieben |

## Offen

| Stufe | Befund | Vorschlag |
| --- | --- | --- |
| kritisch vor Veröffentlichung | Nativer Kauf fehlt; die App zeigt in der Store-Version ehrlich „noch nicht verfügbar“ | Fahrplan Schritt 6 |
| wichtig | Der Paketstatus liegt nur lokal; nach Neuinstallation hilft „Käufe wiederherstellen“ erst mit nativem Kauf | mit Schritt 6 beim Start still prüfen |
| wichtig | Sprachausgabe hängt von installierten Systemstimmen ab; ohne deutsche Offline-Stimme bleibt es still | Hinweis im Elternbereich ist da; später eingesprochene Aufnahmen |
| Verbesserung | Gassen-Abschlussanimation und Sommerfest sind im Fortschritt angelegt, aber noch ohne Darstellung | sobald eine Gasse vollständig ist |
| Verbesserung | Sicherung läuft über Kopieren und Einfügen von Text | Teilen-Dialog über ein Capacitor-Plugin |

## Prüfstand

- 48 Unit-Tests, darunter Eigenschaftstests über je 10 000 Aufgaben pro Stufe
- Typprüfung ohne Fehler und Warnungen (`svelte-check --fail-on-warnings`)
- 45 Store-Regel-Prüfungen
- Ablauftest in Chrome im Hoch- und Querformat: Profil, Intro, Gasse, Probewurf, Fehler mit Hilfe, Nochmal-Aufgabe, Doppeltippen, Bronze geschafft, Katze, Elternsperre, Wochenbericht, Kaufknopf, Figuren-Baukasten, Neustart mit Fortschritt und Figur, keine Konsolenfehler
