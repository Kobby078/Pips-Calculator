import '@/global.css';

import { Platform } from 'react-native';

export const themeColorNames = [
  'background',
  'backgroundElement',
  'surfaceRaised',
  'backgroundSelected',
  'text',
  'textSecondary',
  'textMuted',
  'accent',
  'accentSoft',
  'border',
  'button',
  'buttonText',
  'positive',
  'warning',
  'error',
  'danger',
  'disabled',
  'reference',
  'placeholder',
  'input',
  'nav',
  'divider',
] as const;

export type ThemeColor = (typeof themeColorNames)[number];

export type ThemeColors = Record<ThemeColor, string>;

const dark = {
  background: '#0C0C10',
  backgroundElement: '#16161D',
  surfaceRaised: '#1E1E28',
  backgroundSelected: '#2A2340',
  text: '#F4F4F7',
  textSecondary: '#C5C4D0',
  textMuted: '#B0AEBC',
  accent: '#C4B0E0',
  accentSoft: '#241E33',
  border: '#6A6480',
  button: '#6D4F96',
  buttonText: '#FFFFFF',
  positive: '#8FCBB0',
  warning: '#E4C07A',
  error: '#E2B4BC',
  danger: '#E2B4BC',
  disabled: '#8E8C9A',
  reference: '#241E33',
  placeholder: '#B0AEBC',
  input: '#1E1E28',
  nav: '#0C0C10',
  divider: '#6A6480',
} as const satisfies ThemeColors;

const light = {
  background: '#F5F4F9',
  backgroundElement: '#FFFFFF',
  surfaceRaised: '#ECE9F3',
  backgroundSelected: '#E6DCF5',
  text: '#1A1A1F',
  textSecondary: '#3A3844',
  textMuted: '#4E4C59',
  accent: '#5C3D86',
  accentSoft: '#F1ECF8',
  border: '#D2CDDD',
  button: '#6D4F96',
  buttonText: '#FFFFFF',
  positive: '#146B43',
  warning: '#7A4E00',
  error: '#8E2433',
  danger: '#8E2433',
  disabled: '#747180',
  reference: '#F1ECF8',
  placeholder: '#666275',
  input: '#FFFFFF',
  nav: '#F5F4F9',
  divider: '#E4E0EC',
} as const satisfies ThemeColors;

export const Colors = {
  light,
  dark,
} as const;

/** Splash and icon plates stay on the charcoal brand field. */
export const BrandCanvas = '#0C0C10';

export function themeVar(name: ThemeColor): string {
  const kebab = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return `var(--atlas-${kebab})`;
}

export const webThemeColors: ThemeColors = Object.fromEntries(
  themeColorNames.map((name) => [name, themeVar(name)]),
) as ThemeColors;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
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
