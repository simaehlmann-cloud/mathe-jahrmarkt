import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { lizenzen } from './scripts/lizenzen-plugin';
import { readFileSync } from 'node:fs';

const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

// Optionale Teile von jsPDF, die der Eltern-Bericht nicht nutzt, werden durch ein leeres Modul ersetzt.
const leer = fileURLToPath(new URL('./src/services/leer.ts', import.meta.url));

export default defineConfig({
  plugins: [svelte(), lizenzen()],
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  resolve: {
    alias: { html2canvas: leer, dompurify: leer, canvg: leer },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
