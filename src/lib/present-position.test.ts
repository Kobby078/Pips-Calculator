/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculationFingerprint } from './calculation-fingerprint';
import { markIndicativeConversion, presentPosition } from './present-position';
import { calculatePosition, type PositionCalculationInput } from './trading-calculations';
import { findInstrument } from '../constants/instruments';

const eurusd = findInstrument('EURUSD');
const gold = findInstrument('XAUUSD');

function presented(overrides: Partial<PositionCalculationInput> = {}) {
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
    ...overrides,
  });
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('expected a result to present');
  }
  return presentPosition(result);
}

function metric(rows: { label: string; value: string }[], label: string): string {
  const row = rows.find((item) => item.label === label);
  assert.ok(row, `missing ${label}`);
  return row.value;
}

test('the $1000 EURUSD case is labeled in USD with hundredths on the lot', () => {
  const view = presented();
  assert.equal(view.lotFits, true);
  assert.equal(view.recommendedLot, '0.10');
  assert.match(view.lotDetail, /lot step/);
  assert.equal(metric(view.metrics, 'Theoretical lots'), '0.10');
  assert.equal(
    view.metrics.some((row) => row.label === 'Broker lots'),
    false,
  );
  assert.equal(metric(view.metrics, 'Stop distance'), '20 pips');
  assert.equal(metric(view.metrics, 'Risk budget'), '20.00 USD');
  assert.equal(metric(view.metrics, 'Risk percentage'), '2%');
  assert.equal(metric(view.metrics, 'Estimated loss'), '20.00 USD');
  assert.equal(metric(view.metrics, 'Potential reward'), '40.00 USD');
  assert.equal(metric(view.metrics, 'Risk / reward'), '1 : 2');
  assert.equal(view.warning, null);
  assert.equal(metric(view.summary, 'Quote to account'), 'USD matches the quote currency');
});

test('gold shows the USD price distance and the broker-dependent contract note', () => {
  const view = presented({
    instrument: gold,
    balance: 10000,
    riskValue: 10,
    entry: 2000,
    stopLoss: 1990,
    takeProfit: 'empty',
  });
  assert.equal(metric(view.metrics, 'Price distance'), '10.00 USD');
  assert.equal(metric(view.metrics, 'Estimated loss'), '1000.00 USD');
  assert.equal(
    view.metrics.some((row) => row.label === 'Stop distance'),
    false,
  );
  assert.match(view.note ?? '', /100 troy ounces/);
  assert.match(view.note ?? '', /broker/i);
  assert.match(view.note ?? '', /USD price distance/);
});

test('an applied reference conversion is labeled as indicative', () => {
  const view = presented({
    accountCurrency: 'CHF',
    manualQuoteToAccountRate: 0.82,
  });
  const marked = markIndicativeConversion(view.summary);
  assert.match(metric(marked, 'Quote to account'), /indicative reference rate/);
  assert.match(metric(view.summary, 'Quote to account'), /entered rate/);
});

test('a $100 1% EURUSD position shows 0.005 lots and about $2 at the minimum', () => {
  const view = presented({
    balance: 100,
    riskValue: 1,
    entry: 1.1,
    stopLoss: 1.098,
    takeProfit: 'empty',
  });
  assert.equal(view.lotFits, false);
  assert.equal(view.recommendedLot, null);
  assert.equal(metric(view.metrics, 'Theoretical lots'), '0.005');
  assert.equal(
    view.metrics.some((row) => row.value === '0.01' || row.value === 'None'),
    false,
  );
  assert.equal(metric(view.metrics, 'Risk budget'), '1.00 USD');
  assert.equal(metric(view.metrics, 'Estimated loss'), '—');
  assert.equal(metric(view.metrics, 'Potential reward'), '—');
  assert.match(view.title, /minimum lot/);
  assert.match(view.lotDetail, /0\.01 lots/);
  assert.match(view.lotDetail, /2\.00 USD/);
  assert.match(view.lotDetail, /1\.00 USD/);
});

test('rounding down keeps the risk budget separate from the estimated loss', () => {
  const view = presented({
    balance: 1000,
    riskMode: 'amount',
    riskValue: 3.08,
    entry: 1.1,
    stopLoss: 1.098,
    takeProfit: 'empty',
    minimumLot: 0.01,
    lotIncrement: 0.001,
  });
  assert.equal(view.recommendedLot, '0.015');
  assert.equal(metric(view.metrics, 'Theoretical lots'), '0.0154');
  assert.equal(metric(view.metrics, 'Risk budget'), '3.08 USD');
  assert.equal(metric(view.metrics, 'Estimated loss'), '3.00 USD');
  assert.equal(metric(view.metrics, 'Potential reward'), '—');
});

test('changing account currency, minimum lot, or increment marks a result stale without rewriting the balance', () => {
  const balance = '1000';
  const base = calculationFingerprint({
    instrument: 'EURUSD',
    direction: 'buy',
    balance,
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
  });

  assert.notEqual(
    base,
    calculationFingerprint({
      instrument: 'EURUSD',
      direction: 'buy',
      balance,
      riskMode: 'percent',
      riskValue: '2',
      entry: '1.08500',
      stopLoss: '1.08300',
      takeProfit: '1.08900',
      conversionRate: '',
      accountCurrency: 'EUR',
      minimumLotSize: '0.01',
      lotIncrement: '0.01',
      lotSource: 'global',
    }),
  );
  assert.notEqual(
    base,
    calculationFingerprint({
      instrument: 'EURUSD',
      direction: 'buy',
      balance,
      riskMode: 'percent',
      riskValue: '2',
      entry: '1.08500',
      stopLoss: '1.08300',
      takeProfit: '1.08900',
      conversionRate: '',
      accountCurrency: 'USD',
      minimumLotSize: '0.10',
      lotIncrement: '0.01',
      lotSource: 'global',
    }),
  );
  assert.notEqual(
    base,
    calculationFingerprint({
      instrument: 'EURUSD',
      direction: 'buy',
      balance,
      riskMode: 'percent',
      riskValue: '2',
      entry: '1.08500',
      stopLoss: '1.08300',
      takeProfit: '1.08900',
      conversionRate: '',
      accountCurrency: 'USD',
      minimumLotSize: '0.01',
      lotIncrement: '0.02',
      lotSource: 'global',
    }),
  );
  assert.notEqual(
    base,
    calculationFingerprint({
      instrument: 'EURUSD',
      direction: 'buy',
      balance,
      riskMode: 'amount',
      riskValue: '20',
      entry: '1.08500',
      stopLoss: '1.08300',
      takeProfit: '1.08900',
      conversionRate: '',
      accountCurrency: 'USD',
      minimumLotSize: '0.01',
      lotIncrement: '0.01',
      lotSource: 'global',
    }),
  );
  assert.notEqual(
    base,
    calculationFingerprint({
      instrument: 'EURUSD',
      direction: 'buy',
      balance,
      riskMode: 'percent',
      riskValue: '2',
      entry: '1.09000',
      stopLoss: '1.08300',
      takeProfit: '1.08900',
      conversionRate: '',
      accountCurrency: 'USD',
      minimumLotSize: '0.01',
      lotIncrement: '0.01',
      lotSource: 'global',
    }),
  );
  assert.equal(balance, '1000');
});
