export const APPEARANCE_PREFERENCES = ['system', 'light', 'dark'] as const;

export type AppearancePreference = (typeof APPEARANCE_PREFERENCES)[number];

export type ColorSchemeName = 'light' | 'dark';

/** Missing or unknown stored values follow the device. */
export function parseAppearancePreference(value: unknown): AppearancePreference | undefined {
  if (value === 'system' || value === 'light' || value === 'dark') {
    return value;
  }
  return undefined;
}

export function appearanceOrDefault(value: unknown): AppearancePreference {
  return parseAppearancePreference(value) ?? 'system';
}

/**
 * Light and Dark override the device. System follows a reported device scheme.
 * An unknown device scheme stays unresolved so a startup script can keep the first paint.
 */
export function resolveColorScheme(
  preference: AppearancePreference,
  systemScheme: ColorSchemeName | null | undefined,
): ColorSchemeName | null {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }
  if (systemScheme === 'light' || systemScheme === 'dark') {
    return systemScheme;
  }
  return null;
}
