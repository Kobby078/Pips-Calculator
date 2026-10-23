/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculationFingerprint } from './calculation-fingerprint';
import { markIndicativeConversion, presentPosition } from './present-position';
import { calculatePosition, type PositionCalculationInput } from './trading-calculations';
import { findInstrument } from '../constants/instruments';

const eurusd = findInstrument('EURUSD');

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
  assert.equal(metric(view.metrics, 'Theoretical lots'), '0.10');
  assert.equal(metric(view.metrics, 'Broker lots'), '0.10');
  assert.equal(metric(view.metrics, 'Stop distance'), '20 pips');
  assert.equal(metric(view.metrics, 'Cash risk'), '20.00 USD');
  assert.equal(metric(view.metrics, 'Risk percentage'), '2%');
  assert.equal(metric(view.metrics, 'Estimated loss'), '20.00 USD');
  assert.equal(metric(view.metrics, 'Potential reward'), '40.00 USD');
  assert.equal(metric(view.metrics, 'Risk / reward'), '1 : 2');
  assert.equal(view.warning, null);
  assert.equal(metric(view.summary, 'Quote to account'), 'USD matches the quote currency');
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
  assert.equal(metric(view.metrics, 'Theoretical lots'), '0.005');
  assert.equal(metric(view.metrics, 'Broker lots'), 'None');
  assert.equal(metric(view.metrics, 'Cash risk'), '1.00 USD');
  assert.equal(metric(view.metrics, 'Estimated loss'), '—');
  assert.equal(metric(view.metrics, 'Potential reward'), '—');
  assert.match(view.body, /0\.01 lots/);
  assert.match(view.body, /2\.00 USD/);
  assert.match(view.body, /1\.00 USD/);
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
    }),
  );
  assert.equal(balance, '1000');
});
