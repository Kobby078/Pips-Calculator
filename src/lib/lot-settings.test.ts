/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calculationFingerprint } from './calculation-fingerprint';
import {
  describeVolumeGrid,
  lotSettingsSummary,
  parseStoredSettings,
  resolveLotSettings,
  serializeSettings,
  type StoredCalculatorSettings,
} from './lot-settings';
import { calculatePosition } from './trading-calculations';
import { findInstrument } from '../constants/instruments';

const eurusd = findInstrument('EURUSD');

test('EURUSD keeps 0.01 minimum and increment, and 0.001 allows the smaller size', () => {
  const standard = calculatePosition({
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
  });
  assert.equal(standard.ok, true);
  if (standard.ok) {
    assert.equal(standard.brokerLots, 0.1);
    assert.ok(Math.abs(standard.theoreticalLots - 0.1) < 1e-8);
  }

  const micro = calculatePosition({
    instrument: eurusd,
    direction: 'buy',
    balance: 100,
    riskMode: 'percent',
    riskValue: 1,
    entry: 1.1,
    stopLoss: 1.098,
    takeProfit: 'empty',
    accountCurrency: 'USD',
    minimumLot: 0.001,
    lotIncrement: 0.001,
    manualQuoteToAccountRate: 'empty',
  });
  assert.equal(micro.ok, true);
  if (micro.ok) {
    assert.ok(Math.abs(micro.theoreticalLots - 0.005) < 1e-8);
    assert.equal(micro.brokerLots, 0.005);
    assert.ok(micro.actualLoss !== null && micro.actualLoss <= micro.riskAmount + 1e-8);
  }
});

test('a 0.01 minimum with a 0.001 step rounds down and reports the minimum risk', () => {
  const sized = calculatePosition({
    instrument: eurusd,
    direction: 'buy',
    balance: 1000,
    riskMode: 'amount',
    riskValue: 3.08,
    entry: 1.1,
    stopLoss: 1.098,
    takeProfit: 'empty',
    accountCurrency: 'USD',
    minimumLot: 0.01,
    lotIncrement: 0.001,
    manualQuoteToAccountRate: 'empty',
  });
  assert.equal(sized.ok, true);
  if (sized.ok) {
    assert.ok(Math.abs(sized.theoreticalLots - 0.0154) < 1e-8);
    assert.equal(sized.brokerLots, 0.015);
    assert.ok(sized.actualLoss !== null && sized.actualLoss <= sized.riskAmount + 1e-8);
  }

  const below = calculatePosition({
    instrument: eurusd,
    direction: 'buy',
    balance: 100,
    riskMode: 'percent',
    riskValue: 1,
    entry: 1.1,
    stopLoss: 1.098,
    takeProfit: 'empty',
    accountCurrency: 'USD',
    minimumLot: 0.01,
    lotIncrement: 0.001,
    manualQuoteToAccountRate: 'empty',
  });
  assert.equal(below.ok, true);
  if (below.ok) {
    assert.equal(below.brokerLots, null);
    assert.ok(Math.abs(below.minimumPositionRisk - 2) < 1e-8);
    assert.ok(below.theoreticalLots < below.minimumLot);
  }
});

test('volume grids flag incompatible steps and leave differing pairs unverified', () => {
  const matched = describeVolumeGrid('0.001', '0.001');
  assert.equal(matched.kind, 'matched');
  assert.deepEqual(matched.samples, ['0.001', '0.002', '0.003']);
  assert.match(matched.message, /Confirm this pair with your broker/);

  const unverified = describeVolumeGrid('0.01', '0.001');
  assert.equal(unverified.kind, 'unverified');
  assert.match(unverified.message, /may not allow/);
  assert.deepEqual(unverified.samples, ['0.01', '0.011', '0.012']);

  const incompatible = describeVolumeGrid('0.001', '0.01');
  assert.equal(incompatible.kind, 'incompatible');
  assert.deepEqual(incompatible.samples, []);
  assert.match(incompatible.message, /No position size is recommended/);

  const sized = calculatePosition({
    instrument: eurusd,
    direction: 'buy',
    balance: 100,
    riskMode: 'percent',
    riskValue: 1,
    entry: 1.1,
    stopLoss: 1.098,
    takeProfit: 'empty',
    accountCurrency: 'USD',
    minimumLot: 0.001,
    lotIncrement: 0.01,
    manualQuoteToAccountRate: 'empty',
  });
  assert.equal(sized.ok, true);
  if (sized.ok) {
    assert.ok(sized.actualLoss === null || sized.actualLoss <= sized.riskAmount + 1e-8);
  }
});

