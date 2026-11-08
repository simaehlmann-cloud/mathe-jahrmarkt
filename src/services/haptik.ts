import { Capacitor } from '@capacitor/core';

export type Vibration = 'leicht' | 'erfolg' | 'hinweis';

/** Kurze Vibration auf Geräten, die das können. Fehler werden still ignoriert. */
export async function vibriere(art: Vibration): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (art === 'leicht') await Haptics.impact({ style: ImpactStyle.Light });
    else if (art === 'erfolg') await Haptics.notification({ type: NotificationType.Success });
    else await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    /* keine Haptik verfügbar */
  }
}
