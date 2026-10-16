import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ru.cvetochki.app",
  appName: "Цветочки",
  webDir: "out",
  backgroundColor: "#F7F4ED",
  splashScreenImage: "public/icon-512.png",
  splashScreenFullSize: true,
  splashScreenScale: "contain",
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#F7F4ED",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: "#F7F4ED",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "LARGE",
      spinnerColor: "#9CAF88",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#F7F4ED",
      overlaysWebView: false,
    },
  },
};

export default config;
