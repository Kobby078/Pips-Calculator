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
import { calculatePosition } from './trading-calculations';

const eurusd = findInstrument('EURUSD')!;
const gold = findInstrument('XAUUSD')!;

test('help preference defaults to off for new users and round-trips when persisted', () => {
  // New user settings without showHelpExplanations
  const initial = parseStoredSettings(JSON.stringify({ currency: 'USD' }));
  assert.ok(initial !== null);
  assert.equal(initial?.showHelpExplanations, undefined);

  // Stored with showHelpExplanations: true
  const storedOn: StoredCalculatorSettings = {
    currency: 'USD',
    minimumLotSize: '0.01',
    lotIncrement: '0.01',
    instrumentLots: {},
    showHelpExplanations: true,
  };
  const parsedOn = parseStoredSettings(serializeSettings(storedOn));
  assert.equal(parsedOn?.showHelpExplanations, true);

  // Stored with showHelpExplanations: false
  const storedOff: StoredCalculatorSettings = {
    currency: 'USD',
    minimumLotSize: '0.01',
    lotIncrement: '0.01',
    instrumentLots: {},
    showHelpExplanations: false,
  };
  const parsedOff = parseStoredSettings(serializeSettings(storedOff));
  assert.equal(parsedOff?.showHelpExplanations, false);
});

test('resetting trade preferences preserves showHelpExplanations display preference', () => {
  const settings: StoredCalculatorSettings = {
    currency: 'EUR',
    minimumLotSize: '0.01',
    lotIncrement: '0.01',
    instrumentLots: {
      EURUSD: { minimumLot: '0.02', lotIncrement: '0.01' },
    },
    instrumentSpreads: {
      EURUSD: '1.2',
    },
    appearance: 'dark',
    showHelpExplanations: true,
    preferences: {
      instrument: 'EURUSD',
      balance: '5000',
      riskMode: 'percent',
      riskValue: '1.5',
      spreadEnabled: true,
      spreadPriceMode: 'chart',
    },
  };

  const reset = withoutTradePreferences(settings);
  // Trade preferences cleared
  assert.equal(reset.preferences?.instrument, null);
  assert.equal(reset.preferences?.balance, '');
  assert.equal(reset.preferences?.riskValue, '');

  // Display, broker, and appearance settings remain intact
  assert.equal(reset.showHelpExplanations, true);
  assert.equal(reset.appearance, 'dark');
  assert.equal(reset.currency, 'EUR');
  assert.deepEqual(reset.instrumentLots, {
    EURUSD: { minimumLot: '0.02', lotIncrement: '0.01' },
  });
  assert.deepEqual(reset.instrumentSpreads, {
    EURUSD: '1.2',
  });
});

test('spread enabled with missing or empty value produces friendly validation error', () => {
  const result = calculatePosition({
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
    spread: {
      enabled: true,
      value: 'empty', // user turned spread on but hasn't entered a value yet
      priceMode: 'chart',
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    const spreadError = result.errors.find((e) => e.field === 'spread');
    assert.ok(spreadError !== undefined, 'Expected a validation error on spread field');
    assert.match(spreadError!.message, /enter your broker spread/i);
  }
});

test('spread enabled with explicit zero spread is allowed and calculates accurately', () => {
  const result = calculatePosition({
    instrument: eurusd,
    direction: 'buy',
    balance: 1000,
    riskMode: 'percent',
    riskValue: 2, // $20 risk
    entry: 1.085,
    stopLoss: 1.083, // 20 pips
    takeProfit: 1.089, // 40 pips
    accountCurrency: 'USD',
    minimumLot: 0.01,
    lotIncrement: 0.01,
    manualQuoteToAccountRate: 'empty',
    spread: {
      enabled: true,
      value: 0, // explicit zero spread
      priceMode: 'chart',
    },
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.spreadAdjustment?.enabled, true);
    assert.equal(result.spreadAdjustment?.spreadValue, 0);
    assert.equal(result.brokerLots, 0.1);
    assert.ok(Math.abs(result.actualLoss! - 20) < 1e-6);
    assert.ok(Math.abs(result.reward! - 40) < 1e-6);
  }
});

test('spread changes invalidate calculation fingerprint to prevent stale results', () => {
  const baseParams = {
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
  };

  const initialFp = calculationFingerprint({
    ...baseParams,
    spreadEnabled: false,
    spreadValue: '',
    spreadPriceMode: 'chart',
  });

  const enabledFp = calculationFingerprint({
    ...baseParams,
    spreadEnabled: true,
    spreadValue: '1.5',
    spreadPriceMode: 'chart',
  });

  const changedValueFp = calculationFingerprint({
    ...baseParams,
    spreadEnabled: true,
    spreadValue: '2.0',
    spreadPriceMode: 'chart',
  });

  const changedModeFp = calculationFingerprint({
    ...baseParams,
    spreadEnabled: true,
    spreadValue: '2.0',
    spreadPriceMode: 'executable',
  });

  assert.notEqual(initialFp, enabledFp);
  assert.notEqual(enabledFp, changedValueFp);
  assert.notEqual(changedValueFp, changedModeFp);
});

test('calculation invariants: risk sizing never exceeds risk budget and target distance friction', () => {
  // Test invariant 1: Broker lot loss NEVER exceeds the cash risk budget
  const forexResult = calculatePosition({
    instrument: eurusd,
    direction: 'buy',
    balance: 500,
    riskMode: 'percent',
    riskValue: 1.5, // $7.50 budget
    entry: 1.085,
    stopLoss: 1.083, // 20 pips chart + 1.8 pips spread = 21.8 pips ($218/lot)
    takeProfit: 1.09,
    accountCurrency: 'USD',
    minimumLot: 0.01,
    lotIncrement: 0.01,
    manualQuoteToAccountRate: 'empty',
    spread: { enabled: true, value: 1.8, priceMode: 'chart' },
  });

  assert.equal(forexResult.ok, true);
  if (forexResult.ok) {
    // Theoretical: 7.50 / 218 = 0.0344 lots -> 0.03 broker lots ($6.54 loss)
    assert.equal(forexResult.brokerLots, 0.03);
    assert.ok(forexResult.actualLoss! <= forexResult.riskAmount);
  }

  // Test invariant 2: Gold (XAUUSD) spread in USD price difference
  const goldResult = calculatePosition({
    instrument: gold,
    direction: 'sell',
    balance: 10000,
    riskMode: 'percent',
    riskValue: 5, // $500 budget
    entry: 2000,
    stopLoss: 2005, // $5 chart stop + $0.40 spread = $5.40 effective distance
    takeProfit: 1990,
    accountCurrency: 'USD',
    minimumLot: 0.01,
    lotIncrement: 0.01,
    manualQuoteToAccountRate: 'empty',
    spread: { enabled: true, value: 0.4, priceMode: 'chart' },
  });

  assert.equal(goldResult.ok, true);
  if (goldResult.ok) {
    // Loss per lot: 5.40 * 100 oz = $540/lot. Budget: $500.
    // 500 / 540 = 0.9259 lots -> 0.92 broker lots ($496.80 <= $500)
    assert.equal(goldResult.brokerLots, 0.92);
    assert.ok(goldResult.actualLoss! <= goldResult.riskAmount);
  }
});
