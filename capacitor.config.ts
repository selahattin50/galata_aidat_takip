import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.galata.aidattakip',
  appName: 'Galata Aidat Takip',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    App: {
      backButtonListenerEnabled: true
    }
  }
};

export default config;
