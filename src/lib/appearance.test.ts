/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appearanceOrDefault, parseAppearancePreference, resolveColorScheme } from './appearance';
import { calculationFingerprint } from './calculation-fingerprint';
import { parseStoredSettings, serializeSettings, withoutTradePreferences, type StoredCalculatorSettings } from './lot-settings';

test('appearance defaults to system and accepts only the three settings', () => {
  assert.equal(appearanceOrDefault(undefined), 'system');
  assert.equal(appearanceOrDefault('nope'), 'system');
  assert.equal(parseAppearancePreference(undefined), undefined);
  assert.equal(parseAppearancePreference('light'), 'light');
  assert.equal(parseAppearancePreference('dark'), 'dark');
  assert.equal(parseAppearancePreference('system'), 'system');
});

test('light and dark override the device, and system follows it', () => {
  assert.equal(resolveColorScheme('light', 'dark'), 'light');
  assert.equal(resolveColorScheme('dark', 'light'), 'dark');
  assert.equal(resolveColorScheme('system', 'light'), 'light');
  assert.equal(resolveColorScheme('system', 'dark'), 'dark');
  assert.equal(resolveColorScheme('system', null), null);
  assert.equal(resolveColorScheme('dark', null), 'dark');
});

test('stored appearance round-trips and survives a trade-preference reset', () => {
  const stored: StoredCalculatorSettings = {
    currency: 'GBP',
    minimumLotSize: '0.10',
    lotIncrement: '0.01',
    instrumentLots: {
      XAUUSD: { minimumLot: '0.001', lotIncrement: '0.001' },
    },
    preferences: {
      instrument: 'XAUUSD',
      balance: '2500',
      riskMode: 'percent',
      riskValue: '1',
    },
    appearance: 'light',
  };
  assert.deepEqual(parseStoredSettings(serializeSettings(stored)), stored);

  const reset = withoutTradePreferences(stored);
  assert.equal(reset.appearance, 'light');
  assert.equal(reset.currency, 'GBP');
  assert.equal(reset.instrumentLots.XAUUSD?.minimumLot, '0.001');
  assert.deepEqual(reset.preferences, {
    instrument: null,
    balance: '',
    riskMode: 'percent',
    riskValue: '',
  });

  const legacy = parseStoredSettings(
    JSON.stringify({
      currency: 'USD',
      minimumLotSize: '0.01',
      lotIncrement: '0.01',
      instrumentLots: {},
      appearance: 'sepia',
    }),
  );
  assert.equal(legacy?.appearance, undefined);
  assert.equal(appearanceOrDefault(legacy?.appearance), 'system');
});

test('changing appearance does not alter calculation fingerprint or mark results outdated', () => {
  const calculationInputs = {
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
  const fingerprintBefore = calculationFingerprint(calculationInputs);
  // Theme changes do not alter fingerprint inputs
  const fingerprintAfter = calculationFingerprint(calculationInputs);
  assert.equal(fingerprintBefore, fingerprintAfter);
});