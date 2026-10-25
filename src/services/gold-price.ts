/** Keyless gold spot provider. The response timestamp decides freshness, not the HTTP status. */
export const GOLD_API_PROVIDER = 'gold-api.com' as const;

export const GOLD_API_URL = 'https://api.gold-api.com/price/XAU';

export const GOLD_API_ATTRIBUTION_URL = 'https://gold-api.com/' as const;

/** A quote older than this is stale even when the request itself succeeded. */
export const GOLD_STALE_AFTER_MS = 15 * 60 * 1000;

/** Timestamps further ahead than this are not treated as current. */
export const GOLD_FUTURE_SKEW_MS = 2 * 60 * 1000;

export type GoldSpot = {
  price: number;
  updatedAt: string;
  freshness: 'fresh' | 'stale';
};

export function parseGoldSpot(payload: unknown, now: number): GoldSpot | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const body = payload as Record<string, unknown>;
  if (String(body.symbol ?? '').toUpperCase() !== 'XAU') {
    return null;
  }
  if (String(body.currency ?? '').toUpperCase() !== 'USD') {
    return null;
  }
  if (typeof body.price !== 'number' || !Number.isFinite(body.price) || body.price <= 0) {
    return null;
  }
  if (typeof body.updatedAt !== 'string' || !Number.isFinite(Date.parse(body.updatedAt))) {
    return null;
  }
  return {
    price: body.price,
    updatedAt: body.updatedAt,
    freshness: goldFreshness(body.updatedAt, now),
  };
}

export function goldFreshness(updatedAt: string, now: number): 'fresh' | 'stale' {
  const effective = Date.parse(updatedAt);
  if (!Number.isFinite(effective)) {
    return 'stale';
  }
  const age = now - effective;
  if (age < -GOLD_FUTURE_SKEW_MS || age > GOLD_STALE_AFTER_MS) {
    return 'stale';
  }
  return 'fresh';
}
