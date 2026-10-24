export type CalculationFingerprintInput = {
  instrument: string | null;
  direction: string;
  balance: string;
  riskMode: string;
  riskValue: string;
  entry: string;
  stopLoss: string;
  takeProfit: string;
  conversionRate: string;
  accountCurrency: string;
  minimumLotSize: string;
  lotIncrement: string;
  lotSource: string;
};

/** Identity of the inputs behind a result. A new value means the shown result is stale. */
export function calculationFingerprint(input: CalculationFingerprintInput): string {
  return [
    input.instrument,
    input.direction,
    input.balance,
    input.riskMode,
    input.riskValue,
    input.entry,
    input.stopLoss,
    input.takeProfit,
    input.conversionRate,
    input.accountCurrency,
    input.minimumLotSize,
    input.lotIncrement,
    input.lotSource,
  ].join('|');
}
