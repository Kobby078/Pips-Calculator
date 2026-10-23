/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findInstrument } from '../constants/instruments';
import {
  conversionAfterReferenceAction,
  createMarketDataService,
  createQuoteRequestGate,
  entryAfterReferenceAction,
  indicativeQuoteToAccount,
  levelsAfterUsePrice,
  supportsReferencePrice,
  type MarketQuote,
} from './market-data';

const NOW = Date.parse('2026-10-23T14:09:12Z');
const EFFECTIVE = '2026-10-23T13:53:59Z';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function latestBody(overrides: Record<string, unknown> = {}) {
  return {
    result: 'success',
    base: 'EUR',
    source: 'live',
    sources: { USD: 'live', CHF: 'live', JPY: 'live' },
    market_session: 'open',
    timestamp: '2026-10-23T14:09:12Z',
    data_updated_at: EFFECTIVE,
    effective_at: { USD: EFFECTIVE, CHF: EFFECTIVE, JPY: EFFECTIVE },
    rates: { USD: 1.12002, CHF: 0.92278, JPY: 175.495 },
    stale: { USD: false, CHF: false, JPY: false },
    derived_symbols: ['CHF', 'JPY'],
    notice: 'Indicative rates, not for settlement.',
    ...overrides,
  };
}

function serviceFor(
  fetchImpl: typeof fetch,
  extras: { now?: () => number; limits?: { perMinute: number; perHour: number }; cacheTtlMs?: number; timeoutMs?: number } = {},
) {
  return createMarketDataService({
    fetchImpl,
    now: extras.now ?? (() => NOW),
    cacheTtlMs: extras.cacheTtlMs,
    timeoutMs: extras.timeoutMs,
    limits: extras.limits,
  });
}

async function quoteOf(result: MarketQuote) {
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error('expected a quote');
  }
  return result;
}

test('EURUSD retrieval keeps the provider rate, source, session, and effective time', async () => {
  let url = '';
  const service = serviceFor((input) => {
    url = String(input);
    return Promise.resolve(jsonResponse(latestBody({ rates: { USD: 1.12002 }, sources: { USD: 'live' } })));
  });
  const quote = await quoteOf(
    await service.fetchReferenceQuote({
      instrument: 'EURUSD',
      baseCurrency: 'EUR',
      quoteCurrency: 'USD',
      relatedCurrencies: [],
    }),
  );

  assert.equal(url, 'https://api.exchangerate.dev/v1/latest/EUR?symbols=USD');
  assert.equal(quote.instrument, 'EURUSD');
  assert.equal(quote.price, 1.12002);
  assert.equal(quote.quoteCurrency, 'USD');
  assert.equal(quote.provider, 'exchangerate.dev');
  assert.equal(quote.effectiveAt, EFFECTIVE);
  assert.equal(quote.marketSession, 'open');
  assert.equal(quote.freshness, 'fresh');
  assert.equal(quote.source, 'live');
  assert.equal(quote.delayed, true);
  assert.equal(quote.derived, false);
  assert.equal(quote.error, null);
});

test('USDJPY retrieval requests USD as the base and JPY as the quote', async () => {
  let url = '';
  const service = serviceFor((input) => {
    url = String(input);
    return Promise.resolve(
      jsonResponse(
        latestBody({
          base: 'USD',
          rates: { JPY: 150.123 },
          sources: { JPY: 'live' },
          effective_at: { JPY: EFFECTIVE },
          stale: { JPY: false },
          derived_symbols: [],
        }),
      ),
    );
  });
  const quote = await quoteOf(
    await service.fetchReferenceQuote({
      instrument: 'USDJPY',
      baseCurrency: 'USD',
      quoteCurrency: 'JPY',
      relatedCurrencies: [],
    }),
  );

  assert.equal(url, 'https://api.exchangerate.dev/v1/latest/USD?symbols=JPY');
  assert.equal(quote.instrument, 'USDJPY');
  assert.equal(quote.price, 150.123);
  assert.equal(quote.quoteCurrency, 'JPY');
  assert.equal(quote.freshness, 'fresh');
});

