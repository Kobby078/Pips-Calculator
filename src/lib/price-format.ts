import type { InstrumentSpec } from '../constants/instruments';

/**
 * Digits shown for a reference price and for the entry filled by Use Price.
 * Forex uses the usual quote: one digit past the pip. Gold is shown in US dollars.
 * These are display choices. They are not a broker tick, and the position math is unchanged.
 */
export function displayPriceDecimals(spec: Pick<InstrumentSpec, 'kind' | 'quoteCurrency'> | null): number {
  if (spec?.kind === 'metal') {
    return 2;
  }
  if (spec?.kind === 'forex' && spec.quoteCurrency === 'JPY') {
    return 3;
  }
  return 5;
}

/** Fixed display decimals. Trailing zeros stay so the precision is visible. */
export function formatDisplayPrice(value: number, decimals: number): string {
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(decimals) || decimals < 0 || decimals > 8) {
    return '';
  }
  const text = value.toFixed(decimals);
  if (!(Number(text) > 0)) {
    return '';
  }
  return text;
}
