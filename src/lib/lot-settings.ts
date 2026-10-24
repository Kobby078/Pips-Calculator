import { ACCOUNT_CURRENCIES, type AccountCurrency, DEFAULT_ACCOUNT_CURRENCY } from '../constants/currencies';
import { isPositiveDecimal } from './decimal-input';
import type { ResultRow } from './present-position';

/** Values the settings screen already described. Empty strings never reached the engine. */
export const DEFAULT_MINIMUM_LOT = '0.01';
export const DEFAULT_LOT_INCREMENT = '0.01';

export const COMMON_MINIMUM_LOTS = ['0.001', '0.01', '0.10'] as const;

export type CommonMinimumLot = (typeof COMMON_MINIMUM_LOTS)[number];

export type LotSettingsSource = 'instrument' | 'global';

export type InstrumentVolume = {
  minimumLot: string;
  lotIncrement: string;
};

export type ResolvedLotSettings = {
  minimumLot: string;
  lotIncrement: string;
  source: LotSettingsSource;
  valid: boolean;
};

export const SETTINGS_STORAGE_KEY = 'atlasjfx.calculator-settings.v1';

export type StoredCalculatorSettings = {
  currency: AccountCurrency;
  minimumLotSize: string;
  lotIncrement: string;
  instrumentLots: Record<string, InstrumentVolume>;
};

export function resolveLotSettings(input: {
  symbol: string | null;
  globalMinimum: string;
  globalIncrement: string;
  instrumentLots: Readonly<Record<string, InstrumentVolume | undefined>>;
}): ResolvedLotSettings {
  const override = input.symbol ? input.instrumentLots[input.symbol] : undefined;
  const minimumLot = override ? override.minimumLot : input.globalMinimum;
  const lotIncrement = override ? override.lotIncrement : input.globalIncrement;
  return {
    minimumLot,
    lotIncrement,
    source: override ? 'instrument' : 'global',
    valid: isPositiveDecimal(minimumLot) && isPositiveDecimal(lotIncrement),
  };
}

export function minimumLotChoice(value: string): CommonMinimumLot | 'custom' {
  const parsed = Number(value);
  if (!isPositiveDecimal(value) || !Number.isFinite(parsed)) {
    return 'custom';
  }
  for (const preset of COMMON_MINIMUM_LOTS) {
    if (Math.abs(parsed - Number(preset)) < 1e-12) {
      return preset;
    }
  }
  return 'custom';
}

export function lotSettingsSummary(source: LotSettingsSource, symbol: string): ResultRow {
  return {
    label: 'Lot settings',
    value:
      source === 'instrument'
        ? `Saved for ${symbol}`
        : 'Your Settings defaults, not a broker specification',
  };
}

export function parseStoredSettings(raw: string | null): StoredCalculatorSettings | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    const currency = ACCOUNT_CURRENCIES.includes(record.currency as AccountCurrency)
      ? (record.currency as AccountCurrency)
      : DEFAULT_ACCOUNT_CURRENCY;
    return {
      currency,
      minimumLotSize: readString(record.minimumLotSize, DEFAULT_MINIMUM_LOT),
      lotIncrement: readString(record.lotIncrement, DEFAULT_LOT_INCREMENT),
      instrumentLots: readInstrumentLots(record.instrumentLots),
    };
  } catch {
    return null;
  }
}

export function serializeSettings(settings: StoredCalculatorSettings): string {
  return JSON.stringify(settings);
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function readInstrumentLots(value: unknown): Record<string, InstrumentVolume> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  const lots: Record<string, InstrumentVolume> = {};
  for (const [symbol, volume] of Object.entries(value)) {
    if (!/^[A-Z0-9]{2,12}$/.test(symbol) || !volume || typeof volume !== 'object') {
      continue;
    }
    const record = volume as Record<string, unknown>;
    if (typeof record.minimumLot !== 'string' || typeof record.lotIncrement !== 'string') {
      continue;
    }
    lots[symbol] = { minimumLot: record.minimumLot, lotIncrement: record.lotIncrement };
  }
  return lots;
}
