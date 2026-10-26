/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findInstrument } from '../constants/instruments';
import { levelsAfterUsePrice } from '../services/market-data';
import { displayPriceDecimals, formatDisplayPrice } from './price-format';

const eurusd = findInstrument('EURUSD');
const usdjpy = findInstrument('USDJPY');
const gold = findInstrument('XAUUSD');

test('EURUSD, USDJPY, and XAUUSD reference prices use instrument display decimals', () => {
  assert.equal(displayPriceDecimals(eurusd?.spec ?? null), 5);
  assert.equal(displayPriceDecimals(usdjpy?.spec ?? null), 3);
  assert.equal(displayPriceDecimals(gold?.spec ?? null), 2);

  assert.equal(formatDisplayPrice(1.1222700004, 5), '1.12227');
  assert.equal(formatDisplayPrice(151.1236, 3), '151.124');
  assert.equal(formatDisplayPrice(3992.899902, 2), '3992.90');
  assert.equal(formatDisplayPrice(3995.5, 2), '3995.50');
});

test('Use Price writes the display price and leaves the stop and target unchanged', () => {
  const next = levelsAfterUsePrice(
    { entry: '3990', stopLoss: '3980', takeProfit: '4010' },
    3992.899902,
    displayPriceDecimals(gold?.spec ?? null),
  );
  assert.equal(next.entry, '3992.90');
  assert.equal(next.stopLoss, '3980');
  assert.equal(next.takeProfit, '4010');

  const yen = levelsAfterUsePrice(
    { entry: '150.000', stopLoss: '149.500', takeProfit: '151.000' },
    150.1236,
    displayPriceDecimals(usdjpy?.spec ?? null),
  );
  assert.equal(yen.entry, '150.124');
  assert.equal(yen.stopLoss, '149.500');
  assert.equal(yen.takeProfit, '151.000');
});
