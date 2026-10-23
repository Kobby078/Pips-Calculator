import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import { AccountCurrency, DEFAULT_ACCOUNT_CURRENCY } from '@/constants/currencies';

type SettingsContextValue = {
  currency: AccountCurrency;
  setCurrency: (currency: AccountCurrency) => void;
  /** Set after the account currency changes. Entered amounts are not converted. */
  currencyNotice: string | null;
  minimumLotSize: string;
  setMinimumLotSize: (value: string) => void;
  lotIncrement: string;
  setLotIncrement: (value: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<AccountCurrency>(DEFAULT_ACCOUNT_CURRENCY);
  const [currencyNotice, setCurrencyNotice] = useState<string | null>(null);
  const [minimumLotSize, setMinimumLotSize] = useState('');
  const [lotIncrement, setLotIncrement] = useState('');

  const setCurrency = useCallback(
    (next: AccountCurrency) => {
      if (next === currency) {
        return;
      }
      setCurrencyState(next);
      setCurrencyNotice(
        `${next} is now the account currency. Balance and cash amounts keep the digits you typed. They are denominated in ${next} and were not converted.`,
      );
    },
    [currency],
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      currencyNotice,
      minimumLotSize,
      setMinimumLotSize,
      lotIncrement,
      setLotIncrement,
    }),
    [currency, currencyNotice, lotIncrement, minimumLotSize, setCurrency],
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return value;
}