test('an EURUSD volume override does not change GBPUSD', () => {
  const instrumentLots = { EURUSD: { minimumLot: '0.001', lotIncrement: '0.001' } };
  const euro = resolveLotSettings({
    symbol: 'EURUSD',
    globalMinimum: '0.01',
    globalIncrement: '0.01',
    instrumentLots,
  });
  const pound = resolveLotSettings({
    symbol: 'GBPUSD',
    globalMinimum: '0.01',
    globalIncrement: '0.01',
    instrumentLots,
  });

  assert.equal(euro.source, 'instrument');
  assert.equal(euro.minimumLot, '0.001');
  assert.equal(euro.lotIncrement, '0.001');
  assert.equal(pound.source, 'global');
  assert.equal(pound.minimumLot, '0.01');
  assert.equal(pound.lotIncrement, '0.01');
  assert.match(lotSettingsSummary('global', 'GBPUSD').value, /Settings defaults/);
  assert.match(lotSettingsSummary('instrument', 'EURUSD').value, /EURUSD/);
});

test('changing the resolved lot settings changes the calculation fingerprint', () => {
  const base = fingerprint('0.01', '0.01', 'global');
  assert.notEqual(base, fingerprint('0.001', '0.001', 'instrument'));
  assert.notEqual(base, fingerprint('0.01', '0.001', 'instrument'));
  assert.notEqual(base, fingerprint('0.01', '0.01', 'instrument'));
});

test('blank, zero, and nonnumeric lot settings are invalid and are not stored as other symbols', () => {
  for (const value of ['', '0', '0.0', '-1', 'abc']) {
    const resolved = resolveLotSettings({
      symbol: 'EURUSD',
      globalMinimum: value,
      globalIncrement: '0.01',
      instrumentLots: {},
    });
    assert.equal(resolved.valid, false);
    const blocked = calculatePosition({
      instrument: eurusd,
      direction: 'buy',
      balance: 1000,
      riskMode: 'percent',
      riskValue: 2,
      entry: 1.085,
      stopLoss: 1.083,
      takeProfit: 'empty',
      accountCurrency: 'USD',
      minimumLot: value === '' ? 'empty' : 'invalid',
      lotIncrement: 0.01,
      manualQuoteToAccountRate: 'empty',
    });
    assert.equal(blocked.ok, false);
  }
});

test('saved settings round-trip and keep each instrument separate', () => {
  const stored: StoredCalculatorSettings = {
    currency: 'CHF',
    minimumLotSize: '0.10',
    lotIncrement: '0.01',
    instrumentLots: {
      EURUSD: { minimumLot: '0.001', lotIncrement: '0.001' },
    },
  };
  const loaded = parseStoredSettings(serializeSettings(stored));
  assert.deepEqual(loaded, stored);
  assert.equal(loaded?.instrumentLots.GBPUSD, undefined);

  assert.equal(parseStoredSettings('not json'), null);
  assert.equal(parseStoredSettings(null), null);
  const repaired = parseStoredSettings(
    JSON.stringify({ currency: 'NOPE', minimumLotSize: 1, instrumentLots: { eurusd: { minimumLot: '0.01' } } }),
  );
  assert.equal(repaired?.currency, 'USD');
  assert.equal(repaired?.minimumLotSize, '0.01');
  assert.deepEqual(repaired?.instrumentLots, {});
});

function fingerprint(minimumLotSize: string, lotIncrement: string, lotSource: 'global' | 'instrument'): string {
  return calculationFingerprint({
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
    minimumLotSize,
    lotIncrement,
    lotSource,
  });
}
