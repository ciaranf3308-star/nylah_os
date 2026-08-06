import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nylahos.fridge',
  appName: 'Nylah OS',
  webDir: 'client/dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: { launchShowDuration: 0 }
  }
};

export default config;
