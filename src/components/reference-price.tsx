import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ExternalLink } from '@/components/external-link';
import { Palette, Spacing } from '@/constants/theme';
import type { ReferenceQuoteView } from '@/hooks/use-reference-quote';
import {
  formatQuoteAge,
  formatQuoteTimestamp,
  formatReferencePrice,
  MARKET_DATA_ATTRIBUTION_URL,
  MARKET_DATA_PROVIDER,
  marketSessionLabel,
  type IndicativeConversion,
} from '@/services/market-data';

type ReferencePriceProps = {
  view: ReferenceQuoteView;
  onRefresh: () => void;
  onUsePrice: () => void;
  indicative: IndicativeConversion | null;
  accountCurrency: string;
  quoteCurrency: string | null;
  onUseRate: () => void;
};

export function ReferencePrice({
  view,
  onRefresh,
  onUsePrice,
  indicative,
  accountCurrency,
  quoteCurrency,
  onUseRate,
}: ReferencePriceProps) {
  if (view.status === 'idle') {
    return null;
  }

  if (view.status === 'unsupported') {
    return (
      <View style={styles.panel}>
        <Text style={styles.label}>Reference price</Text>
        <Text style={styles.body}>
          No reference price is available for this instrument. Enter the entry price yourself.
        </Text>
      </View>
    );
  }

  const quote = view.quote?.ok ? view.quote : null;
  const age = quote && view.observedAt !== null ? formatQuoteAge(quote.effectiveAt, view.observedAt) : null;
  const busy = view.status === 'loading';
  const sessionClosed = quote?.marketSession === 'weekend' || quote?.marketSession === 'interbank_closed';

  return (
    <View style={styles.panel}>
      <View style={styles.titleRow}>
        <Text style={styles.label}>Reference price</Text>
        <Text style={styles.delayed}>Delayed about 15 minutes</Text>
      </View>
      <Text style={styles.body}>
        Free FX reference rates can differ from MT5 broker prices. This is not a bid or ask.
      </Text>

      {busy && !quote ? <Text style={styles.price}>Loading reference price…</Text> : null}
      {quote ? <Text style={styles.price}>{formatReferencePrice(quote.price)}</Text> : null}
      {quote ? (
        <Text style={styles.meta}>
          {formatQuoteTimestamp(quote.effectiveAt)}
          {age ? ` · ${age}` : ''}
        </Text>
      ) : null}
      {quote ? <Text style={styles.meta}>{marketSessionLabel(quote.marketSession)}</Text> : null}
      {quote?.freshness === 'stale' ? <Text style={styles.warning}>This quote is stale.</Text> : null}
      {sessionClosed ? <Text style={styles.warning}>The market is closed. The last reference rate is shown.</Text> : null}
      {quote?.derived ? <Text style={styles.meta}>This pair is triangulated from other reference rates.</Text> : null}
      {quote?.notice ? <Text style={styles.meta}>{quote.notice}</Text> : null}
      {view.errorMessage ? <Text style={styles.warning}>{view.errorMessage}</Text> : null}

      <View style={styles.sourceRow}>
        <Text style={styles.meta}>Source:</Text>
        <ExternalLink href={MARKET_DATA_ATTRIBUTION_URL}>
          <Text style={styles.link}>{MARKET_DATA_PROVIDER}</Text>
        </ExternalLink>
      </View>

      {indicative && quoteCurrency ? (
        <View style={styles.conversion}>
          <Text style={styles.meta}>
            Indicative conversion: 1 {quoteCurrency} = {formatReferencePrice(indicative.rate)} {accountCurrency}.
            This is separate from a rate you type.
            {indicative.derived ? ' Triangulated from other reference rates.' : ''}
            {indicative.freshness === 'stale' ? ' This conversion is stale.' : ''}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use indicative conversion rate"
            onPress={onUseRate}
            style={({ pressed }) => [styles.secondary, pressed ? styles.pressed : null]}>
            <Text style={styles.secondaryLabel}>Use rate</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh reference price"
          disabled={busy}
          onPress={onRefresh}
          style={({ pressed }) => [styles.secondary, busy ? styles.disabled : null, pressed ? styles.pressed : null]}>
          <Text style={styles.secondaryLabel}>{view.refreshing ? 'Refreshing' : 'Refresh'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use reference price as entry"
          disabled={!quote}
          onPress={onUsePrice}
          style={({ pressed }) => [styles.primary, !quote ? styles.disabled : null, pressed ? styles.pressed : null]}>
          <Text style={styles.primaryLabel}>Use price</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: Spacing.two,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.accentSoft,
    padding: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    color: Palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  delayed: {
    color: Palette.accent,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  body: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  price: {
    color: Palette.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  meta: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  warning: {
    color: Palette.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  link: {
    color: Palette.accent,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  conversion: {
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  secondary: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  secondaryLabel: {
    color: Palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  primary: {
    minHeight: 44,
    flex: 1,
    borderRadius: 12,
    backgroundColor: Palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.82,
  },
});
