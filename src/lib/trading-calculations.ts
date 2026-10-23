import type { Instrument, InstrumentSpec } from '../constants/instruments';

/** Human-facing percent points. 1 means 1%, matching balance * percent / 100. */
export const RISK_WARNING_THRESHOLDS = {
  elevatedAbovePercent: 2,
  highAbovePercent: 5,
} as const;

export type TradeDirection = 'buy' | 'sell';
export type RiskInputMode = 'percent' | 'amount';
export type NumericField = number | 'empty' | 'invalid';

export type CalculationField =
  | 'instrument'
  | 'balance'
  | 'risk'
  | 'entry'
  | 'stopLoss'
  | 'takeProfit'
  | 'lots'
  | 'conversion';

export type CalculationError = {
  field: CalculationField;
  message: string;
};

export type ConversionSource = 'quote-currency' | 'base-price' | 'manual';

export type RiskWarningLevel = 'elevated' | 'high' | 'extreme';

export type RiskWarning = {
  level: RiskWarningLevel;
  message: string;
};

export type PositionCalculationInput = {
  instrument: Instrument | null;
  direction: TradeDirection;
  balance: NumericField;
  riskMode: RiskInputMode;
  riskValue: NumericField;
  entry: NumericField;
  stopLoss: NumericField;
  /** Empty means the optional target was left blank. */
  takeProfit: NumericField;
  accountCurrency: string;
  minimumLot: NumericField;
  lotIncrement: NumericField;
  /** Used only when the quote currency cannot be converted from the instrument. */
  manualQuoteToAccountRate: NumericField;
};

export type PositionCalculationSuccess = {
  ok: true;
  symbol: string;
  direction: TradeDirection;
  accountCurrency: string;
  quoteCurrency: string;
  riskAmount: number;
  riskPercent: number;
  stopDistance: number;
  stopPips: number;
  quoteToAccountRate: number;
  conversionSource: ConversionSource;
  lossPerStandardLot: number;
  theoreticalLots: number;
  brokerLots: number | null;
  minimumLot: number;
  minimumPositionRisk: number;
  actualLoss: number | null;
  reward: number | null;
  riskRewardRatio: number | null;
  takeProfitPips: number | null;
  warning: RiskWarning | null;
  assumptionNote: string | null;
};

export type PositionCalculationFailure = {
  ok: false;
  errors: CalculationError[];
};

export type PositionCalculationResult = PositionCalculationSuccess | PositionCalculationFailure;

const LOT_UNIT_EPSILON = 1e-6;

export function cashRiskFromPercent(balance: number, riskPercent: number): number {
  return (balance * riskPercent) / 100;
}

export function percentFromCashRisk(balance: number, riskAmount: number): number {
  return (riskAmount / balance) * 100;
}

/** Trim a positive number for a text field after a risk-mode switch. */
export function formatRiskInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  return value
    .toFixed(8)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

export function requiresManualConversion(
  spec: InstrumentSpec | null,
  accountCurrency: string,
): boolean {
  if (!spec) {
    return false;
  }
  if (accountCurrency === spec.quoteCurrency) {
    return false;
  }
  if (spec.kind === 'forex' && accountCurrency === spec.baseCurrency) {
    return false;
  }
  return true;
}

export function riskWarning(riskPercent: number, riskAmount: number, balance: number): RiskWarning | null {
  if (riskAmount > balance) {
    return {
      level: 'extreme',
      message: 'This risk is larger than the account balance. The position is still sized from the numbers you entered.',
    };
  }
  if (riskPercent > RISK_WARNING_THRESHOLDS.highAbovePercent) {
    return {
      level: 'high',
      message: `Risk above ${RISK_WARNING_THRESHOLDS.highAbovePercent}% is high. The position is still sized from the numbers you entered.`,
    };
  }
  if (riskPercent > RISK_WARNING_THRESHOLDS.elevatedAbovePercent) {
    return {
      level: 'elevated',
      message: `Risk above ${RISK_WARNING_THRESHOLDS.elevatedAbovePercent}% is elevated. The position is still sized from the numbers you entered.`,
    };
  }
  return null;
}

