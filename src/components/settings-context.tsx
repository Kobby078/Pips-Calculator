import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { AccountCurrency, DEFAULT_ACCOUNT_CURRENCY } from '@/constants/currencies';

type SettingsContextValue = {
  currency: AccountCurrency;
  setCurrency: (currency: AccountCurrency) => void;
  minimumLotSize: string;
  setMinimumLotSize: (value: string) => void;
  lotIncrement: string;
  setLotIncrement: (value: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<AccountCurrency>(DEFAULT_ACCOUNT_CURRENCY);
  const [minimumLotSize, setMinimumLotSize] = useState('');
  const [lotIncrement, setLotIncrement] = useState('');

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      minimumLotSize,
      setMinimumLotSize,
      lotIncrement,
      setLotIncrement,
    }),
    [currency, lotIncrement, minimumLotSize],
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
