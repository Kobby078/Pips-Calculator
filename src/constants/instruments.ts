export type InstrumentKind = 'forex' | 'metal' | 'index';

export type InstrumentSpec = {
  kind: InstrumentKind;
  baseCurrency: string;
  quoteCurrency: string;
  /** Price change that counts as one pip for this instrument. */
  pipSize: number;
  /** Base-asset units in one standard lot. */
  contractSize: number;
  /** True when the contract or pip size is a starting assumption, not a universal standard. */
  brokerDependent: boolean;
  assumptionNote?: string;
};

export type Instrument = {
  symbol: string;
  name: string;
  spec: InstrumentSpec | null;
  unavailableReason: string | null;
};

/** One standard forex lot is 100,000 units of the base currency. */
export const FOREX_STANDARD_CONTRACT_SIZE = 100_000;

/** Non-JPY forex pip. JPY-quoted pairs use {@link JPY_FOREX_PIP_SIZE} instead. */
export const FOREX_PIP_SIZE = 0.0001;

/** Pip size for forex pairs quoted in JPY. This is not applied to metals or indices. */
export const JPY_FOREX_PIP_SIZE = 0.01;

/**
 * Starting gold assumptions. Brokers do not share one XAUUSD contract or pip definition.
 * 100 troy ounces per standard lot, and one pip as a 0.01 price change.
 */
export const GOLD_CONTRACT_SIZE_OUNCES = 100;
export const GOLD_PIP_SIZE = 0.01;

const GOLD_ASSUMPTION_NOTE =
  'Gold uses a starting assumption of 100 troy ounces per standard lot and a pip of 0.01. Brokers define this differently.';

function forex(symbol: string, name: string, baseCurrency: string, quoteCurrency: string): Instrument {
  return {
    symbol,
    name,
    spec: {
      kind: 'forex',
      baseCurrency,
      quoteCurrency,
      pipSize: quoteCurrency === 'JPY' ? JPY_FOREX_PIP_SIZE : FOREX_PIP_SIZE,
      contractSize: FOREX_STANDARD_CONTRACT_SIZE,
      brokerDependent: false,
    },
    unavailableReason: null,
  };
}

function unconfigured(symbol: string, name: string): Instrument {
  return {
    symbol,
    name,
    spec: null,
    unavailableReason: `${symbol} has no contract size or pip size configured, so no position size is calculated.`,
  };
}

/** Static instrument definitions. Prices are never included. */
export const INSTRUMENTS: readonly Instrument[] = [
  forex('EURUSD', 'Euro / US Dollar', 'EUR', 'USD'),
  forex('GBPUSD', 'British Pound / US Dollar', 'GBP', 'USD'),
  forex('USDJPY', 'US Dollar / Japanese Yen', 'USD', 'JPY'),
  forex('USDCHF', 'US Dollar / Swiss Franc', 'USD', 'CHF'),
  forex('AUDUSD', 'Australian Dollar / US Dollar', 'AUD', 'USD'),
  forex('USDCAD', 'US Dollar / Canadian Dollar', 'USD', 'CAD'),
  forex('NZDUSD', 'New Zealand Dollar / US Dollar', 'NZD', 'USD'),
  {
    symbol: 'XAUUSD',
    name: 'Gold / US Dollar',
    spec: {
      kind: 'metal',
      baseCurrency: 'XAU',
      quoteCurrency: 'USD',
      pipSize: GOLD_PIP_SIZE,
      contractSize: GOLD_CONTRACT_SIZE_OUNCES,
      brokerDependent: true,
      assumptionNote: GOLD_ASSUMPTION_NOTE,
    },
    unavailableReason: null,
  },
  unconfigured('XAGUSD', 'Silver / US Dollar'),
  unconfigured('US30', 'US Wall Street 30'),
  unconfigured('NAS100', 'US Tech 100'),
  unconfigured('SPX500', 'US 500'),
];

export function findInstrument(symbol: string): Instrument | null {
  return INSTRUMENTS.find((instrument) => instrument.symbol === symbol) ?? null;
}
