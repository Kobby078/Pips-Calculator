import { useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrokerVolume } from '@/components/broker-volume';
import { DashboardLayout } from '@/components/dashboard-layout';
import { FieldPair } from '@/components/field-pair';
import { FormField } from '@/components/form-field';
import { FormSections } from '@/components/form-sections';
import { ReferencePrice } from '@/components/reference-price';
import { ResultPanel } from '@/components/result-panel';
import { ScreenHeader } from '@/components/screen-header';
import { ScreenScroll } from '@/components/screen-scroll';
import { SegmentedControl } from '@/components/segmented-control';
import { useSettings } from '@/components/settings-context';
import { SpreadAdjustment } from '@/components/spread-adjustment';
import { INSTRUMENTS } from '@/constants/instruments';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { useReferenceQuote } from '@/hooks/use-reference-quote';
import { calculationFingerprint } from '@/lib/calculation-fingerprint';
import { readPositiveDecimal, sanitizeDecimal } from '@/lib/decimal-input';
import { describeVolumeGrid, lotSettingsSummary, resolveLotSettings } from '@/lib/lot-settings';
import { markIndicativeConversion, presentPosition, type ResultRow } from '@/lib/present-position';
import { displayPriceDecimals } from '@/lib/price-format';
import {
  conversionAfterReferenceAction,
  indicativeQuoteToAccount,
  levelsAfterUsePrice,
} from '@/services/market-data';
import {
  calculatePosition,
  cashRiskFromPercent,
  formatRiskInput,
  percentFromCashRisk,
  requiresManualConversion,
  type RiskInputMode,
  type TradeDirection,
} from '@/lib/trading-calculations';

type FieldKey =
  | 'instrument'
  | 'balance'
  | 'riskValue'
  | 'entry'
  | 'stopLoss'
  | 'takeProfit'
  | 'conversion'
  | 'spread';

type FieldErrors = Partial<Record<FieldKey, string>>;

type PanelState = {
  inputKey: string;
  status: 'ready' | 'blocked';
  title: string;
  body: string;
  warning?: string | null;
  note?: string | null;
  lotFits?: boolean;
  recommendedLot?: string | null;
  lotDetail?: string | null;
  summary?: ResultRow[];
  metrics?: ResultRow[];
  disclosure?: string;
};

