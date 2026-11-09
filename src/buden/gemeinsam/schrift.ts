/** Schriftart sicher geladen, bevor PixiJS Text auf die Leinwand zeichnet. */
export async function schriftBereit(): Promise<void> {
  try {
    await Promise.all([document.fonts.load('900 40px Nunito'), document.fonts.load('800 20px Nunito')]);
  } catch {
    /* Systemschrift als Rückfall */
  }
}