/**
 * Largest lot that is at least the minimum, steps by the increment from that minimum,
 * and does not exceed the theoretical size.
 */
export function floorToLotIncrement(
  theoreticalLots: number,
  minimumLot: number,
  lotIncrement: number,
): number | null {
  if (!isPositiveFinite(theoreticalLots) || !isPositiveFinite(minimumLot) || !isPositiveFinite(lotIncrement)) {
    return null;
  }

  const scale = 10 ** Math.max(decimalPlaces(minimumLot), decimalPlaces(lotIncrement));
  const theoreticalUnits = Math.floor(theoreticalLots * scale + LOT_UNIT_EPSILON);
  const minimumUnits = Math.round(minimumLot * scale);
  const incrementUnits = Math.round(lotIncrement * scale);
  if (minimumUnits <= 0 || incrementUnits <= 0 || theoreticalUnits < minimumUnits) {
    return null;
  }

  const steps = Math.floor((theoreticalUnits - minimumUnits) / incrementUnits);
  const lotUnits = minimumUnits + steps * incrementUnits;
  if (lotUnits > theoreticalUnits) {
    return null;
  }
  return lotUnits / scale;
}

export function calculatePosition(input: PositionCalculationInput): PositionCalculationResult {
  const errors: CalculationError[] = [];
  const spec = input.instrument?.spec ?? null;

  if (!input.instrument) {
    errors.push({ field: 'instrument', message: 'Select an instrument.' });
  } else if (!spec || !(spec.pipSize > 0) || !(spec.contractSize > 0)) {
    errors.push({
      field: 'instrument',
      message:
        input.instrument.unavailableReason ??
        'This instrument has no contract size or pip size configured, so no position size is calculated.',
    });
  }

  const balance = readRequired(input.balance, 'balance', 'Enter an account balance greater than zero.', errors);
  const riskValue = readRequired(
    input.riskValue,
    'risk',
    input.riskMode === 'percent'
      ? 'Enter a risk percentage greater than zero.'
      : 'Enter a risk amount greater than zero.',
    errors,
  );
  const entry = readRequired(input.entry, 'entry', 'Enter an entry price greater than zero.', errors);
  const stopLoss = readRequired(input.stopLoss, 'stopLoss', 'Enter a stop loss greater than zero.', errors);
  const takeProfit = readOptionalTakeProfit(input.takeProfit, errors);
  const minimumLot = readRequired(
    input.minimumLot,
    'lots',
    'Enter a minimum lot size greater than zero in Settings.',
    errors,
  );
  const lotIncrement = readRequired(
    input.lotIncrement,
    'lots',
    'Enter a lot increment greater than zero in Settings.',
    errors,
  );

  if (entry !== null && stopLoss !== null) {
    validateStop(input.direction, entry, stopLoss, errors);
  }
  if (entry !== null && takeProfit !== null) {
    validateTarget(input.direction, entry, takeProfit, errors);
  }

  const manualRate = resolveManualRate(spec, input, errors);

  if (
    errors.length > 0 ||
    !spec ||
    balance === null ||
    riskValue === null ||
    entry === null ||
    stopLoss === null ||
    minimumLot === null ||
    lotIncrement === null
  ) {
    return { ok: false, errors: uniqueErrors(errors) };
  }

  const conversion = quoteToAccountRate(spec, input.accountCurrency, entry, manualRate);
  if (!conversion.ok) {
    return { ok: false, errors: [conversion.error] };
  }

  const riskAmount =
    input.riskMode === 'percent' ? cashRiskFromPercent(balance, riskValue) : riskValue;
  const riskPercent =
    input.riskMode === 'percent' ? riskValue : percentFromCashRisk(balance, riskValue);
  const stopDistance = Math.abs(entry - stopLoss);
  const stopPips = stopDistance / spec.pipSize;
  const lossPerStandardLot = stopDistance * spec.contractSize * conversion.rate;
  const finiteCore = [riskAmount, riskPercent, stopDistance, stopPips, lossPerStandardLot, conversion.rate];

  if (stopDistance <= 0 || finiteCore.some((value) => !Number.isFinite(value) || value < 0)) {
    return {
      ok: false,
      errors: [{ field: 'stopLoss', message: 'Entry and stop loss must produce a finite stop distance.' }],
    };
  }
  if (lossPerStandardLot <= 0) {
    return {
      ok: false,
      errors: [{ field: 'stopLoss', message: 'The stop distance does not produce a loss per lot.' }],
    };
  }

  const theoreticalLots = riskAmount / lossPerStandardLot;
  const brokerLots = lotWithinRisk(
    floorToLotIncrement(theoreticalLots, minimumLot, lotIncrement),
    theoreticalLots,
    minimumLot,
    lotIncrement,
    lossPerStandardLot,
    riskAmount,
  );
  const minimumPositionRisk = minimumLot * lossPerStandardLot;
  const actualLoss = brokerLots === null ? null : brokerLots * lossPerStandardLot;
  const target = monetaryTarget(spec, takeProfit, entry, brokerLots, actualLoss, conversion.rate);

  const success: PositionCalculationSuccess = {
    ok: true,
    symbol: input.instrument?.symbol ?? spec.baseCurrency + spec.quoteCurrency,
    direction: input.direction,
    accountCurrency: input.accountCurrency,
    quoteCurrency: spec.quoteCurrency,
    riskAmount,
    riskPercent,
    stopDistance,
    stopPips,
    quoteToAccountRate: conversion.rate,
    conversionSource: conversion.source,
    lossPerStandardLot,
    theoreticalLots,
    brokerLots,
    minimumLot,
    minimumPositionRisk,
    actualLoss,
    reward: target.reward,
    riskRewardRatio: target.riskRewardRatio,
    takeProfitPips: target.takeProfitPips,
    warning: riskWarning(riskPercent, riskAmount, balance),
    assumptionNote: spec.assumptionNote ?? null,
  };

  if (!successNumbersAreFinite(success)) {
    return {
      ok: false,
      errors: [{ field: 'entry', message: 'These prices cannot be turned into a finite position size.' }],
    };
  }

  return success;
}

