import { ACCOUNT_CURRENCIES } from '../constants/currencies';
import type { InstrumentSpec } from '../constants/instruments';

/** Keyless development provider. Do not embed an API key. */
export const MARKET_DATA_PROVIDER = 'exchangerate.dev' as const;

export const MARKET_DATA_ATTRIBUTION_URL = 'https://exchangerate.dev';

export const MARKET_DATA_ENDPOINT = 'https://api.exchangerate.dev/v1/latest';

/** Anonymous responses are delayed. The provider sends this as X-Price-Delay-Seconds. */
export const DELAYED_PRICE_SECONDS = 900;

/** A live session quote older than this is shown as stale. The feed itself is already delayed. */
export const DEFAULT_STALE_AFTER_MS = 30 * 60 * 1000;

export const DEFAULT_CACHE_TTL_MS = 60 * 1000;

export const DEFAULT_TIMEOUT_MS = 8000;

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export type MarketSession = 'open' | 'weekend' | 'interbank_closed' | 'unknown';

export type RateSource = 'live' | 'ecb_daily' | 'market_daily' | 'unknown';

export type QuoteFreshness = 'fresh' | 'stale' | 'unknown';

export type QuoteErrorCode =
  | 'invalid-response'
  | 'timeout'
  | 'network'
  | 'rate-limit'
  | 'unavailable'
  | 'cancelled';

export type QuoteError = {
  code: QuoteErrorCode;
  message: string;
  retryAfterSeconds?: number;
};

export type RateLeg = {
  rate: number;
  source: RateSource;
  /** Provider stale flag, or true when the leg cannot be treated as a current session rate. */
  stale: boolean;
  effectiveAt: string;
};

export type MarketQuoteSuccess = {
  ok: true;
  instrument: string;
  price: number;
  quoteCurrency: string;
  baseCurrency: string;
  provider: typeof MARKET_DATA_PROVIDER;
  effectiveAt: string;
  marketSession: MarketSession;
  freshness: QuoteFreshness;
  source: RateSource;
  delayed: true;
  derived: boolean;
  derivedSymbols: string[];
  notice: string | null;
  rates: Record<string, number>;
  legs: Record<string, RateLeg>;
  error: null;
};

export type MarketQuoteFailure = {
  ok: false;
  instrument: string;
  price: null;
  quoteCurrency: string | null;
  baseCurrency: string | null;
  provider: typeof MARKET_DATA_PROVIDER;
  effectiveAt: null;
  marketSession: null;
  freshness: 'unknown';
  source: null;
  delayed: true;
  derived: false;
  derivedSymbols: [];
  notice: null;
  rates: null;
  legs: null;
  error: QuoteError;
};

/** A validated reference quote, or an error with no substituted price. */
export type MarketQuote = MarketQuoteSuccess | MarketQuoteFailure;

export type IndicativeConversion = {
  /** Account currency received for 1 unit of the quote currency. */
  rate: number;
  freshness: QuoteFreshness;
  derived: boolean;
};

export type ReferenceQuoteRequest = {
  instrument: string;
  baseCurrency: string;
  quoteCurrency: string;
  relatedCurrencies?: readonly string[];
};

export type MarketDataService = {
  fetchReferenceQuote(
    request: ReferenceQuoteRequest,
    options?: { refresh?: boolean; signal?: AbortSignal },
  ): Promise<MarketQuote>;
};

type Basket = {
  base: string;
  legs: Record<string, RateLeg>;
  marketSession: MarketSession;
  notice: string | null;
  derivedSymbols: string[];
  storedAt: number;
};

type BasketSuccess = { ok: true; basket: Basket };
type BasketFailure = { ok: false; error: QuoteError };
type BasketResult = BasketSuccess | BasketFailure;

export function supportsReferencePrice(spec: InstrumentSpec | null | undefined): boolean {
  return spec?.kind === 'forex' && spec.baseCurrency !== spec.quoteCurrency;
}

/** Currencies requested with a pair so a later account-currency choice can be derived. */
export function referenceSymbols(
  baseCurrency: string,
  quoteCurrency: string,
  relatedCurrencies: readonly string[] = ACCOUNT_CURRENCIES,
): string[] {
  const base = baseCurrency.toUpperCase();
  const symbols = new Set<string>();
  for (const code of [quoteCurrency, ...relatedCurrencies]) {
    const upper = code.toUpperCase();
    if (upper !== base && /^[A-Z]{3}$/.test(upper)) {
      symbols.add(upper);
    }
  }
  return [...symbols].sort();
}

export function referenceQuoteUrl(baseCurrency: string, symbols: readonly string[]): string {
  const base = encodeURIComponent(baseCurrency.toUpperCase());
  const query = symbols.map((symbol) => encodeURIComponent(symbol)).join(',');
  return `${MARKET_DATA_ENDPOINT}/${base}?symbols=${query}`;
}

