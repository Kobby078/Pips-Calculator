import { useEffect, useRef, useState } from 'react';

import { ACCOUNT_CURRENCIES } from '@/constants/currencies';
import type { Instrument } from '@/constants/instruments';
import {
  createQuoteRequestGate,
  marketData,
  supportsReferencePrice,
  type MarketQuote,
} from '@/services/market-data';

export type ReferenceQuoteStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

export type ReferenceQuoteView = {
  status: ReferenceQuoteStatus;
  quote: MarketQuote | null;
  errorMessage: string | null;
  refreshing: boolean;
  /** Clock time when the current quote arrived. Age is measured from this stamp. */
  observedAt: number | null;
};

export function useReferenceQuote(instrument: Instrument | null): ReferenceQuoteView & { refresh: () => void } {
  const gate = useRef(createQuoteRequestGate());
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [observedAt, setObservedAt] = useState<number | null>(null);
  const [requestKey, setRequestKey] = useState('');

  const supported = supportsReferencePrice(instrument?.spec);
  const nextKey =
    supported && instrument?.spec
      ? `${instrument.symbol}|${instrument.spec.baseCurrency}|${instrument.spec.quoteCurrency}`
      : '';

  if (nextKey !== requestKey) {
    setRequestKey(nextKey);
    setQuote(null);
    setErrorMessage(null);
    setRefreshing(false);
    setObservedAt(null);
  }

  useEffect(() => {
    if (!nextKey || !instrument?.spec || instrument.spec.kind !== 'forex') {
      return;
    }
    const spec = instrument.spec;
    const symbol = instrument.symbol;
    const request = gate.current.begin();
    let active = true;
    void marketData
      .fetchReferenceQuote({
        instrument: symbol,
        baseCurrency: spec.baseCurrency,
        quoteCurrency: spec.quoteCurrency,
        relatedCurrencies: ACCOUNT_CURRENCIES,
      })
      .then((result) => {
        if (!active || !gate.current.accept(request.id)) {
          return;
        }
        if (result.ok) {
          setQuote(result);
          setObservedAt(Date.now());
          setErrorMessage(null);
          return;
        }
        if (result.error.code !== 'cancelled') {
          setErrorMessage(result.error.message);
        }
      });
    return () => {
      active = false;
    };
  }, [instrument, nextKey]);

  function refresh() {
    if (!nextKey || !instrument?.spec || instrument.spec.kind !== 'forex') {
      return;
    }
    const spec = instrument.spec;
    const symbol = instrument.symbol;
    const request = gate.current.begin();
    setRefreshing(true);
    void marketData
      .fetchReferenceQuote(
        {
          instrument: symbol,
          baseCurrency: spec.baseCurrency,
          quoteCurrency: spec.quoteCurrency,
          relatedCurrencies: ACCOUNT_CURRENCIES,
        },
        { refresh: true },
      )
      .then((result) => {
        if (!gate.current.accept(request.id)) {
          return;
        }
        setRefreshing(false);
        if (result.ok) {
          setQuote(result);
          setObservedAt(Date.now());
          setErrorMessage(null);
          return;
        }
        if (result.error.code !== 'cancelled') {
          setErrorMessage(result.error.message);
        }
      });
  }

  const currentQuote = quote?.ok && quote.instrument === instrument?.symbol ? quote : null;
  const status: ReferenceQuoteStatus = !instrument
    ? 'idle'
    : !supported
      ? 'unsupported'
      : refreshing
        ? 'loading'
        : currentQuote
          ? 'ready'
          : errorMessage
            ? 'error'
            : 'loading';

  return {
    status,
    quote: currentQuote,
    errorMessage,
    refreshing,
    observedAt,
    refresh,
  };
}
