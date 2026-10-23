export type Instrument = {
  symbol: string;
  name: string;
};

/** Static instrument names only. These are not quotes and carry no prices. */
export const INSTRUMENTS: readonly Instrument[] = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar' },
  { symbol: 'XAUUSD', name: 'Gold / US Dollar' },
  { symbol: 'XAGUSD', name: 'Silver / US Dollar' },
  { symbol: 'US30', name: 'US Wall Street 30' },
  { symbol: 'NAS100', name: 'US Tech 100' },
  { symbol: 'SPX500', name: 'US 500' },
];
