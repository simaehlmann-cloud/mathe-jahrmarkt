/**
 * Zeichnet den Eltern-Bericht als PDF (A4) und gibt ihn weiter: in der App über das Teilen-Menü
 * (Mail, Drucken, Dateien …), im Browser als Download. jsPDF wird erst beim Erstellen geladen.
 */
import { Capacitor } from '@capacitor/core';
import type { Ampel, Baustein } from '../domain/elternbericht';

const TINTE: [number, number, number] = [31, 42, 107];
const WEICH: [number, number, number] = [90, 98, 140];
const ROT: [number, number, number] = [226, 58, 78];
const GRUEN: [number, number, number] = [63, 174, 106];
const BLAU: [number, number, number] = [60, 120, 216];
const SPUR: [number, number, number] = [232, 235, 244];

const RAND = 18;
/** Hintergrund der Ampel-Zellen in Tabellen (hell, damit die Schrift lesbar bleibt). */
const AMPEL: Readonly<Record<Ampel, [number, number, number]>> = {
  gruen: [205, 238, 214],
  gelb: [255, 236, 179],
  rot: [250, 205, 210],
  grau: [238, 240, 245],
};

/** Erzeugt das PDF und liefert es als Bytes. `quer`: A4 quer (breite Tabellen wie die Klassenübersicht). */
export async function berichtPdf(bausteine: readonly Baustein[], optionen: { quer?: boolean; titel?: string } = {}): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const quer = optionen.quer === true;
  const SEITE_B = quer ? 297 : 210;
  const SEITE_H = quer ? 210 : 297;
  const BREITE = SEITE_B - 2 * RAND;
  const UNTEN = SEITE_H - 18;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: quer ? 'landscape' : 'portrait' });
  doc.setProperties({ title: optionen.titel ?? 'Mathe-Jahrmarkt – Bericht', creator: 'Mathe-Jahrmarkt' });
  let y = RAND;
  const platz = (h: number): void => {
    if (y + h > UNTEN) {
      doc.addPage();
      y = RAND;
    }
  };
  const text = (t: string, groesse: number, stil: 'normal' | 'bold', farbe: [number, number, number], einzug = 0, abstand = 1.5): void => {
    doc.setFont('helvetica', stil);
    doc.setFontSize(groesse);
    doc.setTextColor(...farbe);
    const zeilen = doc.splitTextToSize(t, BREITE - einzug) as string[];
    const zh = groesse * 0.42;
    for (const z of zeilen) {
      platz(zh);
      doc.text(z, RAND + einzug, y + zh * 0.8);
      y += zh;
    }
    y += abstand;
  };

  for (const b of bausteine) {
    switch (b.art) {
      case 'titel':
        doc.setFillColor(...ROT);
        doc.rect(0, 0, SEITE_B, 6, 'F');
        y = RAND + 2;
        text(b.text, 20, 'bold', TINTE, 0, 1);
        text(b.unter, 11, 'normal', WEICH, 0, 4);
        break;
      case 'h':
        platz(16);
        y += 3;
        text(b.text, 15, 'bold', TINTE, 0, 0.5);
        doc.setDrawColor(...ROT);
        doc.setLineWidth(0.6);
        doc.line(RAND, y, RAND + 30, y);
        y += 3;
        break;
      case 'h3':
        platz(12);
        y += 1;
        text(b.text, 12, 'bold', TINTE, 0, 1);
        break;
      case 'p':
        text(b.text, 11, 'normal', TINTE);
        break;
      case 'liste':
        for (const pkt of b.punkte) {
          platz(5);
          doc.setFillColor(...ROT);
          doc.circle(RAND + 1.5, y + 2.2, 0.8, 'F');
          text(pkt, 11, 'normal', TINTE, 5);
        }
        break;
      case 'balken': {
        const nameBreite = 62;
        const textBreite = 46;
        const balkenBreite = BREITE - nameBreite - textBreite - 4;
        for (const z of b.zeilen) {
          platz(7);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(...TINTE);
          const name = (doc.splitTextToSize(z.name, nameBreite - 2) as string[])[0] ?? '';
          doc.text(name, RAND, y + 4);
          const x = RAND + nameBreite;
          doc.setFillColor(...SPUR);
          doc.roundedRect(x, y + 1, balkenBreite, 4, 2, 2, 'F');
          const a = Math.max(0, Math.min(1, z.anteil));
          if (a > 0) {
            doc.setFillColor(...(b.neutral ? BLAU : a >= 0.99 ? GRUEN : a >= 0.5 ? [240, 162, 2] as [number, number, number] : ROT));
            doc.roundedRect(x, y + 1, Math.max(4, balkenBreite * a), 4, 2, 2, 'F');
          }
          doc.setTextColor(...WEICH);
          doc.text(z.text, x + balkenBreite + 4, y + 4);
          y += 6.5;
        }
        y += 2;
        break;
      }
      case 'tabelle': {
        const schrift = b.spalten.length > 10 ? 7.5 : 9;
        const zh = schrift * 0.42 + 2.4;
        doc.setFontSize(schrift);
        // Spaltenbreite nach dem längsten Eintrag (Kopf fett), dann auf die Seitenbreite gestreckt bzw. gestaucht
        const breiten = b.spalten.map((kopf, i) => {
          doc.setFont('helvetica', 'bold');
          let w = doc.getTextWidth(kopf);
          doc.setFont('helvetica', 'normal');
          for (const z of b.zeilen) w = Math.max(w, doc.getTextWidth(z.zellen[i] ?? ''));
          return Math.min(i === 0 ? 46 : 40, w + 3);
        });
        const summe = breiten.reduce((a, x) => a + x, 0);
        const faktor = BREITE / summe;
        const spalten = breiten.map((w) => w * faktor);
        const zelle = (t: string, x: number, w: number): void => {
          const passt = (doc.splitTextToSize(t, w - 1.6) as string[])[0] ?? '';
          doc.text(passt, x + 0.8, y + zh * 0.68);
        };
        const kopf = (): void => {
          doc.setFillColor(...SPUR);
          doc.rect(RAND, y, BREITE, zh, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...TINTE);
          let x = RAND;
          b.spalten.forEach((t, i) => {
            zelle(t, x, spalten[i] as number);
            x += spalten[i] as number;
          });
          y += zh;
        };
        platz(zh * 3);
        kopf();
        b.zeilen.forEach((z, zi) => {
          if (y + zh > UNTEN) {
            doc.addPage();
            y = RAND;
            doc.setFontSize(schrift);
            kopf();
          }
          let x = RAND;
          if (zi % 2 === 1) {
            doc.setFillColor(250, 250, 252);
            doc.rect(RAND, y, BREITE, zh, 'F');
          }
          z.zellen.forEach((t, i) => {
            const w = spalten[i] as number;
            const a = z.ampeln?.[i];
            if (a) {
              doc.setFillColor(...AMPEL[a]);
              doc.rect(x + 0.3, y + 0.3, w - 0.6, zh - 0.6, 'F');
            }
            doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
            doc.setTextColor(...TINTE);
            zelle(t, x, w);
            x += w;
          });
          doc.setDrawColor(...SPUR);
          doc.setLineWidth(0.2);
          doc.line(RAND, y + zh, RAND + BREITE, y + zh);
          y += zh;
        });
        y += 3;
        break;
      }
      case 'hinweis':
        platz(20);
        y += 4;
        doc.setDrawColor(...SPUR);
        doc.setLineWidth(0.4);
        doc.line(RAND, y, RAND + BREITE, y);
        y += 3;
        text(b.text, 9.5, 'normal', WEICH);
        break;
    }
  }
  // Fußzeile mit Seitenzahl
  const seiten = doc.getNumberOfPages();
  for (let i = 1; i <= seiten; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...WEICH);
    doc.text(`Mathe-Jahrmarkt – Fit für Klasse 5 · Seite ${i} von ${seiten}`, RAND, SEITE_H - 9);
  }
  return new Uint8Array(doc.output('arraybuffer'));
}

const base64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Gibt das PDF weiter. Liefert false, wenn das Teilen abgebrochen wurde oder nicht ging. */
export async function pdfWeitergeben(bytes: Uint8Array, dateiname: string, titel = 'Mathe-Jahrmarkt – Bericht'): Promise<boolean> {
  return dateiWeitergeben(bytes, dateiname, 'application/pdf', titel);
}

/**
 * Gibt eine Datei weiter: in der App über das Teilen-Menü (AirDrop, Dateien, Mail, Drucken …),
 * im Browser als Download. Liefert false, wenn das Teilen abgebrochen wurde oder nicht ging.
 */
export async function dateiWeitergeben(bytes: Uint8Array, dateiname: string, typ: string, titel: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.writeFile({ path: dateiname, data: base64(bytes), directory: Directory.Cache });
    try {
      await Share.share({ title: titel, files: [uri], dialogTitle: titel });
      return true;
    } catch {
      return false;
    }
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: typ }));
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
