/**
 * .jahrmarkt-Dateien direkt mit der Schulversion öffnen (iOS: Dokumenttyp im Info.plist, gesetzt vom Workflow
 * „iOS TestFlight Schule“). iOS kopiert die Datei in den Posteingang der App und meldet sie über „appUrlOpen“
 * bzw. beim Kaltstart über die Start-URL. Die Datei wird gelesen, aus dem Posteingang gelöscht und wartet auf die PIN.
 */
import { Capacitor } from '@capacitor/core';
import { ENDUNG } from '../dienste/schuldateien';
import { offeneDateien } from './offeneDateien.svelte';

const MAX_GROESSE = 60 * 1024 * 1024;

export async function dateiOeffnenVorbereiten(beiDatei: () => void, beiFehler: (text: string) => void): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { App } = await import('@capacitor/app');
  const { Filesystem, Encoding } = await import('@capacitor/filesystem');
  const nimm = async (url: string): Promise<void> => {
    const name = decodeURIComponent(url.split('/').pop() ?? '').split('?')[0] ?? '';
    if (!name.toLowerCase().endsWith(ENDUNG)) return;
    try {
      const info = await Filesystem.stat({ path: url }).catch(() => null);
      if (info && info.size > MAX_GROESSE) throw new Error('zu groß');
      const r = await Filesystem.readFile({ path: url, encoding: Encoding.UTF8 });
      const text = typeof r.data === 'string' ? r.data : await r.data.text();
      offeneDateien.liste = [...offeneDateien.liste.filter((d) => d.name !== name), { name, text }];
      beiDatei();
    } catch {
      beiFehler(`Die Datei „${name}“ ließ sich nicht öffnen.`);
    } finally {
      // Aus dem Posteingang der App entfernen (eine Kopie liegt dort, wo sie herkam)
      await Filesystem.deleteFile({ path: url }).catch(() => {});
    }
  };
  await App.addListener('appUrlOpen', (e) => void nimm(e.url));
  const start = await App.getLaunchUrl();
  if (start?.url) await nimm(start.url);
}
