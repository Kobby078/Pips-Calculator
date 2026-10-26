/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

const brand = {
  text: '#F4F4F7',
  background: '#0C0C10',
  backgroundElement: '#16161D',
  backgroundSelected: '#2A2340',
  textSecondary: '#A7A6B3',
  textMuted: '#8E8C9A',
  accent: '#6D4F96',
  accentSoft: '#241E33',
  border: '#2E2C38',
  surfaceRaised: '#1E1E28',
  danger: '#E2B4BC',
} as const;

/** ATLASJFX is a dark fintech product, so both schemes share the brand palette. */
export const Colors = {
  light: brand,
  dark: brand,
} as const;

export const Palette = brand;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
/** Centered web dashboard. Phone layouts stay on PhoneContentWidth. */
export const DashboardMaxWidth = 1360;
export const SettingsContentWidth = 880;
export const PhoneContentWidth = 640;
