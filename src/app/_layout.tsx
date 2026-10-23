import { DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { SettingsProvider } from '@/components/settings-context';
import { Palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Palette.accent,
    background: Palette.background,
    card: Palette.backgroundElement,
    text: Palette.text,
    border: Palette.border,
    notification: Palette.accent,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={navigationTheme}>
      <SettingsProvider>
        <StatusBar style="light" />
        <AnimatedSplashOverlay />
        <AppTabs />
      </SettingsProvider>
    </ThemeProvider>
  );
}
