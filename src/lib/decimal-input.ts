/** Keep a single decimal point and digits. This only cleans typed input. */
export function sanitizeDecimal(value: string): string {
  const cleaned = value.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const [whole, ...fraction] = cleaned.split('.');
  if (fraction.length === 0) {
    return whole ?? '';
  }
  return `${whole}.${fraction.join('')}`;
}

export function isPositiveDecimal(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return false;
  }
  return Number(trimmed) > 0;
}

/** Empty stays empty so an optional price can be omitted. Anything else must be a positive number. */
export function readPositiveDecimal(value: string): number | 'empty' | 'invalid' {
  const trimmed = value.trim();
  if (trimmed === '') {
    return 'empty';
  }
  if (!isPositiveDecimal(trimmed)) {
    return 'invalid';
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 'invalid';
  }
  return parsed;
}
