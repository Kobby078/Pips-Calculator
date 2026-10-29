import { useMemo } from 'react';
import { Platform, useColorScheme } from 'react-native';

import { useSettings } from '@/components/settings-context';
import { Colors, webThemeColors, type ThemeColors } from '@/constants/theme';
import { resolveColorScheme, type ColorSchemeName } from '@/lib/appearance';

export function useResolvedColorScheme(): ColorSchemeName | null {
  const system = useColorScheme();
  const { appearance } = useSettings();
  const reported = system === 'light' || system === 'dark' ? system : null;
  return resolveColorScheme(appearance, reported);
}

/** Web colors are CSS variables so server and client render the same style values. */
export function useTheme(): ThemeColors {
  const scheme = useResolvedColorScheme();
  if (Platform.OS === 'web') {
    return webThemeColors;
  }
  return Colors[scheme === 'light' ? 'light' : 'dark'];
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useTheme();
  const scheme = useResolvedColorScheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- scheme ensures cached style sheets recompute on theme toggle
  return useMemo(() => factory(colors), [colors, scheme, factory]);
}