export function createQuoteRequestGate() {
  let latest = 0;
  return {
    begin(): { id: number } {
      latest += 1;
      return { id: latest };
    },
    accept(id: number): boolean {
      return id === latest;
    },
  };
}

export function formatReferencePrice(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  return value
    .toFixed(8)
    .replace(/(\.\d*?)0+$/, '$1')
    .replace(/\.$/, '');
}

/** Refresh never writes the entry. Use Price is the only action that does. */
export function entryAfterReferenceAction(
  entry: string,
  price: number | null,
  action: 'refresh' | 'use-price',
): string {
  if (action !== 'use-price' || price === null) {
    return entry;
  }
  return formatReferencePrice(price) || entry;
}

export function levelsAfterUsePrice(
  levels: { entry: string; stopLoss: string; takeProfit: string },
  price: number,
): { entry: string; stopLoss: string; takeProfit: string } {
  return {
    entry: entryAfterReferenceAction(levels.entry, price, 'use-price'),
    stopLoss: levels.stopLoss,
    takeProfit: levels.takeProfit,
  };
}

/** Refresh never writes a conversion. Use rate is explicit and may replace the field. */
export function conversionAfterReferenceAction(
  current: string,
  rate: number | null,
  action: 'refresh' | 'use-rate',
): string {
  if (action !== 'use-rate' || rate === null) {
    return current;
  }
  return formatReferencePrice(rate) || current;
}

/**
 * Quote currency into account currency from one API base.
 * USD-to-CHF = CHF-per-EUR / USD-per-EUR. Missing legs produce null, never 1.
 */
export function indicativeQuoteToAccount(
  baseCurrency: string,
  legs: Record<string, RateLeg> | null,
  quoteCurrency: string,
  accountCurrency: string,
  derivedSymbols: readonly string[] = [],
): IndicativeConversion | null {
  if (!legs) {
    return null;
  }
  const base = baseCurrency.toUpperCase();
  const quote = quoteCurrency.toUpperCase();
  const account = accountCurrency.toUpperCase();
  if (account === quote || account === base) {
    return null;
  }
  const quoteLeg = legs[quote];
  const accountLeg = legs[account];
  if (!quoteLeg || !accountLeg) {
    return null;
  }
  const rate = accountLeg.rate / quoteLeg.rate;
  if (!Number.isFinite(rate) || rate <= 0) {
    return null;
  }
  const derived = derivedSymbols.includes(quote) || derivedSymbols.includes(account);
  const freshness: QuoteFreshness =
    quoteLeg.stale || accountLeg.stale || quoteLeg.source !== 'live' || accountLeg.source !== 'live'
      ? 'stale'
      : 'fresh';
  return { rate, freshness, derived };
}

export function formatQuoteTimestamp(iso: string): string {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
    return iso;
  }
  const date = new Date(parsed);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

export function formatQuoteAge(iso: string, now: number): string | null {
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const minutes = Math.max(0, Math.round((now - parsed) / MINUTE_MS));
  if (minutes < 1) {
    return 'less than a minute ago';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `${hours} hr ago`;
  }
  return `${Math.round(hours / 24)} days ago`;
}

export function marketSessionLabel(session: MarketSession): string {
  switch (session) {
    case 'open':
      return 'Market session open';
    case 'weekend':
      return 'Market closed for the weekend';
    case 'interbank_closed':
      return 'Interbank market closed';
    default:
      return 'Market session unknown';
  }
}

type ServiceOptions = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  cacheTtlMs?: number;
  timeoutMs?: number;
  staleAfterMs?: number;
  limits?: { perMinute: number; perHour: number };
};

