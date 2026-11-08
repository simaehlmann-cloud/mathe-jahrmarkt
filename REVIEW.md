# Code-Review Version 0.1.0

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
| Verbesserung | „etwa 1 Minuten“ im Wochenbericht, fehlende Leerzeichen in der Hilfe, Musik-Regler ohne Musik | korrigiert bzw. entfernt |

## Offen

| Stufe | Befund | Vorschlag |
| --- | --- | --- |
| kritisch vor Veröffentlichung | Nativer Kauf fehlt; die App zeigt in der Store-Version ehrlich „noch nicht verfügbar“ | Fahrplan Schritt 6 |
| wichtig | Der Paketstatus liegt nur lokal; nach Neuinstallation hilft „Käufe wiederherstellen“ erst mit nativem Kauf | mit Schritt 6 beim Start still prüfen |
| wichtig | Sprachausgabe hängt von installierten Systemstimmen ab; ohne deutsche Stimme bleibt es still | Hinweis im Elternbereich, später eingesprochene Aufnahmen |
| Verbesserung | Gassen-Abschlussanimation und Sommerfest sind im Fortschritt angelegt, aber noch ohne Darstellung | sobald eine Gasse vollständig ist |
| Verbesserung | Sicherung läuft über Kopieren und Einfügen von Text | Teilen-Dialog über ein Capacitor-Plugin |

## Prüfstand

- 45 Unit-Tests, darunter Eigenschaftstests über je 10 000 Aufgaben pro Stufe
- Typprüfung ohne Fehler und Warnungen (`svelte-check --fail-on-warnings`)
- 45 Store-Regel-Prüfungen
- Ablauftest in Chrome im Hoch- und Querformat: Profil, Intro, Gasse, Probewurf, Fehler mit Hilfe, Nochmal-Aufgabe, Doppeltippen, Bronze geschafft, Katze, Elternsperre, Wochenbericht, Kaufknopf, Neustart mit Fortschritt, keine Konsolenfehler
