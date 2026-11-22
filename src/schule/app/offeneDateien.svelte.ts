/**
 * Dateien, die mit der App geöffnet wurden (AirDrop, „Öffnen mit …“) und auf den Lehrerbereich warten.
 * Erst nach der Lehrer-PIN werden sie entschlüsselt und übernommen.
 */
export const offeneDateien = $state<{ liste: { name: string; text: string }[] }>({ liste: [] });
