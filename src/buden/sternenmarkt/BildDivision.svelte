<script lang="ts">
  import type { Aufgabe } from '../../domain/aufgaben/typen';
  /** Geisterbahn: schriftliche Division wie im Heft, Spalten an den Ziffern des Dividenden ausgerichtet. */
  let { aufgabe, zustand }: { aufgabe: Aufgabe; zustand: '' | 'richtig' | 'falsch'; gewaehlt: number | null } = $props();
  const d = $derived(aufgabe.art === 'auswahl' ? aufgabe.daten : {});
  const a = $derived(String(d.a ?? ''));
  const zeilen = $derived((d.zeilen as { text: string; ende: number; minus?: boolean }[] | undefined) ?? []);
  const quotient = $derived((d.quotient as string[] | undefined) ?? []);
  const frage = $derived(String(d.frage ?? 'ziffer'));
  const geloest = $derived(zustand === 'richtig');
  // Ergebnis: bekannte Ziffern, dann „?“ (bzw. Lösung) für die gefragte
  // Ergebnis erst nach der Lösung zeigen (in der Hilfe ist es gelöst); bei der Probe ist es gegeben
  const ergebnis = $derived(geloest || frage === 'probe' ? quotient.join('') : '?');
  const restText = $derived(frage === 'ohne' ? '' : geloest || frage === 'probe' ? ` R ${d.rest}` : ' R ?');
  const spalten = $derived(a.length);
  const verdeckt = $derived(frage === 'probe' && !geloest);
  /** Zeile als Zellen (Spalte −1 für das Minus): rechtsbündig bis `ende`, das Minus direkt vor der ersten Ziffer. */
  const zellen = (text: string, ende: number, minus = false): { c: string; ziffer: boolean }[] => {
    const z = Array.from({ length: spalten + 1 }, () => ({ c: '', ziffer: false }));
    const start = ende - (text.length - 1);
    text.split('').forEach((c, i) => {
      const s = start + i + 1;
      if (s >= 0 && s <= spalten) z[s] = { c, ziffer: true };
    });
    if (minus && start >= 0) z[start] = { c: '−', ziffer: false };
    return z;
  };
</script>

<div class="heft" role="img" aria-label="{verdeckt ? 'Unbekannte Zahl' : a} geteilt durch {d.d} gleich {ergebnis}{restText}">
  <div class="zeile kopf">
    <span></span>
    {#if verdeckt}<span class="frage breit">?</span>{:else}{#each a.split('') as c, i (i)}<span class:teil={i <= Number(d.markiere ?? -1)}>{c}</span>{/each}{/if}
    <span class="rechts">&nbsp;: {d.d} = <b class:frage={!geloest && frage === 'ziffer'}>{ergebnis}</b><b class:frage={!geloest && frage === 'rest'}>{restText}</b></span>
  </div>
  {#if !verdeckt && (geloest || frage === 'probe')}
    {#each zeilen as z, j (j)}
      <div class="zeile">
        {#each zellen(z.text, z.ende, z.minus) as x, i (i)}<span class:frage={x.c === '?'} class:strich={z.minus && x.ziffer}>{x.c}</span>{/each}
      </div>
    {/each}
  {/if}
</div>

<style>
  .heft {
    display: inline-grid;
    gap: 2px;
    padding: 14px 18px;
    background: #fffdf7 repeating-linear-gradient(0deg, transparent 0 31px, #cfe0f5 31px 32px);
    border: 3px solid var(--tinte);
    border-radius: 10px;
    font-family: ui-monospace, 'Cascadia Mono', Menlo, monospace;
    font-weight: 800;
    font-size: clamp(0.95rem, 4.2vw, 1.45rem);
    max-width: 100%;
    color: var(--tinte);
  }
  .zeile {
    display: flex;
    align-items: baseline;
    height: 1.9rem;
  }
  .zeile span:not(.rechts) {
    width: 1.1em;
    text-align: center;
  }
  .zeile span.strich {
    border-bottom: 3px solid var(--tinte);
  }
  .zeile span.breit {
    width: auto;
    padding: 0 0.3em;
  }
  .rechts {
    white-space: pre;
  }
  .teil {
    background: #fff4c2;
    border-radius: 4px;
  }
  .frage {
    color: #e23a4e;
  }
</style>
