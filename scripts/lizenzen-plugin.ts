/**
 * Vite-Plugin: sammelt beim Bauen alle Pakete, die wirklich im App-Bundle landen, mit Lizenz und Lizenztext
 * und legt sie als `lizenzen.json` neben die App. Die Seite „Über Mathe-Jahrmarkt“ zeigt daraus die Hinweise.
 * So bleibt die Liste automatisch aktuell.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

export interface Lizenz {
  name: string;
  version: string;
  lizenz: string;
  autor: string;
  text: string;
}

function paketWurzel(id: string): string | undefined {
  const i = id.lastIndexOf('node_modules/');
  if (i < 0) return undefined;
  const rest = id.slice(i + 'node_modules/'.length).split('/');
  const name = rest[0]?.startsWith('@') ? `${rest[0]}/${rest[1]}` : rest[0];
  return name ? join(id.slice(0, i), 'node_modules', name) : undefined;
}

function lies(wurzel: string): Lizenz | undefined {
  const pj = join(wurzel, 'package.json');
  if (!existsSync(pj)) return undefined;
  const p = JSON.parse(readFileSync(pj, 'utf8')) as Record<string, unknown>;
  const datei = readdirSync(wurzel).find((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f));
  const autor = typeof p.author === 'string' ? p.author : (p.author as { name?: string } | undefined)?.name ?? '';
  return {
    name: String(p.name),
    version: String(p.version),
    lizenz: typeof p.license === 'string' ? p.license : 'siehe Lizenztext',
    autor,
    text: datei ? readFileSync(join(wurzel, datei), 'utf8').trim() : '',
  };
}

export function lizenzen(): Plugin {
  return {
    name: 'mathe-jahrmarkt-lizenzen',
    apply: 'build',
    generateBundle(_, bundle) {
      const wurzeln = new Set<string>();
      for (const teil of Object.values(bundle)) {
        if (teil.type !== 'chunk') continue;
        for (const id of Object.keys(teil.modules)) {
          const w = paketWurzel(id.replace(/\\/g, '/').replace(/^\0/, ''));
          if (w) wurzeln.add(w);
        }
      }
      // Die Schrift wird als CSS eingebunden und taucht nicht als JS-Modul auf
      const schrift = join(process.cwd(), 'node_modules', '@fontsource', 'nunito');
      if (existsSync(schrift)) wurzeln.add(schrift);
      const liste = [...wurzeln]
        .map(lies)
        .filter((l): l is Lizenz => !!l)
        .sort((a, b) => a.name.localeCompare(b.name));
      this.emitFile({ type: 'asset', fileName: 'lizenzen.json', source: JSON.stringify(liste) });
    },
  };
}
