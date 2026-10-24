import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { AccountCurrency, DEFAULT_ACCOUNT_CURRENCY } from '@/constants/currencies';
import {
  DEFAULT_LOT_INCREMENT,
  DEFAULT_MINIMUM_LOT,
  parseStoredSettings,
  serializeSettings,
  SETTINGS_STORAGE_KEY,
  type InstrumentVolume,
} from '@/lib/lot-settings';

type SettingsContextValue = {
  currency: AccountCurrency;
  setCurrency: (currency: AccountCurrency) => void;
  /** Set after the account currency changes. Entered amounts are not converted. */
  currencyNotice: string | null;
  minimumLotSize: string;
  setMinimumLotSize: (value: string) => void;
  lotIncrement: string;
  setLotIncrement: (value: string) => void;
  instrumentLots: Readonly<Record<string, InstrumentVolume>>;
  setInstrumentVolume: (symbol: string, volume: InstrumentVolume) => void;
  clearInstrumentVolume: (symbol: string) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<AccountCurrency>(DEFAULT_ACCOUNT_CURRENCY);
  const [currencyNotice, setCurrencyNotice] = useState<string | null>(null);
  const [minimumLotSize, setMinimumLotSize] = useState(DEFAULT_MINIMUM_LOT);
  const [lotIncrement, setLotIncrement] = useState(DEFAULT_LOT_INCREMENT);
  const [instrumentLots, setInstrumentLots] = useState<Record<string, InstrumentVolume>>({});
  const [hydrated, setHydrated] = useState(false);

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

  const setInstrumentVolume = useCallback((symbol: string, volume: InstrumentVolume) => {
    setInstrumentLots((current) => ({
      ...current,
      [symbol]: volume,
    }));
  }, []);

  const clearInstrumentVolume = useCallback((symbol: string) => {
    setInstrumentLots((current) => {
      if (!current[symbol]) {
        return current;
      }
      const next = { ...current };
      delete next[symbol];
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then((raw) => {
        if (!active) {
          return;
        }
        const stored = parseStoredSettings(raw);
        if (stored) {
          setCurrencyState(stored.currency);
          setMinimumLotSize(stored.minimumLotSize);
          setLotIncrement(stored.lotIncrement);
          setInstrumentLots(stored.instrumentLots);
        }
        setHydrated(true);
      })
      .catch(() => {
        if (active) {
          setHydrated(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    const payload = serializeSettings({ currency, minimumLotSize, lotIncrement, instrumentLots });
    void AsyncStorage.setItem(SETTINGS_STORAGE_KEY, payload).catch(() => undefined);
  }, [currency, hydrated, instrumentLots, lotIncrement, minimumLotSize]);

  const value = useMemo(
    () => ({
      currency,
      setCurrency,
      currencyNotice,
      minimumLotSize,
      setMinimumLotSize,
      lotIncrement,
      setLotIncrement,
      instrumentLots,
      setInstrumentVolume,
      clearInstrumentVolume,
    }),
    [
      currency,
      currencyNotice,
      instrumentLots,
      lotIncrement,
      minimumLotSize,
      setCurrency,
      setInstrumentVolume,
      clearInstrumentVolume,
    ],
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
