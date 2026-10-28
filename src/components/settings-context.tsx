import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { AccountCurrency, DEFAULT_ACCOUNT_CURRENCY } from '@/constants/currencies';
import { appearanceOrDefault, type AppearancePreference } from '@/lib/appearance';
import {
  DEFAULT_LOT_INCREMENT,
  DEFAULT_MINIMUM_LOT,
  EMPTY_TRADE_PREFERENCES,
  parseStoredSettings,
  serializeSettings,
  SETTINGS_STORAGE_KEY,
  type InstrumentVolume,
  type TradePreferences,
} from '@/lib/lot-settings';

type SettingsContextValue = {
  hydrated: boolean;
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
  instrumentSpreads: Readonly<Record<string, string>>;
  setInstrumentSpread: (symbol: string, spread: string) => void;
  clearInstrumentSpread: (symbol: string) => void;
  trade: TradePreferences;
  /** Changes when preferences are reset, so inputs can remount instead of echoing old text. */
  tradeRevision: number;
  updateTrade: (patch: Partial<TradePreferences>) => void;
  resetTradePreferences: () => void;
  appearance: AppearancePreference;
  setAppearance: (appearance: AppearancePreference) => void;
  showHelpExplanations: boolean;
  setShowHelpExplanations: (show: boolean) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<AccountCurrency>(DEFAULT_ACCOUNT_CURRENCY);
  const [currencyNotice, setCurrencyNotice] = useState<string | null>(null);
  const [minimumLotSize, setMinimumLotSize] = useState(DEFAULT_MINIMUM_LOT);
  const [lotIncrement, setLotIncrement] = useState(DEFAULT_LOT_INCREMENT);
  const [instrumentLots, setInstrumentLots] = useState<Record<string, InstrumentVolume>>({});
  const [instrumentSpreads, setInstrumentSpreads] = useState<Record<string, string>>({});
  const [trade, setTrade] = useState<TradePreferences>(EMPTY_TRADE_PREFERENCES);
  const [appearance, setAppearance] = useState<AppearancePreference>('system');
  const [showHelpExplanations, setShowHelpExplanations] = useState(false);
  const [tradeRevision, setTradeRevision] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const ignoreTradeEdits = useRef(false);

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

  const setInstrumentSpread = useCallback((symbol: string, spread: string) => {
    setInstrumentSpreads((current) => ({
      ...current,
      [symbol]: spread,
    }));
  }, []);

  const clearInstrumentSpread = useCallback((symbol: string) => {
    setInstrumentSpreads((current) => {
      if (!current[symbol]) {
        return current;
      }
      const next = { ...current };
      delete next[symbol];
      return next;
    });
  }, []);

  const updateTrade = useCallback((patch: Partial<TradePreferences>) => {
    if (ignoreTradeEdits.current) {
      return;
    }
    setTrade((current) => ({ ...current, ...patch }));
  }, []);

  const resetTradePreferences = useCallback(() => {
    // Android can report the previous field text while the controlled value is cleared.
    ignoreTradeEdits.current = true;
    setTrade({ ...EMPTY_TRADE_PREFERENCES });
    setTradeRevision((current) => current + 1);
    setTimeout(() => {
      ignoreTradeEdits.current = false;
    }, 400);
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
          setInstrumentSpreads(stored.instrumentSpreads ?? {});
          setTrade(stored.preferences ?? { ...EMPTY_TRADE_PREFERENCES });
          setAppearance(appearanceOrDefault(stored.appearance));
          setShowHelpExplanations(stored.showHelpExplanations === true);
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
    const payload = serializeSettings({
      currency,
      minimumLotSize,
      lotIncrement,
      instrumentLots,
      ...(Object.keys(instrumentSpreads).length > 0 ? { instrumentSpreads } : {}),
      preferences: trade,
      appearance,
      ...(showHelpExplanations ? { showHelpExplanations: true } : {}),
    });
    void AsyncStorage.setItem(SETTINGS_STORAGE_KEY, payload).catch(() => undefined);
  }, [
    appearance,
    currency,
    hydrated,
    instrumentLots,
    instrumentSpreads,
    lotIncrement,
    minimumLotSize,
    showHelpExplanations,
    trade,
  ]);

  const value = useMemo(
    () => ({
      hydrated,
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
      instrumentSpreads,
      setInstrumentSpread,
      clearInstrumentSpread,
      trade,
      tradeRevision,
      updateTrade,
      resetTradePreferences,
      appearance,
      setAppearance,
      showHelpExplanations,
      setShowHelpExplanations,
    }),
    [
      hydrated,
      currency,
      currencyNotice,
      instrumentLots,
      instrumentSpreads,
      lotIncrement,
      minimumLotSize,
      setCurrency,
      setInstrumentVolume,
      clearInstrumentVolume,
      setInstrumentSpread,
      clearInstrumentSpread,
      trade,
      tradeRevision,
      updateTrade,
      resetTradePreferences,
      appearance,
      showHelpExplanations,
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