test('a cross rate is derived from two legs of the same base and never defaults to 1', async () => {
  const service = serviceFor(() => Promise.resolve(jsonResponse(latestBody())));
  const quote = await quoteOf(
    await service.fetchReferenceQuote({
      instrument: 'EURUSD',
      baseCurrency: 'EUR',
      quoteCurrency: 'USD',
      relatedCurrencies: ['CHF'],
    }),
  );
  const conversion = indicativeQuoteToAccount(
    quote.baseCurrency,
    quote.legs,
    quote.quoteCurrency,
    'CHF',
    quote.derivedSymbols,
  );

  assert.ok(conversion);
  assert.ok(Math.abs((conversion?.rate ?? 0) - 0.92278 / 1.12002) < 1e-12);
  assert.equal(conversion?.derived, true);
  assert.equal(indicativeQuoteToAccount(quote.baseCurrency, quote.legs, 'USD', 'USD', quote.derivedSymbols), null);
  assert.equal(indicativeQuoteToAccount(quote.baseCurrency, quote.legs, 'USD', 'EUR', quote.derivedSymbols), null);
  assert.equal(indicativeQuoteToAccount(quote.baseCurrency, quote.legs, 'USD', 'GBP', quote.derivedSymbols), null);
});

test('an invalid API response does not invent a price', async () => {
  const bodies = [
    { result: 'error' },
    { result: 'success', base: 'USD', rates: { USD: 1.1 }, timestamp: EFFECTIVE },
    { result: 'success', base: 'EUR', rates: { USD: 0 }, timestamp: EFFECTIVE },
    { result: 'success', base: 'EUR', rates: { CHF: 0.9 }, timestamp: EFFECTIVE },
    null,
  ];
  for (const body of bodies) {
    const service = serviceFor(() => Promise.resolve(jsonResponse(body)));
    const result = await service.fetchReferenceQuote({
      instrument: 'EURUSD',
      baseCurrency: 'EUR',
      quoteCurrency: 'USD',
      relatedCurrencies: [],
    });
    assert.equal(result.ok, false);
    assert.equal(result.price, null);
    if (!result.ok) {
      assert.equal(result.error.code, 'invalid-response');
    }
  }

  const malformed = serviceFor(() => Promise.resolve(new Response('not-json', { status: 200 })));
  const parsed = await malformed.fetchReferenceQuote({
    instrument: 'EURUSD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    relatedCurrencies: [],
  });
  assert.equal(parsed.ok, false);
  assert.equal(parsed.price, null);
});

test('network failure and timeout leave the price empty', async () => {
  const offline = serviceFor(() => Promise.reject(new TypeError('network down')));
  const failed = await offline.fetchReferenceQuote({
    instrument: 'EURUSD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    relatedCurrencies: [],
  });
  assert.equal(failed.ok, false);
  assert.equal(failed.price, null);
  if (!failed.ok) {
    assert.equal(failed.error.code, 'network');
  }

  const hanging = serviceFor(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }),
    { timeoutMs: 20 },
  );
  const timedOut = await hanging.fetchReferenceQuote({
    instrument: 'EURUSD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    relatedCurrencies: [],
  });
  assert.equal(timedOut.ok, false);
  assert.equal(timedOut.price, null);
  if (!timedOut.ok) {
    assert.equal(timedOut.error.code, 'timeout');
  }
});

test('stale provider flags, closed sessions, daily sources, and old timestamps are stale', async () => {
  const cases = [
    latestBody({ stale: { USD: true } }),
    latestBody({ market_session: 'weekend' }),
    latestBody({ market_session: 'interbank_closed' }),
    latestBody({ source: 'ecb_daily', sources: { USD: 'ecb_daily' } }),
    latestBody({
      data_updated_at: '2026-10-23T12:00:00Z',
      effective_at: { USD: '2026-10-23T12:00:00Z' },
    }),
  ];
  for (const body of cases) {
    const service = serviceFor(() => Promise.resolve(jsonResponse(body)));
    const quote = await quoteOf(
      await service.fetchReferenceQuote({
        instrument: 'EURUSD',
        baseCurrency: 'EUR',
        quoteCurrency: 'USD',
        relatedCurrencies: [],
      }),
    );
    assert.equal(quote.price, 1.12002);
    assert.equal(quote.freshness, 'stale');
  }
});

