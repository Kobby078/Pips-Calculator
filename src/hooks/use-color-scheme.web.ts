/**
 * The product palette is dark on every platform, including during web static render.
 */
export function useColorScheme() {
  return 'dark' as const;
}