export default function CalculatorScreen() {
  const {
    hydrated,
    currency,
    currencyNotice,
    minimumLotSize,
    lotIncrement,
    instrumentLots,
    setInstrumentVolume,
    clearInstrumentVolume,
    instrumentSpreads,
    setInstrumentSpread,
    trade,
    tradeRevision,
    updateTrade,
    showHelpExplanations,
  } = useSettings();
  const styles = useThemedStyles(createCalculatorStyles);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const instrument = trade.instrument;
  const balance = trade.balance;
  const riskMode = trade.riskMode;
  const riskValue = trade.riskValue;
  const spreadEnabled = trade.spreadEnabled ?? false;
  const spreadPriceMode = trade.spreadPriceMode ?? 'chart';
  const currentSpread = instrument ? (instrumentSpreads[instrument] ?? '') : '';
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [direction, setDirection] = useState<TradeDirection>('buy');
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [conversionRate, setConversionRate] = useState('');
  const [appliedRate, setAppliedRate] = useState<{ instrument: string; account: string; value: string } | null>(
    null,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [panel, setPanel] = useState<PanelState | null>(null);

  const selected = INSTRUMENTS.find((item) => item.symbol === instrument) ?? null;
  const reference = useReferenceQuote(selected);
  const needsConversion = requiresManualConversion(selected?.spec ?? null, currency);
  const indicative =
    reference.quote?.ok === true
      ? indicativeQuoteToAccount(
          reference.quote.baseCurrency,
          reference.quote.legs,
          reference.quote.quoteCurrency,
          currency,
          reference.quote.derivedSymbols,
        )
      : null;
  const conversionIsIndicative =
    appliedRate !== null &&
    appliedRate.instrument === instrument &&
    appliedRate.account === currency &&
    appliedRate.value === conversionRate &&
    conversionRate.length > 0;
  const quoteCurrency = selected?.spec?.quoteCurrency;
  const lots = resolveLotSettings({
    symbol: instrument,
    globalMinimum: minimumLotSize,
    globalIncrement: lotIncrement,
    instrumentLots,
  });
  const inputKey = calculationFingerprint({
    instrument,
    direction,
    balance,
    riskMode,
    riskValue,
    entry,
    stopLoss,
    takeProfit,
    conversionRate,
    accountCurrency: currency,
    minimumLotSize: lots.minimumLot,
    lotIncrement: lots.lotIncrement,
    lotSource: lots.source,
    spreadEnabled,
    spreadValue: currentSpread,
    spreadPriceMode,
  });
  const outdated = panel !== null && panel.inputKey !== inputKey;

  function clearError(key: FieldKey) {
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function onRiskModeChange(next: RiskInputMode) {
    if (next === riskMode) {
      return;
    }
    const balanceNumber = readPositiveDecimal(balance);
    const riskNumber = readPositiveDecimal(riskValue);
    if (typeof balanceNumber === 'number' && typeof riskNumber === 'number') {
      const converted =
        next === 'amount'
          ? cashRiskFromPercent(balanceNumber, riskNumber)
          : percentFromCashRisk(balanceNumber, riskNumber);
      updateTrade({ riskMode: next, riskValue: formatRiskInput(converted) });
    } else {
      updateTrade({ riskMode: next });
    }
    clearError('riskValue');
  }

  function onCalculate() {
    if (!lots.valid) {
      const where =
        lots.source === 'instrument' && instrument
          ? `for ${instrument}`
          : 'in Settings';
      setPanel({
        inputKey,
        status: 'blocked',
        title: 'Cannot calculate',
        body: `Enter a minimum lot size and a lot increment greater than zero ${where}.`,
      });
      return;
    }

    const grid = describeVolumeGrid(lots.minimumLot, lots.lotIncrement);
    if (grid.kind === 'incompatible') {
      setPanel({
        inputKey,
        status: 'blocked',
        title: 'Cannot calculate',
        body: grid.message,
      });
      return;
    }

    const result = calculatePosition({
      instrument: selected ?? null,
      direction,
      balance: readPositiveDecimal(balance),
      riskMode,
      riskValue: readPositiveDecimal(riskValue),
      entry: readPositiveDecimal(entry),
      stopLoss: readPositiveDecimal(stopLoss),
      takeProfit: readPositiveDecimal(takeProfit),
      accountCurrency: currency,
      minimumLot: readPositiveDecimal(lots.minimumLot),
      lotIncrement: readPositiveDecimal(lots.lotIncrement),
      manualQuoteToAccountRate: needsConversion ? readPositiveDecimal(conversionRate) : 'empty',
      spread: {
        enabled: spreadEnabled,
        priceMode: spreadPriceMode,
        value: readPositiveDecimal(currentSpread),
      },
    });

    if (!result.ok) {
      const nextErrors: FieldErrors = {};
      for (const error of result.errors) {
        if (error.field === 'lots') {
          continue;
        }
        const key = error.field === 'risk' ? 'riskValue' : error.field;
        nextErrors[key] = nextErrors[key] ? `${nextErrors[key]} ${error.message}` : error.message;
      }
      setErrors(nextErrors);
      setPanel({
        inputKey,
        status: 'blocked',
        title: 'Cannot calculate',
        body: result.errors.map((error) => error.message).join(' '),
      });
      return;
    }

    const presented = presentPosition(result);
    const note = [presented.note, grid.kind === 'unverified' ? grid.message : null].filter(Boolean).join(' ');
    setErrors({});
    setPanel({
      inputKey,
      status: 'ready',
      title: presented.title,
      body: presented.body,
      warning: presented.warning,
      note: note || null,
      lotFits: presented.lotFits,
      recommendedLot: presented.recommendedLot,
      lotDetail: presented.lotDetail,
      summary: [
        ...(conversionIsIndicative ? markIndicativeConversion(presented.summary) : presented.summary),
        lotSettingsSummary(lots.source, result.symbol),
      ],
      metrics: presented.metrics,
      disclosure: presented.disclosure,
    });
    if (Platform.OS !== 'web' || window.innerWidth < 1024) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      });
    }
  }

  function onUsePrice() {
    const price = reference.quote?.ok ? reference.quote.price : null;
    if (price === null) {
      return;
    }
    const next = levelsAfterUsePrice(
      { entry, stopLoss, takeProfit },
      price,
      displayPriceDecimals(selected?.spec ?? null),
    );
    setEntry(next.entry);
    clearError('entry');
  }

  function onUseRate() {
    if (!indicative || !instrument) {
      return;
    }
    const next = conversionAfterReferenceAction(conversionRate, indicative.rate, 'use-rate');
    setConversionRate(next);
    setAppliedRate({ instrument, account: currency, value: next });
    clearError('conversion');
  }

  function calculateButton(label: string, dock: boolean) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onCalculate}
        style={({ pressed }) => [dock ? styles.calculate : styles.inlineCalculate, pressed ? styles.pressed : null]}>
        <Text style={styles.calculateLabel}>{label}</Text>
      </Pressable>
    );
  }

  if (!hydrated) {
    return (
      <ScreenScroll>
        <ScreenHeader
          title="Risk Calculator"
          subtitle="Size a position from your balance, risk, and price levels. Reference prices are indicative."
        />
      </ScreenScroll>
    );
  }

  return (
    <ScreenScroll
      ref={scrollRef}
      footer={calculateButton('Calculate', true)}>
      <ScreenHeader
        title="Risk Calculator"
        subtitle="Size a position from your balance, risk, and price levels. Reference prices are indicative."
      />

      <DashboardLayout
        setup={
          <FormSections
            sections={[
              {
                key: 'trade',
                title: 'Trade',
                children: (
                  <FieldPair>
                    <View style={styles.field}>
          <Text style={styles.label}>Instrument</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: instrumentOpen }}
            accessibilityLabel="Select an instrument"
            onPress={() => setInstrumentOpen((open) => !open)}
            style={[styles.selector, errors.instrument ? styles.selectorError : null]}>
            <View style={styles.selectorCopy}>
              <Text style={selected ? styles.selectorValue : styles.placeholder}>
                {selected ? selected.symbol : 'Select an instrument'}
              </Text>
              <Text style={styles.selectorHint}>
                {selected ? selected.name : 'Choose a symbol to size'}
              </Text>
            </View>
            <Text style={styles.chevron}>{instrumentOpen ? 'Hide' : 'Choose'}</Text>
          </Pressable>
          {errors.instrument ? <Text style={styles.error}>{errors.instrument}</Text> : null}
          {selected?.spec?.assumptionNote ? (
            <Text style={styles.selectorHint}>{selected.spec.assumptionNote}</Text>
          ) : null}
          {instrumentOpen ? (
            <View style={styles.instrumentList}>
              {INSTRUMENTS.map((item) => {
                const active = item.symbol === instrument;
                return (
                  <Pressable
                    key={item.symbol}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      updateTrade({ instrument: item.symbol });
                      setInstrumentOpen(false);
                      clearError('instrument');
                      clearError('conversion');
                    }}
                    style={({ pressed }) => [
                      styles.instrumentRow,
                      active ? styles.instrumentRowActive : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <Text style={styles.instrumentSymbol}>{item.symbol}</Text>
                    <Text style={styles.instrumentName}>{item.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
                    </View>
                    <SegmentedControl
          label="Direction"
          value={direction}
          onChange={(next) => {
            setDirection(next);
            clearError('stopLoss');
            clearError('takeProfit');
          }}
          options={[
            { value: 'buy', label: 'Buy' },
            { value: 'sell', label: 'Sell' },
          ]}
                    />
                  </FieldPair>
                ),
              },
              {
                key: 'risk',
                title: 'Account and risk',
                children: (
                  <FieldPair>
                    <FormField
                      key={`balance-${tradeRevision}`}
                      label={`Account balance (${currency})`}
                      value={balance}
                      onChangeText={(value) => {
                        updateTrade({ balance: sanitizeDecimal(value) });
                        clearError('balance');
                      }}
                      placeholder={`Enter balance in ${currency}`}
                      hint={
                        currencyNotice ??
                        `Denominated in ${currency}. Changing the account currency does not convert this number.`
                      }
                      hintVisible={currencyNotice !== null || showHelpExplanations}
                      helpTopic="balance"
                      error={errors.balance}
                    />
                    <View style={styles.riskStack}>
                      <SegmentedControl
                        label="Risk"
                        value={riskMode}
                        onChange={onRiskModeChange}
                        helpTopic="risk"
                        options={[
                          { value: 'percent', label: 'Percentage' },
                          { value: 'amount', label: currency },
                        ]}
                      />

                      <FormField
                        key={`risk-${tradeRevision}`}
                        label={riskMode === 'percent' ? 'Risk percentage' : `Risk amount (${currency})`}
                        value={riskValue}
                        onChangeText={(value) => {
                          updateTrade({ riskValue: sanitizeDecimal(value) });
                          clearError('riskValue');
                        }}
                        placeholder={riskMode === 'percent' ? 'Enter risk percentage' : `Enter risk in ${currency}`}
                        hint={
                          riskMode === 'amount'
                            ? `Denominated in ${currency}. Changing the account currency does not convert this number.`
                            : undefined
                        }
                        hintVisible={showHelpExplanations}
                        helpTopic="risk"
                        error={errors.riskValue}
                      />
                    </View>
                  </FieldPair>
                ),
              },
              {
                key: 'levels',
                title: 'Price levels',
                children: (
                  <>
                    <FieldPair>
                      <FormField
                        label="Entry price"
                        value={entry}
                        onChangeText={(value) => {
                          setEntry(sanitizeDecimal(value));
                          clearError('entry');
                        }}
                        placeholder="Enter entry price"
                        helpTopic="entry"
                        error={errors.entry}
                      />

                      <FormField
                        label="Stop loss"
                        value={stopLoss}
                        onChangeText={(value) => {
                          setStopLoss(sanitizeDecimal(value));
                          clearError('stopLoss');
                        }}
                        placeholder="Enter stop loss"
                        helpTopic="stopLoss"
                        error={errors.stopLoss}
                      />
                    </FieldPair>
                    <FormField
                      label="Take profit"
                      value={takeProfit}
                      onChangeText={(value) => {
                        setTakeProfit(sanitizeDecimal(value));
                        clearError('takeProfit');
                      }}
                      placeholder="Enter take profit"
                      hint="Leave blank if you only want to define the stop."
                      hintVisible={showHelpExplanations}
                      helpTopic="takeProfit"
                      optional
                      error={errors.takeProfit}
                    />
                  </>
                ),
              },
              {
                key: 'spread',
                title: 'Spread',
                plain: true,
                children: (
                  <SpreadAdjustment
                    symbol={selected?.symbol ?? null}
                    isGold={selected?.spec?.baseCurrency === 'XAU' || selected?.spec?.kind === 'metal'}
                    enabled={spreadEnabled}
                    onToggleEnabled={(enabled) => {
                      updateTrade({ spreadEnabled: enabled });
                      clearError('spread');
                    }}
                    priceMode={spreadPriceMode}
                    onChangePriceMode={(mode) => updateTrade({ spreadPriceMode: mode })}
                    value={currentSpread}
                    onChangeValue={(val) => {
                      if (instrument) {
                        setInstrumentSpread(instrument, sanitizeDecimal(val));
                        clearError('spread');
                      }
                    }}
                    error={errors.spread}
                  />
                ),
              },
              {
                key: 'market',
                title: 'Reference',
                plain: true,
                children: (
                  <>
                    <ReferencePrice
          view={reference}
          variant={
            selected?.spec?.baseCurrency === 'XAU' && selected?.spec?.quoteCurrency === 'USD' ? 'gold' : 'forex'
          }
          priceDecimals={displayPriceDecimals(selected?.spec ?? null)}
          onRefresh={reference.refresh}
          onUsePrice={onUsePrice}
          indicative={needsConversion ? indicative : null}
          accountCurrency={currency}
          quoteCurrency={quoteCurrency ?? null}
          onUseRate={onUseRate}
        />

        {needsConversion && quoteCurrency ? (
          <FormField
            label={`${quoteCurrency} to ${currency} rate`}
            value={conversionRate}
            onChangeText={(value) => {
              setConversionRate(sanitizeDecimal(value));
              clearError('conversion');
            }}
            placeholder={`Enter ${currency} per 1 ${quoteCurrency}`}
            hint={
              conversionIsIndicative
                ? `Indicative reference rate from exchangerate.dev. Edit this field to override it. Refresh will not change it.`
                : `Manual ${quoteCurrency} to ${currency} rate. A reference rate will not replace this value.`
            }
            hintVisible={showHelpExplanations}
            helpTopic="conversion"
            error={errors.conversion}
          />
        ) : null}

        {selected ? (
          <BrokerVolume
            key={selected.symbol}
            symbol={selected.symbol}
            resolved={lots}
            onChange={(volume) => setInstrumentVolume(selected.symbol, volume)}
            onUseDefaults={() => clearInstrumentVolume(selected.symbol)}
          />
        ) : null}
                  </>
                ),
              },
            ]}
          />
        }
        result={
          <ResultPanel
            status={panel === null ? 'empty' : outdated ? 'outdated' : panel.status}
            title={panel && !outdated ? panel.title : undefined}
            body={panel && !outdated ? panel.body : undefined}
            warning={panel && !outdated ? panel.warning : null}
            note={panel && !outdated ? panel.note : null}
            lotFits={panel && !outdated && panel.status === 'ready' ? panel.lotFits : undefined}
            recommendedLot={panel && !outdated && panel.status === 'ready' ? panel.recommendedLot : null}
            lotDetail={panel && !outdated && panel.status === 'ready' ? panel.lotDetail : null}
            summary={panel && !outdated ? panel.summary : []}
            metrics={panel && !outdated ? panel.metrics : undefined}
            disclosure={panel && !outdated ? panel.disclosure : undefined}
          />
        }
        calculate={calculateButton('Calculate Risk', false)}
      />
    </ScreenScroll>
  );
}

function createCalculatorStyles(colors: ThemeColors) {
  return StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  selector: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  selectorError: {
    borderColor: colors.error,
  },
  selectorCopy: {
    flex: 1,
    gap: 2,
  },
  selectorValue: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
  },
  selectorHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    color: colors.accent,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  error: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
  },
  instrumentList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  instrumentRow: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  instrumentRowActive: {
    backgroundColor: colors.backgroundSelected,
  },
  instrumentSymbol: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  instrumentName: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  riskStack: {
    gap: Spacing.three,
  },
    calculate: {
      minHeight: 56,
      borderRadius: 14,
      backgroundColor: colors.button,
      alignItems: 'center',
      justifyContent: 'center',
      maxWidth: 640,
      width: '100%',
      alignSelf: 'center',
      ...Platform.select({
        android: {
          elevation: 3,
        },
        ios: {
          shadowColor: '#341A59',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
        },
      }),
    },
    inlineCalculate: {
      minHeight: 56,
      borderRadius: 14,
      backgroundColor: colors.button,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      ...Platform.select({
        android: {
          elevation: 3,
        },
        ios: {
          shadowColor: '#341A59',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
        },
      }),
    },
  calculateLabel: {
    color: colors.buttonText,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.82,
  },
});
}