function lotWithinRisk(
  brokerLots: number | null,
  theoreticalLots: number,
  minimumLot: number,
  lotIncrement: number,
  lossPerStandardLot: number,
  riskAmount: number,
): number | null {
  let lots = brokerLots;
  while (lots !== null && lotsExceedRisk(lots, lossPerStandardLot, riskAmount)) {
    const reduced = floorToLotIncrement(lots - lotIncrement, minimumLot, lotIncrement);
    lots = reduced !== null && reduced < lots ? reduced : null;
  }
  if (lots !== null && lots > theoreticalLots + 1e-8) {
    return null;
  }
  return lots;
}

function lotsExceedRisk(lots: number, lossPerStandardLot: number, riskAmount: number): boolean {
  const projected = lots * lossPerStandardLot;
  return projected > riskAmount + Math.max(1e-8, riskAmount * 1e-8);
}

function monetaryTarget(
  spec: InstrumentSpec,
  takeProfit: number | null,
  entry: number,
  brokerLots: number | null,
  actualLoss: number | null,
  rate: number,
): { reward: number | null; riskRewardRatio: number | null; takeProfitPips: number | null } {
  if (takeProfit === null || brokerLots === null || actualLoss === null || actualLoss <= 0) {
    return { reward: null, riskRewardRatio: null, takeProfitPips: null };
  }
  const rewardDistance = Math.abs(takeProfit - entry);
  const reward = brokerLots * rewardDistance * spec.contractSize * rate;
  if (!Number.isFinite(reward) || reward < 0) {
    return { reward: null, riskRewardRatio: null, takeProfitPips: null };
  }
  return {
    reward,
    riskRewardRatio: reward / actualLoss,
    takeProfitPips: rewardDistance / spec.pipSize,
  };
}

