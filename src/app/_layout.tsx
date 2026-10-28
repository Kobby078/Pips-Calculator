import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useMemo } from 'react';
import { Platform } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { HelpProvider } from '@/components/help-context';
import { SettingsProvider } from '@/components/settings-context';
import { ThemeSync } from '@/components/theme-sync';
import { Colors, webThemeColors, type ThemeColors } from '@/constants/theme';
import { useResolvedColorScheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

function ThemedApp() {
  const scheme = useResolvedColorScheme();
  const palette: ThemeColors = Platform.OS === 'web' ? webThemeColors : Colors[scheme === 'light' ? 'light' : 'dark'];
  const navigationTheme = useMemo(
    () => ({
      ...(Platform.OS === 'web' ? DefaultTheme : scheme === 'light' ? DefaultTheme : DarkTheme),
      dark: Platform.OS === 'web' ? false : scheme !== 'light',
      colors: {
        primary: palette.button,
        background: palette.background,
        card: palette.backgroundElement,
        text: palette.text,
        border: palette.divider,
        notification: palette.button,
      },
    }),
    [palette, scheme],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <ThemeSync />
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <HelpProvider>
        <ThemedApp />
      </HelpProvider>
    </SettingsProvider>
  );
}
