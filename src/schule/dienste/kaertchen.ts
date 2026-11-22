/**
 * Klassensatz der Schulversion: Kärtchen zum Ausschneiden mit Name, Klasse und Bildpasswort (A4, 8 je Seite).
 * Die Bildsymbole sind dieselben Zeichnungen wie in der App; sie werden einmal in Bilder umgewandelt.
 */
import { symbolName } from '../domain/bildpasswort';
import { symbolSvg } from '../app/grafik/bildsymbole';

export interface Kaertchen {
  name: string;
  klasse: string;
  passwort: string[];
}

const TINTE: [number, number, number] = [31, 42, 107];
const WEICH: [number, number, number] = [90, 98, 140];
const ROT: [number, number, number] = [226, 58, 78];

async function symbolBild(id: string): Promise<string> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(symbolSvg(id, 200))}`;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = c.height = 200;
  const g = c.getContext('2d');
  if (!g) throw new Error('Zeichnen nicht möglich');
  g.drawImage(img, 0, 0, 200, 200);
  return c.toDataURL('image/png');
}

/** PDF mit einem Kärtchen je Kind. */
export async function klassensatzPdf(karten: readonly Kaertchen[]): Promise<Uint8Array> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setProperties({ title: 'Mathe-Jahrmarkt – Bildpasswörter', creator: 'Mathe-Jahrmarkt' });
  const bilder = new Map<string, string>();
  for (const id of new Set(karten.flatMap((k) => k.passwort))) bilder.set(id, await symbolBild(id));

  const B = 92;
  const H = 66;
  const X0 = (210 - 2 * B) / 2;
  const Y0 = 14;
  karten.forEach((k, i) => {
    const platz = i % 8;
    if (i > 0 && platz === 0) doc.addPage();
    const x = X0 + (platz % 2) * B;
    const y = Y0 + Math.floor(platz / 2) * H;
    // Schnittlinien
    doc.setDrawColor(180, 184, 200);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(x, y, B, H);
    doc.setLineDashPattern([], 0);
    // Kopf
    doc.setFillColor(...ROT);
    doc.rect(x + 3, y + 3, B - 6, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('Mathe-Jahrmarkt', x + 5, y + 7.8);
    if (k.klasse) doc.text(`Klasse ${k.klasse}`, x + B - 5, y + 7.8, { align: 'right' });
    // Name
    doc.setTextColor(...TINTE);
    doc.setFontSize(17);
    doc.text((doc.splitTextToSize(k.name, B - 10) as string[])[0] ?? '', x + 5, y + 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...WEICH);
    doc.text('Dein Bildpasswort – tippe die Bilder in dieser Reihenfolge:', x + 5, y + 25);
    // Drei Bilder mit Nummer und Wort
    const feld = 26;
    const abstand = (B - 10 - 3 * feld) / 2;
    k.passwort.forEach((id, j) => {
      const fx = x + 5 + j * (feld + abstand);
      const fy = y + 28;
      doc.setDrawColor(...TINTE);
      doc.setLineWidth(0.5);
      doc.roundedRect(fx, fy, feld, feld, 3, 3);
      const bild = bilder.get(id);
      // Kennung als Alias: jedes Bild steckt nur einmal im PDF, auch wenn es auf vielen Kärtchen steht
      if (bild) doc.addImage(bild, 'PNG', fx + 3, fy + 3, feld - 6, feld - 6, `symbol-${id}`, 'FAST');
      doc.setFillColor(...TINTE);
      doc.circle(fx + 3.2, fy + 3.2, 2.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(String(j + 1), fx + 3.2, fy + 4.3, { align: 'center' });
      doc.setTextColor(...TINTE);
      doc.setFontSize(9);
      doc.text(symbolName(id), fx + feld / 2, fy + feld + 4.5, { align: 'center' });
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...WEICH);
    doc.text('Mein iPad: ________', x + 5, y + H - 3.5);
    doc.text('Nicht weitergeben!', x + B - 5, y + H - 3.5, { align: 'right' });
  });
  if (karten.length === 0) {
    doc.setFontSize(12);
    doc.text('Keine Kinder ausgewählt.', 20, 30);
  }
  return new Uint8Array(doc.output('arraybuffer'));
}
