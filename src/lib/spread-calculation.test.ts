/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findInstrument } from '../constants/instruments';
import { calculationFingerprint } from './calculation-fingerprint';
import {
  parseStoredSettings,
  serializeSettings,
  withoutTradePreferences,
  type StoredCalculatorSettings,
} from './lot-settings';
import {
  presentPosition,
  SPREAD_ADJUSTED_DISCLOSURE,
  TRADING_RISK_DISCLOSURE,
} from './present-position';
import {
  calculatePosition,
  type PositionCalculationInput,
} from './trading-calculations';

const eurusd = findInstrument('EURUSD')!;
const usdjpy = findInstrument('USDJPY')!;
const gold = findInstrument('XAUUSD')!;

function near(actual: number, expected: number, epsilon = 1e-6): void {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} is not near ${expected}`);
}

function calculate(overrides: Partial<PositionCalculationInput> = {}) {
  return calculatePosition({
    instrument: eurusd,
    direction: 'buy',
    balance: 1000,
    riskMode: 'percent',
    riskValue: 2,
    entry: 1.085,
    stopLoss: 1.083,
    takeProfit: 1.089,
    accountCurrency: 'USD',
    minimumLot: 0.01,
    lotIncrement: 0.01,
    manualQuoteToAccountRate: 'empty',
    ...overrides,
  });
}

test('spread disabled preserves existing formulas and results exactly', () => {
  const result = calculate({
    spread: {
      enabled: false,
      value: 2.0,
      priceMode: 'chart',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.spreadAdjustment, null);
  near(result.stopDistance, 0.002);
  near(result.stopPips, 20);
  assert.equal(result.brokerLots, 0.1);
  near(result.actualLoss!, 20);
  near(result.reward!, 40);
  near(result.riskRewardRatio!, 2);

  const view = presentPosition(result);
  assert.equal(view.disclosure, TRADING_RISK_DISCLOSURE);
  assert.ok(view.metrics.some((m) => m.label === 'Stop distance' && m.value === '20 pips'));
  assert.ok(!view.metrics.some((m) => m.label === 'Chart stop distance'));
});

test('EURUSD buy with chart levels models Ask entry and Bid exit', () => {
  // Chart levels: entry 1.08500, SL 1.08300 (20 pips), TP 1.08900 (40 pips)
  // Spread: 2.0 pips (0.00020)
  // Ask entry = 1.08520, Bid SL = 1.08300 => effective stop = 22 pips (0.00220)
  // Bid TP = 1.08900 => effective reward = 1.08900 - 1.08520 = 38 pips (0.00380)
  const result = calculate({
    direction: 'buy',
    spread: {
      enabled: true,
      value: 2.0,
      priceMode: 'chart',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(result.spreadAdjustment !== null);
  assert.equal(result.spreadAdjustment.enabled, true);
  near(result.spreadAdjustment.spreadPips, 2.0);
  assert.equal(result.spreadAdjustment.priceMode, 'chart');
  near(result.spreadAdjustment.chartStopPips, 20);
  near(result.spreadAdjustment.effectiveStopPips, 22);
  near(result.spreadAdjustment.chartRewardPips!, 40);
  near(result.spreadAdjustment.effectiveRewardPips!, 38);
  near(result.spreadAdjustment.executedEntry, 1.0852);
  near(result.spreadAdjustment.executedStopLoss, 1.083);
  near(result.spreadAdjustment.executedTakeProfit!, 1.089);

  // Position sizing: $20 budget / (22 pips * 100,000 * 1 = $220/lot) = 0.090909 lots => 0.09 broker lots
  assert.equal(result.brokerLots, 0.09);
  near(result.actualLoss!, 0.09 * 220); // $19.80 <= $20 budget
  assert.ok(result.actualLoss! <= result.riskAmount);
  // Reward: 0.09 * 38 pips * 100,000 = $34.20
  near(result.reward!, 0.09 * 380);
  near(result.riskRewardRatio!, 34.2 / 19.8);

  // Presentation distinguishes chart stop, spread, and effective stop
  const view = presentPosition(result);
  assert.equal(view.disclosure, SPREAD_ADJUSTED_DISCLOSURE);
  assert.ok(view.metrics.some((m) => m.label === 'Chart stop distance' && m.value === '20 pips'));
  assert.ok(view.metrics.some((m) => m.label === 'Spread' && m.value === '2 pips'));
  assert.ok(view.metrics.some((m) => m.label === 'Effective stop distance' && m.value === '22 pips'));
  assert.match(view.note ?? '', /commission and slippage remain excluded/i);
});

test('EURUSD sell with chart levels models Bid entry and Ask exit', () => {
  // Chart levels: entry 1.08500, SL 1.08700 (20 pips), TP 1.08100 (40 pips)
  // Spread: 2.0 pips (0.00020)
  // Bid entry = 1.08500, Ask SL = 1.08720 => effective stop = 22 pips (0.00220)
  // Ask TP = 1.08120 => effective reward = 1.08500 - 1.08120 = 38 pips (0.00380)
  const result = calculate({
    direction: 'sell',
    entry: 1.085,
    stopLoss: 1.087,
    takeProfit: 1.081,
    spread: {
      enabled: true,
      value: 2.0,
      priceMode: 'chart',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(result.spreadAdjustment !== null);
  near(result.spreadAdjustment.chartStopPips, 20);
  near(result.spreadAdjustment.effectiveStopPips, 22);
  near(result.spreadAdjustment.chartRewardPips!, 40);
  near(result.spreadAdjustment.effectiveRewardPips!, 38);
  near(result.spreadAdjustment.executedEntry, 1.085);
  near(result.spreadAdjustment.executedStopLoss, 1.0872);
  near(result.spreadAdjustment.executedTakeProfit!, 1.0812);

  assert.equal(result.brokerLots, 0.09);
  near(result.actualLoss!, 0.09 * 220);
  assert.ok(result.actualLoss! <= result.riskAmount);
  near(result.reward!, 0.09 * 380);
});

test('executable price mode does not double-count spread', () => {
  // User enters actual executed prices: entry 1.08520, SL 1.08300, TP 1.08900
  // Spread = 2.0 pips already reflected
  const result = calculate({
    entry: 1.0852,
    stopLoss: 1.083,
    takeProfit: 1.089,
    spread: {
      enabled: true,
      value: 2.0,
      priceMode: 'executable',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(result.spreadAdjustment !== null);
  assert.equal(result.spreadAdjustment.priceMode, 'executable');
  // Distances are NOT adjusted further
  near(result.stopPips, 22);
  near(result.spreadAdjustment.effectiveStopPips, 22);
  near(result.spreadAdjustment.effectiveRewardPips!, 38);
  near(result.spreadAdjustment.executedEntry, 1.0852);
  near(result.spreadAdjustment.executedStopLoss, 1.083);

  const view = presentPosition(result);
  assert.ok(view.metrics.some((m) => m.label === 'Stop distance' && m.value === '22 pips'));
  assert.ok(view.metrics.some((m) => m.label === 'Spread' && m.value.includes('included in price')));
  assert.match(view.note ?? '', /not double-counted/i);
});

test('risk sizing never rounds up beyond the selected risk budget with spread included', () => {
  // If spread were ignored, 20-pip stop would give 0.10 lots with $20 risk.
  // With 2-pip spread, 0.10 lots risks 0.10 * 220 = $22.00 > $20.00!
  // Sizing must round down onto 0.01 step to 0.09 lots ($19.80 <= $20.00).
  const result = calculate({
    balance: 1000,
    riskMode: 'percent',
    riskValue: 2, // $20 risk
    entry: 1.085,
    stopLoss: 1.083,
    spread: {
      enabled: true,
      value: 2.0,
      priceMode: 'chart',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.brokerLots, 0.09);
  assert.ok(result.actualLoss !== null);
  assert.ok(result.actualLoss <= 20.0);
});

test('take-profit impact suppresses positive reward when effective target distance is zero or negative', () => {
  // Chart target distance is 2 pips (entry 1.08500, TP 1.08520)
  // Spread is 2.5 pips => effective reward distance = 2.0 - 2.5 = -0.5 pips <= 0
  const result = calculate({
    entry: 1.085,
    stopLoss: 1.083,
    takeProfit: 1.0852,
    spread: {
      enabled: true,
      value: 2.5,
      priceMode: 'chart',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.spreadAdjustment?.effectiveRewardDistance, null);
  assert.equal(result.reward, null);
  assert.equal(result.riskRewardRatio, null);
  assert.equal(result.takeProfitPips, null);

  const view = presentPosition(result);
  assert.equal(view.metrics.find((m) => m.label === 'Potential reward')?.value, '—');
  assert.equal(view.metrics.find((m) => m.label === 'Risk / reward')?.value, '—');
});

test('take-profit impact handles target distance exactly matching spread', () => {
  // Target 2 pips, Spread 2 pips => effective reward distance = 0 pips <= 0
  const result = calculate({
    entry: 1.085,
    stopLoss: 1.083,
    takeProfit: 1.0852,
    spread: {
      enabled: true,
      value: 2.0,
      priceMode: 'chart',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.reward, null);
  assert.equal(result.riskRewardRatio, null);
});

test('gold spread is accepted as USD price difference without borrowing forex pip', () => {
  // Gold 100-ounce contract, USD account
  // Entry: 2000, SL: 1990 (chart price distance: 10.00 USD)
  // Spread: 0.50 (USD price difference, not pips!)
  // Effective price distance = 10.00 + 0.50 = 10.50 USD
  const result = calculate({
    instrument: gold,
    balance: 10000,
    riskValue: 10, // $1000 risk
    entry: 2000,
    stopLoss: 1990,
    takeProfit: 2020,
    spread: {
      enabled: true,
      value: 0.5,
      priceMode: 'chart',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.ok(result.spreadAdjustment !== null);
  assert.equal(result.spreadAdjustment.spreadPrice, 0.5);
  assert.equal(result.spreadAdjustment.chartStopDistance, 10.0);
  assert.equal(result.spreadAdjustment.effectiveStopDistance, 10.5);
  // Loss per lot = 10.50 * 100 oz = $1050
  assert.equal(result.lossPerStandardLot, 1050);
  // Theoretical lots = 1000 / 1050 = 0.95238...
  // Broker lots (0.01 step) = 0.95 lots
  assert.equal(result.brokerLots, 0.95);
  assert.equal(result.actualLoss, 0.95 * 1050); // $997.50 <= $1000
  assert.ok(result.actualLoss! <= result.riskAmount);

  // Effective reward distance = (2020 - 2000) - 0.50 = 19.50 USD
  assert.equal(result.spreadAdjustment.effectiveRewardDistance, 19.5);
  // Reward = 0.95 * 19.50 * 100 = $1852.50
  assert.equal(result.reward, 0.95 * 19.5 * 100);

  const view = presentPosition(result);
  assert.ok(view.metrics.some((m) => m.label === 'Chart price distance' && m.value === '10.00 USD'));
  assert.ok(view.metrics.some((m) => m.label === 'Spread' && m.value === '0.50 USD'));
  assert.ok(view.metrics.some((m) => m.label === 'Effective price distance' && m.value === '10.50 USD'));
});

test('USDJPY forex pair converts spread using 0.01 pip convention', () => {
  // USDJPY pip is 0.01
  // Spread: 1.2 pips => spreadPrice = 0.012
  const result = calculate({
    instrument: usdjpy,
    direction: 'buy',
    balance: 1000,
    accountCurrency: 'USD',
    entry: 150.0,
    stopLoss: 149.0, // 100 pips
    takeProfit: 'empty',
    spread: {
      enabled: true,
      value: 1.2,
      priceMode: 'chart',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.spreadAdjustment?.spreadPips, 1.2);
  near(result.spreadAdjustment!.spreadPrice, 0.012);
  near(result.spreadAdjustment!.effectiveStopPips, 101.2);
});

test('broker lot increments step down properly with spread included', () => {
  // 0.001 increment allows tighter sizing than 0.01
  const result = calculate({
    minimumLot: 0.01,
    lotIncrement: 0.001,
    balance: 1000,
    riskValue: 2, // $20 risk
    entry: 1.085,
    stopLoss: 1.083,
    spread: {
      enabled: true,
      value: 2.0,
      priceMode: 'chart',
    },
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;

  // Theoretical lots: 20 / 220 = 0.090909...
  // With 0.001 step, brokerLots is 0.090
  assert.equal(result.brokerLots, 0.09);
});

test('edge cases: zero spread, empty spread, invalid spread, and huge spread', () => {
  // Zero spread: effective stop equals chart stop
  const zeroResult = calculate({
    spread: { enabled: true, value: 0, priceMode: 'chart' },
  });
  assert.equal(zeroResult.ok, true);
  if (zeroResult.ok) {
    near(zeroResult.spreadAdjustment!.effectiveStopPips, 20);
    assert.equal(zeroResult.brokerLots, 0.1);
  }

  // Empty spread: friendly validation requesting a spread value (no silent zero assumption)
  const emptyResult = calculate({
    spread: { enabled: true, value: 'empty', priceMode: 'chart' },
  });
  assert.equal(emptyResult.ok, false);
  if (!emptyResult.ok) {
    assert.ok(emptyResult.errors.some((e) => e.field === 'spread'));
    assert.match(emptyResult.errors.find((e) => e.field === 'spread')?.message ?? '', /enter your broker spread/i);
  }

  // Invalid spread: rejected safely
  const invalidResult = calculate({
    spread: { enabled: true, value: 'invalid', priceMode: 'chart' },
  });
  assert.equal(invalidResult.ok, false);
  if (!invalidResult.ok) {
    assert.ok(invalidResult.errors.some((e) => e.field === 'spread'));
  }

  // Negative spread: rejected safely
  const negativeResult = calculate({
    spread: { enabled: true, value: -1.5, priceMode: 'chart' },
  });
  assert.equal(negativeResult.ok, false);
  if (!negativeResult.ok) {
    assert.ok(negativeResult.errors.some((e) => e.field === 'spread'));
  }

  // Huge spread: safe calculation, position size falls below minimum lot
  const hugeResult = calculate({
    spread: { enabled: true, value: 10000, priceMode: 'chart' },
  });
  assert.equal(hugeResult.ok, true);
  if (hugeResult.ok) {
    assert.equal(hugeResult.brokerLots, null);
    const view = presentPosition(hugeResult);
    assert.equal(view.lotFits, false);
    assert.match(view.title, /minimum lot/i);
  }
});

test('instrument spreads persist and survive trade preference reset', () => {
  const settings: StoredCalculatorSettings = {
    currency: 'USD',
    minimumLotSize: '0.01',
    lotIncrement: '0.01',
    instrumentLots: {
      EURUSD: { minimumLot: '0.01', lotIncrement: '0.01' },
    },
    instrumentSpreads: {
      EURUSD: '1.5',
      XAUUSD: '0.35',
    },
    preferences: {
      instrument: 'EURUSD',
      balance: '1000',
      riskMode: 'percent',
      riskValue: '2',
      spreadEnabled: true,
      spreadPriceMode: 'chart',
    },
  };

  const serialized = serializeSettings(settings);
  const parsed = parseStoredSettings(serialized);
  assert.ok(parsed !== null);
  assert.deepEqual(parsed?.instrumentSpreads, {
    EURUSD: '1.5',
    XAUUSD: '0.35',
  });
  assert.equal(parsed?.preferences?.spreadEnabled, true);
  assert.equal(parsed?.preferences?.spreadPriceMode, 'chart');

  // Reset trade preferences preserves instrument spreads!
  const reset = withoutTradePreferences(parsed!);
  assert.deepEqual(reset.instrumentSpreads, {
    EURUSD: '1.5',
    XAUUSD: '0.35',
  });
});

test('calculation fingerprint updates on spread toggle, value, and mode change', () => {
  const base = calculationFingerprint({
    instrument: 'EURUSD',
    direction: 'buy',
    balance: '1000',
    riskMode: 'percent',
    riskValue: '2',
    entry: '1.08500',
    stopLoss: '1.08300',
    takeProfit: '1.08900',
    conversionRate: '',
    accountCurrency: 'USD',
    minimumLotSize: '0.01',
    lotIncrement: '0.01',
    lotSource: 'global',
    spreadEnabled: false,
    spreadValue: '',
    spreadPriceMode: 'chart',
  });

  const toggled = calculationFingerprint({
    instrument: 'EURUSD',
    direction: 'buy',
    balance: '1000',
    riskMode: 'percent',
    riskValue: '2',
    entry: '1.08500',
    stopLoss: '1.08300',
    takeProfit: '1.08900',
    conversionRate: '',
    accountCurrency: 'USD',
    minimumLotSize: '0.01',
    lotIncrement: '0.01',
    lotSource: 'global',
    spreadEnabled: true,
    spreadValue: '1.5',
    spreadPriceMode: 'chart',
  });

  const differentValue = calculationFingerprint({
    instrument: 'EURUSD',
    direction: 'buy',
    balance: '1000',
    riskMode: 'percent',
    riskValue: '2',
    entry: '1.08500',
    stopLoss: '1.08300',
    takeProfit: '1.08900',
    conversionRate: '',
    accountCurrency: 'USD',
    minimumLotSize: '0.01',
    lotIncrement: '0.01',
    lotSource: 'global',
    spreadEnabled: true,
    spreadValue: '2.0',
    spreadPriceMode: 'chart',
  });

  const executableMode = calculationFingerprint({
    instrument: 'EURUSD',
    direction: 'buy',
    balance: '1000',
    riskMode: 'percent',
    riskValue: '2',
    entry: '1.08500',
    stopLoss: '1.08300',
    takeProfit: '1.08900',
    conversionRate: '',
    accountCurrency: 'USD',
    minimumLotSize: '0.01',
    lotIncrement: '0.01',
    lotSource: 'global',
    spreadEnabled: true,
    spreadValue: '2.0',
    spreadPriceMode: 'executable',
  });

  assert.notEqual(base, toggled);
  assert.notEqual(toggled, differentValue);
  assert.notEqual(differentValue, executableMode);
});
