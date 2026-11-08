import type { CapacitorConfig } from '@capacitor/cli';

/**
 * App-Kennung: vor dem ersten Upload mit App Store Connect und Play Console abgleichen.
 * Sie lässt sich nach der Veröffentlichung nicht mehr ändern.
 */
const config: CapacitorConfig = {
  appId: 'de.maehlmann.mathejahrmarkt',
  appName: 'Mathe-Jahrmarkt',
  webDir: 'dist',
  backgroundColor: '#FFF6E5',
  ios: {
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