function quoteToAccountRate(
  spec: InstrumentSpec,
  accountCurrency: string,
  entry: number,
  manualRate: number | null,
):
  | { ok: true; rate: number; source: ConversionSource }
  | { ok: false; error: CalculationError } {
  if (accountCurrency === spec.quoteCurrency) {
    return { ok: true, rate: 1, source: 'quote-currency' };
  }
  if (spec.kind === 'forex' && accountCurrency === spec.baseCurrency) {
    return { ok: true, rate: 1 / entry, source: 'base-price' };
  }
  if (manualRate === null) {
    return {
      ok: false,
      error: {
        field: 'conversion',
        message: `Enter how many ${accountCurrency} equal 1 ${spec.quoteCurrency}.`,
      },
    };
  }
  return { ok: true, rate: manualRate, source: 'manual' };
}

function resolveManualRate(
  spec: InstrumentSpec | null,
  input: PositionCalculationInput,
  errors: CalculationError[],
): number | null {
  if (!spec || !requiresManualConversion(spec, input.accountCurrency)) {
    return null;
  }
  return readRequired(
    input.manualQuoteToAccountRate,
    'conversion',
    `Enter how many ${input.accountCurrency} equal 1 ${spec.quoteCurrency}.`,
    errors,
  );
}

function validateStop(
  direction: TradeDirection,
  entry: number,
  stopLoss: number,
  errors: CalculationError[],
): void {
  if (entry === stopLoss) {
    errors.push({ field: 'stopLoss', message: 'Stop loss must be different from the entry price.' });
    return;
  }
  if (direction === 'buy' && stopLoss > entry) {
    errors.push({ field: 'stopLoss', message: 'For a buy, the stop loss must be below the entry price.' });
  }
  if (direction === 'sell' && stopLoss < entry) {
    errors.push({ field: 'stopLoss', message: 'For a sell, the stop loss must be above the entry price.' });
  }
}

function validateTarget(
  direction: TradeDirection,
  entry: number,
  takeProfit: number,
  errors: CalculationError[],
): void {
  if (direction === 'buy' && takeProfit <= entry) {
    errors.push({
      field: 'takeProfit',
      message: 'For a buy, take profit must be above the entry price.',
    });
  }
  if (direction === 'sell' && takeProfit >= entry) {
    errors.push({
      field: 'takeProfit',
      message: 'For a sell, take profit must be below the entry price.',
    });
  }
}

function readOptionalTakeProfit(value: NumericField, errors: CalculationError[]): number | null {
  if (value === 'empty') {
    return null;
  }
  if (value === 'invalid' || !isPositiveFinite(value)) {
    errors.push({
      field: 'takeProfit',
      message: 'Enter a take profit greater than zero, or leave it blank.',
    });
    return null;
  }
  return value;
}

function readRequired(
  value: NumericField,
  field: CalculationField,
  message: string,
  errors: CalculationError[],
): number | null {
  if (typeof value === 'number' && isPositiveFinite(value)) {
    return value;
  }
  errors.push({ field, message });
  return null;
}

function uniqueErrors(errors: CalculationError[]): CalculationError[] {
  const seen = new Set<string>();
  return errors.filter((error) => {
    const key = `${error.field}:${error.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function successNumbersAreFinite(result: PositionCalculationSuccess): boolean {
  const values = [
    result.riskAmount,
    result.riskPercent,
    result.stopDistance,
    result.stopPips,
    result.quoteToAccountRate,
    result.lossPerStandardLot,
    result.theoreticalLots,
    result.minimumPositionRisk,
    result.actualLoss,
    result.reward,
    result.riskRewardRatio,
    result.takeProfitPips,
    result.brokerLots,
  ];
  return values.every((value) => value === null || (Number.isFinite(value) && value >= 0));
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function decimalPlaces(value: number): number {
  const text = value.toString().toLowerCase();
  if (text.includes('e-')) {
    const [coefficient, exponent] = text.split('e-');
    const fraction = coefficient.split('.')[1]?.length ?? 0;
    return fraction + Number(exponent);
  }
  return text.split('.')[1]?.length ?? 0;
}