test('a rate-limit response and the local request cap do not substitute a price', async () => {
  const limited = serviceFor(() =>
    Promise.resolve(jsonResponse({ result: 'error' }, 429, { 'Retry-After': '12' })),
  );
  const blocked = await limited.fetchReferenceQuote({
    instrument: 'EURUSD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    relatedCurrencies: [],
  });
  assert.equal(blocked.price, null);
  if (!blocked.ok) {
    assert.equal(blocked.error.code, 'rate-limit');
    assert.equal(blocked.error.retryAfterSeconds, 12);
    assert.match(blocked.error.message, /12 seconds/);
  }

  let calls = 0;
  const capped = serviceFor(
    () => {
      calls += 1;
      return Promise.resolve(jsonResponse(latestBody()));
    },
    { limits: { perMinute: 1, perHour: 100 } },
  );
  const request = {
    instrument: 'EURUSD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    relatedCurrencies: [] as string[],
  };
  const first = await capped.fetchReferenceQuote(request, { refresh: true });
  const second = await capped.fetchReferenceQuote(request, { refresh: true });
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.price, null);
  if (!second.ok) {
    assert.equal(second.error.code, 'rate-limit');
  }
  assert.equal(calls, 1);
});

test('refresh does not change a typed entry, stop, target, or conversion', () => {
  assert.equal(entryAfterReferenceAction('1.11111', 1.25, 'refresh'), '1.11111');
  assert.equal(conversionAfterReferenceAction('0.91', 0.82, 'refresh'), '0.91');

  const next = levelsAfterUsePrice({ entry: '1.10000', stopLoss: '1.09000', takeProfit: '1.12000' }, 1.12002);
  assert.equal(next.entry, '1.12002');
  assert.equal(next.stopLoss, '1.09000');
  assert.equal(next.takeProfit, '1.12000');
  assert.equal(conversionAfterReferenceAction('0.91', 0.8239, 'use-rate'), '0.8239');
});

test('a response for a previous instrument is ignored after the request gate moves on', async () => {
  let releaseEur: (response: Response) => void = () => {};
  const eurPending = new Promise<Response>((resolve) => {
    releaseEur = resolve;
  });
  const service = serviceFor((input) => {
    if (String(input).includes('/latest/EUR')) {
      return eurPending;
    }
    return Promise.resolve(
      jsonResponse(
        latestBody({
          base: 'USD',
          rates: { JPY: 150.123 },
          sources: { JPY: 'live' },
          effective_at: { JPY: EFFECTIVE },
          stale: { JPY: false },
          derived_symbols: [],
        }),
      ),
    );
  });
  const gate = createQuoteRequestGate();
  const eurusd = gate.begin();
  const pendingEur = service.fetchReferenceQuote({
    instrument: 'EURUSD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    relatedCurrencies: [],
  });
  const usdjpy = gate.begin();
  const pendingJpy = service.fetchReferenceQuote({
    instrument: 'USDJPY',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    relatedCurrencies: [],
  });
  releaseEur(jsonResponse(latestBody()));
  const [eurQuote, jpyQuote] = await Promise.all([pendingEur, pendingJpy]);

  assert.equal(gate.accept(eurusd.id), false);
  assert.equal(gate.accept(usdjpy.id), true);
  assert.equal(eurQuote.ok && eurQuote.instrument, 'EURUSD');
  assert.equal(jpyQuote.ok && jpyQuote.price, 150.123);
});

test('repeat loads use the short cache and metals are not reference instruments', async () => {
  let calls = 0;
  const service = serviceFor(() => {
    calls += 1;
    return Promise.resolve(jsonResponse(latestBody()));
  });
  const request = {
    instrument: 'EURUSD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    relatedCurrencies: [] as string[],
  };
  await service.fetchReferenceQuote(request);
  await service.fetchReferenceQuote(request);
  assert.equal(calls, 1);

  assert.equal(supportsReferencePrice(findInstrument('EURUSD')?.spec), true);
  assert.equal(supportsReferencePrice(findInstrument('XAUUSD')?.spec), false);
  assert.equal(supportsReferencePrice(findInstrument('XAGUSD')?.spec), false);
  assert.equal(supportsReferencePrice(null), false);
});
