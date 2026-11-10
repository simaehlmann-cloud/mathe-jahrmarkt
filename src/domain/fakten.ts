/**
 * Mathe-Fakten für die Rückseiten der Sammelkarten. Kurz, kindgerecht und nachprüfbar.
 * Jede Budenkarte hat einen Fakt zu ihrem Thema; die übrigen Karten einen allgemeinen.
 */
export const BUDEN_FAKTEN: Readonly<Record<string, string>> = {
  dartbude: 'Das kleine Einmaleins hat 100 Aufgaben. Weil 3 · 4 dasselbe ist wie 4 · 3, musst du dir nur 55 davon merken.',
  'einmaleins-turbo': 'Im kleinen Einmaleins kommt die 12 als Ergebnis viermal vor: 2 · 6, 6 · 2, 3 · 4 und 4 · 3.',
  dosenwerfen: 'Jede Zahl, die auf 0 endet, kannst du durch 10 teilen. Endet sie auf 0 oder 5, geht es durch 5.',
  seilbahn: 'Der Zahlenstrahl geht immer weiter – es gibt keine größte Zahl. Zu jeder Zahl kannst du noch 1 dazuzählen.',
  waage: 'Das Gleichheitszeichen = hat sich ein Mathematiker aus Wales vor über 450 Jahren ausgedacht: zwei gleich lange Striche.',
  rechendomino: 'Ein normales Dominospiel hat 28 Steine – von 0|0 bis 6|6.',
  rechenwerkstatt: 'Unsere Ziffern 0 bis 9 kamen über Indien und Arabien nach Europa. Die Null war dabei eine geniale Erfindung.',
  fehlerdetektiv: 'Mit dem Überschlag findest du Fehler: 398 + 207 ist ungefähr 400 + 200 = 600.',
  tresor: 'Ein Zahlenschloss mit 3 Rädern von 0 bis 9 hat 1 000 mögliche Codes – von 000 bis 999.',
  kasse: 'Euro-Scheine werden heute zu 5, 10, 20, 50, 100 und 200 € gedruckt. Münzen gibt es acht verschiedene, von 1 Cent bis 2 €.',
  schaetzbude: 'Eine Tür ist ungefähr 2 m hoch. Mit solchen Stützpunkten kannst du andere Größen gut schätzen.',
  uhrkarussell: 'Ein Tag hat 24 Stunden, also 1 440 Minuten. Der Minutenzeiger dreht sich an einem Tag 24-mal ganz herum.',
  umrechnungsmemory: '„Kilo“ heißt tausend: 1 Kilogramm sind 1 000 Gramm, 1 Kilometer sind 1 000 Meter.',
  achterbahn: 'Der Umfang ist der Weg einmal ganz außen herum. Bei einem Rechteck: zweimal Länge plus zweimal Breite.',
  spiegelkabinett: 'Ein Schmetterling ist fast genau achsensymmetrisch. Die Spiegelachse läuft durch seinen Körper.',
  wuerfelnetz: 'Es gibt genau 11 verschiedene Würfelnetze. Gegenüberliegende Augen eines Spielwürfels ergeben immer 7.',
  labyrinth: 'Auch echte Roboter und Computer arbeiten Befehl für Befehl – so wie dein Labyrinth-Robo.',
  formensortierer: 'Ein Würfel hat 6 Flächen, 12 Kanten und 8 Ecken. Ein Kreis hat gar keine Ecke.',
  zeltdekorateur: 'Bandornamente gibt es schon seit Tausenden von Jahren, zum Beispiel auf alten Tonkrügen.',
  zahlenfolgenzug: 'In der Folge 1, 1, 2, 3, 5, 8, 13 … ist jede Zahl die Summe der beiden davor.',
  rechenmauer: 'Bei einer Mauer mit drei Grundsteinen zählt der mittlere Stein für den Deckstein doppelt.',
  riesenradtechniker: 'Das erste Riesenrad stand 1893 in Chicago. Es war über 80 Meter hoch.',
  murmellabor: '„Sicher“, „möglich“, „unmöglich“: Dass morgen die Sonne aufgeht, ist sicher. Dass ein Würfel eine 7 zeigt, ist unmöglich.',
  diagrammreporter: 'Eine Strichliste fasst immer fünf Striche zu einem Bündel zusammen. So zählt man schneller.',
  geisterbahn: 'Durch 0 darf man nicht teilen. Die Probe zur Division ist die Malaufgabe.',
  pizzabaeckerei: 'Ein halbes Stück ist genauso viel wie zwei Viertel: 1/2 = 2/4.',
  hauDenLukas: 'Das Komma trennt die Ganzen von den Zehnteln: 2,5 m sind 2 m und 5 Zehntel Meter, also 2 m 50 cm.',
  wuerfelbauer: 'Aus 8 kleinen Würfeln kannst du einen doppelt so hohen, breiten und langen Würfel bauen.',
  lageplan: 'Auf vielen Stadtplänen findet man Straßen über Planquadrate wie „B3“ – genau wie beim Schiffe-Versenken.',
  gluecksrad: 'Je größer der Anteil einer Farbe am Rad, desto öfter bleibt der Zeiger dort stehen – aber nie ganz genau gleich oft.',
};

export const ALLGEMEINE_FAKTEN: Readonly<Record<string, string>> = {
  'gasse:zahlengasse': 'Eine Million sind tausend mal tausend. Wenn du jede Sekunde eine Zahl zählst, brauchst du dafür über elf Tage ohne Pause.',
  'gasse:groessenmarkt': 'Früher maß man mit Elle, Fuß und Spanne. Weil alle Menschen verschieden groß sind, erfand man später den Meter.',
  'gasse:spiegelzelt': 'Ein Quadrat hat vier Spiegelachsen, ein Kreis sogar unendlich viele.',
  'gasse:musterbahn': 'Die geraden Zahlen 2, 4, 6, 8 … wechseln sich mit den ungeraden ab. Gerade plus gerade gibt immer gerade.',
  'gasse:forschergasse': 'Wirfst du eine Münze oft, kommt ungefähr in der Hälfte der Würfe Kopf.',
  'gold-drei': 'Gold ist so weich, dass man es zu hauchdünner Folie schlagen kann – dünner als ein Haar.',
  durchhalten: 'Fehler gehören zum Lernen. Wer eine Aufgabe nach einem Fehler noch einmal versucht, merkt sie sich besser.',
  woche: 'Eine Woche hat 7 Tage, also 168 Stunden.',
  'woche-vier': 'Vier Wochen sind 28 Tage. Nur der Februar ist manchmal genau so lang.',
  blitz: 'Eine Minute hat 60 Sekunden. 20 Aufgaben in einer Minute heißt: eine Aufgabe in 3 Sekunden.',
  'blitz-30': '30 Aufgaben in 60 Sekunden – das sind zwei Sekunden pro Aufgabe!',
  raetsel: 'Zahlenrätsel gibt es schon sehr lange. Viele alte Rätsel kann man mit Probieren lösen.',
  bau: 'Ein Quader aus 3 · 4 · 2 Würfeln besteht aus 24 Würfeln.',
  katze: 'Katzen haben vorne 5 Zehen und hinten 4. Eine Katze hat also 18 Zehen.',
  sommerfest: 'Für ein Feuerwerk werden genaue Zeiten geplant – manchmal auf eine Zehntelsekunde genau.',
};

export const faktZurKarte = (id: string): string =>
  (id.startsWith('bude:') ? BUDEN_FAKTEN[id.slice(5)] : ALLGEMEINE_FAKTEN[id]) ?? 'Mathe steckt überall – auch auf dem Jahrmarkt.';
