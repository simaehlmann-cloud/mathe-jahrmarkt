/**
 * Zeichnet den Eltern-Bericht als PDF (A4) und gibt ihn weiter: in der App über das Teilen-Menü
 * (Mail, Drucken, Dateien …), im Browser als Download. jsPDF wird erst beim Erstellen geladen.
 */
import { Capacitor } from '@capacitor/core';
import type { Baustein } from '../domain/elternbericht';

const TINTE: [number, number, number] = [31, 42, 107];
const WEICH: [number, number, number] = [90, 98, 140];
const ROT: [number, number, number] = [226, 58, 78];
const GRUEN: [number, number, number] = [63, 174, 106];
const BLAU: [number, number, number] = [60, 120, 216];
const SPUR: [number, number, number] = [232, 235, 244];

const RAND = 18;
const BREITE = 210 - 2 * RAND;
const UNTEN = 297 - 18;

/** Erzeugt das PDF und liefert es als Bytes. */
export async function berichtPdf(bausteine: readonly Baustein[]): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: 'Mathe-Jahrmarkt – Bericht', creator: 'Mathe-Jahrmarkt' });
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
        doc.rect(0, 0, 210, 6, 'F');
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
    doc.text(`Mathe-Jahrmarkt – Fit für Klasse 5 · Seite ${i} von ${seiten}`, RAND, 297 - 9);
  }
  return new Uint8Array(doc.output('arraybuffer'));
}

const base64 = (bytes: Uint8Array): string => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

/** Gibt das PDF weiter. Liefert false, wenn das Teilen abgebrochen wurde oder nicht ging. */
export async function pdfWeitergeben(bytes: Uint8Array, dateiname: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.writeFile({ path: dateiname, data: base64(bytes), directory: Directory.Cache });
    try {
      await Share.share({ title: 'Mathe-Jahrmarkt – Bericht', files: [uri], dialogTitle: 'Bericht weitergeben' });
      return true;
    } catch {
      return false;
    }
  }
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return true;
}
