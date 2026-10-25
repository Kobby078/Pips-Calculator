/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { goldFreshness, parseGoldSpot } from './gold-price';

const NOW = Date.parse('2026-10-23T14:09:12Z');

function payload(overrides: Record<string, unknown> = {}) {
  return {
    symbol: 'XAU',
    currency: 'USD',
    price: 3996.899902,
    updatedAt: '2026-10-23T14:08:41Z',
    ...overrides,
  };
}

test('a valid XAU spot response keeps a positive USD price and a parseable timestamp', () => {
  const spot = parseGoldSpot(payload(), NOW);
  assert.equal(spot?.price, 3996.899902);
  assert.equal(spot?.updatedAt, '2026-10-23T14:08:41Z');
  assert.equal(spot?.freshness, 'fresh');
});

test('missing or invalid gold prices are rejected', () => {
  assert.equal(parseGoldSpot(payload({ price: undefined }), NOW), null);
  assert.equal(parseGoldSpot(payload({ price: 0 }), NOW), null);
  assert.equal(parseGoldSpot(payload({ price: -1 }), NOW), null);
  assert.equal(parseGoldSpot(payload({ price: Number.NaN }), NOW), null);
  assert.equal(parseGoldSpot(payload({ price: '3996.89' }), NOW), null);
  assert.equal(parseGoldSpot(null, NOW), null);
});

test('a gold response must be symbol XAU quoted in USD', () => {
  assert.equal(parseGoldSpot(payload({ currency: 'EUR' }), NOW), null);
  assert.equal(parseGoldSpot(payload({ symbol: 'XAG' }), NOW), null);
  assert.equal(parseGoldSpot(payload({ updatedAt: 'not-a-time' }), NOW), null);
});

test('old and future gold timestamps are stale even when the price is valid', () => {
  const old = parseGoldSpot(payload({ updatedAt: '2026-10-23T12:00:00Z' }), NOW);
  assert.equal(old?.price, 3996.899902);
  assert.equal(old?.freshness, 'stale');
  assert.equal(goldFreshness('2026-10-23T12:00:00Z', NOW), 'stale');

  const future = parseGoldSpot(payload({ updatedAt: '2026-10-23T16:00:00Z' }), NOW);
  assert.equal(future?.price, 3996.899902);
  assert.equal(future?.freshness, 'stale');
  assert.equal(goldFreshness('2026-10-23T14:10:12Z', NOW), 'fresh');
});
