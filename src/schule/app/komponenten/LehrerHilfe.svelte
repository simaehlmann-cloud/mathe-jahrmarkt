<script lang="ts">
  import { elternbrief, kurzanleitung } from '../../hilfe';
  import BausteinAnsicht from './BausteinAnsicht.svelte';
  import { app } from '../../../app/zustand.svelte';

  /** Hilfe im Lehrerbereich: Kurzanleitung (auch als PDF) und ein Elternbrief zum Ausfüllen (PDF). */
  const anleitung = kurzanleitung();
  let schule = $state('');
  let klasse = $state(app.bestand.schule?.klassen[0]?.name ?? '');
  let lehrkraft = $state('');
  let datum = $state(new Date().toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }));
  let laeuft = $state(false);

  async function pdf(art: 'anleitung' | 'brief') {
    laeuft = true;
    try {
      const { berichtPdf, pdfWeitergeben } = await import('../../../services/pdf');
      if (art === 'anleitung') {
        await pdfWeitergeben(await berichtPdf(anleitung, { titel: 'Mathe-Jahrmarkt Schule – Kurzanleitung' }), 'Kurzanleitung Mathe-Jahrmarkt Schule.pdf', 'Kurzanleitung');
      } else {
        const b = elternbrief({ schule, klasse, lehrkraft, datum });
        await pdfWeitergeben(await berichtPdf(b, { titel: 'Elternbrief Mathe-Jahrmarkt' }), 'Elternbrief Mathe-Jahrmarkt.pdf', 'Elternbrief');
      }
    } catch {
      app.melde('Das PDF ließ sich gerade nicht erstellen.');
    } finally {
      laeuft = false;
    }
  }
</script>

<section>
  <div class="block">
    <h2>Elternbrief</h2>
    <p>Ein Brief, der Eltern die App und den Datenschutz erklärt – zum Ausdrucken oder Weiterleiten. Die Angaben werden nicht gespeichert.</p>
    <div class="felder">
      <label class="wahl">Schule<input bind:value={schule} placeholder="z. B. Grundschule am Park" autocomplete="off" /></label>
      <label class="wahl">Klasse<input bind:value={klasse} placeholder="4a" autocomplete="off" /></label>
      <label class="wahl">Lehrkraft<input bind:value={lehrkraft} placeholder="Name" autocomplete="off" /></label>
      <label class="wahl">Datum<input bind:value={datum} autocomplete="off" /></label>
    </div>
    <button class="ticket" disabled={laeuft} onclick={() => pdf('brief')}>Elternbrief als PDF</button>
  </div>

  <div class="block">
    <div class="zeile">
      <h2>Kurzanleitung</h2>
      <button class="ticket hell" disabled={laeuft} onclick={() => pdf('anleitung')}>Als PDF</button>
    </div>
    <BausteinAnsicht bausteine={anleitung} ohneTitel />
  </div>
</section>

<style>
  section {
    display: grid;
    gap: 16px;
  }
  h2 {
    font-size: 1.2rem;
  }
  .block {
    display: grid;
    gap: 10px;
    justify-items: start;
    padding: 12px 14px;
    border: 2px solid #e1e4ef;
    border-radius: 12px;
    background: #fff;
  }
  .felder {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
    gap: 10px;
    width: 100%;
  }
  .wahl {
    display: grid;
    gap: 4px;
    font-weight: 800;
  }
  input {
    font: inherit;
    font-weight: 700;
    padding: 8px 10px;
    border: 3px solid var(--tinte);
    border-radius: 10px;
    background: #fff;
    color: var(--tinte);
    user-select: text;
    -webkit-user-select: text;
  }
  .zeile {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
    width: 100%;
    justify-content: space-between;
  }
  .ticket {
    font-size: 1rem;
    min-height: 46px;
    padding: 0.5em 1.2em;
  }
</style>
