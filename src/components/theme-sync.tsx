import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';

import { useSettings } from '@/components/settings-context';
import { Colors } from '@/constants/theme';
import { resolveColorScheme } from '@/lib/appearance';

/** Applies the resolved scheme to the document, root view, and status bar after settings load. */
export function ThemeSync() {
  const system = useColorScheme();
  const { appearance, hydrated } = useSettings();
  const reported = system === 'light' || system === 'dark' ? system : null;
  const scheme = resolveColorScheme(appearance, reported);

  useEffect(() => {
    if (!hydrated || !scheme) {
      return;
    }
    if (Platform.OS === 'web') {
      document.documentElement.setAttribute('data-theme', scheme);
      document.documentElement.style.colorScheme = scheme;
      return;
    }
    void SystemUI.setBackgroundColorAsync(Colors[scheme].background);
  }, [hydrated, scheme]);

  if (!scheme || (Platform.OS === 'web' && !hydrated)) {
    return null;
  }

  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}