export function createMarketDataService(options: ServiceOptions = {}): MarketDataService {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const staleAfterMs = options.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const limits = options.limits ?? { perMinute: 10, perHour: 100 };
  const cache = new Map<string, Basket>();
  const inflight = new Map<string, Promise<BasketResult>>();
  const callTimes: number[] = [];
  let blockedUntil = 0;

  async function fetchReferenceQuote(
    request: ReferenceQuoteRequest,
    requestOptions?: { refresh?: boolean; signal?: AbortSignal },
  ): Promise<MarketQuote> {
    const instrument = request.instrument.toUpperCase();
    const base = request.baseCurrency.toUpperCase();
    const quote = request.quoteCurrency.toUpperCase();
    if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote) || base === quote) {
      return failure(instrument, quote, 'invalid-response');
    }

    const symbols = referenceSymbols(base, quote, request.relatedCurrencies ?? ACCOUNT_CURRENCIES);
    const key = `${base}|${symbols.join(',')}`;
    const refresh = requestOptions?.refresh === true;
    const currentNow = now();

    if (!refresh) {
      const cached = cache.get(key);
      if (cached && currentNow - cached.storedAt < cacheTtlMs) {
        return quoteFromBasket(cached, instrument, quote, currentNow, staleAfterMs);
      }
      const pending = inflight.get(key);
      if (pending) {
        const shared = await pending;
        if (requestOptions?.signal?.aborted) {
          return failure(instrument, quote, 'cancelled');
        }
        return shared.ok
          ? quoteFromBasket(shared.basket, instrument, quote, now(), staleAfterMs)
          : failure(instrument, quote, shared.error.code, shared.error.retryAfterSeconds);
      }
    }

    if (requestOptions?.signal?.aborted) {
      return failure(instrument, quote, 'cancelled');
    }
    if (blockedUntil > currentNow || !withinLimits(currentNow)) {
      return failure(instrument, quote, 'rate-limit');
    }

    const task = requestBasket(base, symbols, key, requestOptions?.signal);
    inflight.set(key, task);
    try {
      const result = await task;
      if (requestOptions?.signal?.aborted) {
        return failure(instrument, quote, 'cancelled');
      }
      if (!result.ok) {
        return failure(instrument, quote, result.error.code, result.error.retryAfterSeconds);
      }
      return quoteFromBasket(result.basket, instrument, quote, now(), staleAfterMs);
    } finally {
      if (inflight.get(key) === task) {
        inflight.delete(key);
      }
    }
  }

  async function requestBasket(
    base: string,
    symbols: string[],
    key: string,
    signal: AbortSignal | undefined,
  ): Promise<BasketResult> {
    const started = now();
    callTimes.push(started);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    try {
      const response = await fetchImpl(referenceQuoteUrl(base, symbols), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      if (response.status === 429) {
        const retryAfterSeconds = parseRetryAfter(response.headers.get('Retry-After'), now());
        if (retryAfterSeconds !== null) {
          blockedUntil = Math.max(blockedUntil, now() + retryAfterSeconds * 1000);
        }
        return { ok: false, error: errorBody('rate-limit', retryAfterSeconds ?? undefined) };
      }
      rememberRemaining(response.headers);
      if (!response.ok) {
        return { ok: false, error: errorBody('unavailable') };
      }
      const payload: unknown = await response.json();
      const basket = parseBasket(payload, base, symbols, now());
      if (!basket) {
        return { ok: false, error: errorBody('invalid-response') };
      }
      cache.set(key, basket);
      return { ok: true, basket };
    } catch (error) {
      if (isAbortError(error)) {
        return { ok: false, error: errorBody(signal?.aborted ? 'cancelled' : 'timeout') };
      }
      if (error instanceof SyntaxError) {
        return { ok: false, error: errorBody('invalid-response') };
      }
      return { ok: false, error: errorBody('network') };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  function withinLimits(current: number): boolean {
    pruneCalls(current);
    const minuteCount = callTimes.filter((time) => current - time < MINUTE_MS).length;
    const hourCount = callTimes.length;
    return minuteCount < limits.perMinute && hourCount < limits.perHour;
  }

  function pruneCalls(current: number) {
    while (callTimes.length > 0 && current - callTimes[0] >= HOUR_MS) {
      callTimes.shift();
    }
  }

  function rememberRemaining(headers: Headers) {
    if (headers.get('X-RateLimit-Remaining') !== '0') {
      return;
    }
    const reset = Number(headers.get('X-RateLimit-Reset'));
    if (Number.isFinite(reset) && reset > 0) {
      blockedUntil = Math.max(blockedUntil, reset * 1000);
    }
  }

  return { fetchReferenceQuote };
}

export const marketData: MarketDataService = createMarketDataService();

function quoteFromBasket(
  basket: Basket,
  instrument: string,
  quoteCurrency: string,
  current: number,
  staleAfterMs: number,
): MarketQuote {
  const legs: Record<string, RateLeg> = {};
  for (const [symbol, leg] of Object.entries(basket.legs)) {
    legs[symbol] = {
      ...leg,
      stale: leg.stale || isStaleLeg(leg, basket.marketSession, current, staleAfterMs),
    };
  }
  const published = legs[quoteCurrency];
  if (!published) {
    return failure(instrument, quoteCurrency, 'invalid-response');
  }
  const rates: Record<string, number> = {};
  for (const [symbol, item] of Object.entries(legs)) {
    rates[symbol] = item.rate;
  }
  return {
    ok: true,
    instrument,
    price: published.rate,
    quoteCurrency,
    baseCurrency: basket.base,
    provider: MARKET_DATA_PROVIDER,
    effectiveAt: published.effectiveAt,
    marketSession: basket.marketSession,
    freshness: published.stale ? 'stale' : 'fresh',
    source: published.source,
    delayed: true,
    derived: basket.derivedSymbols.includes(quoteCurrency),
    derivedSymbols: basket.derivedSymbols,
    notice: basket.notice,
    rates,
    legs,
    error: null,
  };
}

function isStaleLeg(leg: RateLeg, session: MarketSession, current: number, staleAfterMs: number): boolean {
  if (session !== 'open' || leg.source !== 'live') {
    return true;
  }
  const effective = Date.parse(leg.effectiveAt);
  if (!Number.isFinite(effective)) {
    return true;
  }
  return current - effective > staleAfterMs;
}

function parseBasket(
  payload: unknown,
  base: string,
  requested: readonly string[],
  storedAt: number,
): Basket | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const body = payload as Record<string, unknown>;
  if (body.result !== 'success' || String(body.base ?? '').toUpperCase() !== base) {
    return null;
  }
  const rates = body.rates;
  if (!rates || typeof rates !== 'object') {
    return null;
  }
  const session = parseSession(body.market_session);
  const fallbackTimes = [body.data_updated_at, body.timestamp];
  const legs: Record<string, RateLeg> = {};
  for (const symbol of requested) {
    const rate = (rates as Record<string, unknown>)[symbol];
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      continue;
    }
    const effectiveAt = readEffectiveAt(body.effective_at, symbol, fallbackTimes);
    if (!effectiveAt) {
      continue;
    }
    const source = readSource(readRecord(body.sources)?.[symbol]) ?? readSource(body.source) ?? 'unknown';
    legs[symbol] = {
      rate,
      source,
      stale: readRecord(body.stale)?.[symbol] === true,
      effectiveAt,
    };
  }
  if (Object.keys(legs).length === 0) {
    return null;
  }
  const derivedSymbols = Array.isArray(body.derived_symbols)
    ? body.derived_symbols.filter((symbol): symbol is string => typeof symbol === 'string')
    : [];
  return {
    base,
    legs,
    marketSession: session,
    notice: typeof body.notice === 'string' ? body.notice : null,
    derivedSymbols,
    storedAt,
  };
}

