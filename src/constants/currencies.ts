export const ACCOUNT_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF'] as const;

export type AccountCurrency = (typeof ACCOUNT_CURRENCIES)[number];

export const DEFAULT_ACCOUNT_CURRENCY: AccountCurrency = 'USD';