function readEffectiveAt(map: unknown, symbol: string, fallbacks: unknown[]): string | null {
  const specific = readRecord(map)?.[symbol];
  if (typeof specific === 'string' && Number.isFinite(Date.parse(specific))) {
    return specific;
  }
  for (const value of fallbacks) {
    if (typeof value === 'string' && Number.isFinite(Date.parse(value))) {
      return value;
    }
  }
  return null;
}

function readRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseSession(value: unknown): MarketSession {
  if (value === 'open' || value === 'weekend' || value === 'interbank_closed') {
    return value;
  }
  return 'unknown';
}

function readSource(value: unknown): RateSource | null {
  if (value === 'live' || value === 'ecb_daily' || value === 'market_daily') {
    return value;
  }
  return null;
}

function failure(
  instrument: string,
  quoteCurrency: string | null,
  code: QuoteErrorCode,
  retryAfterSeconds?: number,
): MarketQuoteFailure {
  return {
    ok: false,
    instrument,
    price: null,
    quoteCurrency,
    baseCurrency: null,
    provider: MARKET_DATA_PROVIDER,
    effectiveAt: null,
    marketSession: null,
    freshness: 'unknown',
    source: null,
    delayed: true,
    derived: false,
    derivedSymbols: [],
    notice: null,
    rates: null,
    legs: null,
    error: errorBody(code, retryAfterSeconds),
  };
}

function errorBody(code: QuoteErrorCode, retryAfterSeconds?: number): QuoteError {
  const retry =
    code === 'rate-limit' && retryAfterSeconds !== undefined
      ? ` Try again in ${retryAfterSeconds} seconds.`
      : '';
  const message =
    code === 'timeout'
      ? 'The reference price request timed out. No price was filled in.'
      : code === 'network'
        ? 'The reference price service could not be reached. No price was filled in.'
        : code === 'rate-limit'
          ? `Reference price requests are paused after the free limit.${retry} Enter the price yourself.`
          : code === 'unavailable'
            ? 'The reference price service returned an error. No price was filled in.'
            : code === 'cancelled'
              ? 'The reference price request was cancelled.'
              : 'The reference price response was not usable. No price was filled in.';
  return retryAfterSeconds === undefined ? { code, message } : { code, message, retryAfterSeconds };
}

function parseRetryAfter(value: string | null, current: number): number | null {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds;
  }
  const date = Date.parse(value);
  if (!Number.isFinite(date)) {
    return null;
  }
  return Math.max(0, Math.round((date - current) / 1000));
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
