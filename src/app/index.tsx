import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ResultPanel } from '@/components/result-panel';
import { ScreenHeader } from '@/components/screen-header';
import { ScreenScroll } from '@/components/screen-scroll';
import { SegmentedControl } from '@/components/segmented-control';
import { useSettings } from '@/components/settings-context';
import { INSTRUMENTS } from '@/constants/instruments';
import { Palette, Spacing } from '@/constants/theme';
import { calculationFingerprint } from '@/lib/calculation-fingerprint';
import { readPositiveDecimal, sanitizeDecimal } from '@/lib/decimal-input';
import { presentPosition, type ResultRow } from '@/lib/present-position';
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
  | 'conversion';

type FieldErrors = Partial<Record<FieldKey, string>>;

type PanelState = {
  inputKey: string;
  status: 'ready' | 'blocked';
  title: string;
  body: string;
  warning?: string | null;
  note?: string | null;
  summary?: ResultRow[];
  metrics?: ResultRow[];
};

export default function CalculatorScreen() {
  const { currency, currencyNotice, minimumLotSize, lotIncrement } = useSettings();
  const [instrument, setInstrument] = useState<string | null>(null);
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [direction, setDirection] = useState<TradeDirection>('buy');
  const [balance, setBalance] = useState('');
  const [riskMode, setRiskMode] = useState<RiskInputMode>('percent');
  const [riskValue, setRiskValue] = useState('');
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [conversionRate, setConversionRate] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [panel, setPanel] = useState<PanelState | null>(null);

  const selected = INSTRUMENTS.find((item) => item.symbol === instrument);
  const needsConversion = requiresManualConversion(selected?.spec ?? null, currency);
  const quoteCurrency = selected?.spec?.quoteCurrency;
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
    minimumLotSize,
    lotIncrement,
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
      setRiskValue(formatRiskInput(converted));
    }
    setRiskMode(next);
    clearError('riskValue');
  }

  function onCalculate() {
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
      minimumLot: readPositiveDecimal(minimumLotSize),
      lotIncrement: readPositiveDecimal(lotIncrement),
      manualQuoteToAccountRate: needsConversion ? readPositiveDecimal(conversionRate) : 'empty',
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
    setErrors({});
    setPanel({
      inputKey,
      status: 'ready',
      title: presented.title,
      body: presented.body,
      warning: presented.warning,
      note: presented.note,
      summary: presented.summary,
      metrics: presented.metrics,
    });
  }

  return (
    <ScreenScroll>
      <ScreenHeader
        title="Risk Calculator"
        subtitle="Set the trade levels you want to size. No live prices are loaded."
      />

      <View style={styles.card}>
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
                      setInstrument(item.symbol);
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

        <FormField
          label={`Account balance (${currency})`}
          value={balance}
          onChangeText={(value) => {
            setBalance(sanitizeDecimal(value));
            clearError('balance');
          }}
          placeholder={`Enter balance in ${currency}`}
          hint={
            currencyNotice ??
            `Denominated in ${currency}. Changing the account currency does not convert this number.`
          }
          error={errors.balance}
        />

        <SegmentedControl
          label="Risk"
          value={riskMode}
          onChange={onRiskModeChange}
          options={[
            { value: 'percent', label: 'Percentage' },
            { value: 'amount', label: currency },
          ]}
        />

        <FormField
          label={riskMode === 'percent' ? 'Risk percentage' : `Risk amount (${currency})`}
          value={riskValue}
          onChangeText={(value) => {
            setRiskValue(sanitizeDecimal(value));
            clearError('riskValue');
          }}
          placeholder={riskMode === 'percent' ? 'Enter risk percentage' : `Enter risk in ${currency}`}
          hint={
            riskMode === 'amount'
              ? `Denominated in ${currency}. Changing the account currency does not convert this number.`
              : undefined
          }
          error={errors.riskValue}
        />

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

        <FormField
          label="Entry price"
          value={entry}
          onChangeText={(value) => {
            setEntry(sanitizeDecimal(value));
            clearError('entry');
          }}
          placeholder="Enter entry price"
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
          error={errors.stopLoss}
        />

        <FormField
          label="Take profit"
          value={takeProfit}
          onChangeText={(value) => {
            setTakeProfit(sanitizeDecimal(value));
            clearError('takeProfit');
          }}
          placeholder="Enter take profit"
          hint="Leave blank if you only want to define the stop."
          optional
          error={errors.takeProfit}
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
            hint={`How many ${currency} equal 1 ${quoteCurrency}. This rate is not loaded from the market.`}
            error={errors.conversion}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Calculate"
          onPress={onCalculate}
          style={({ pressed }) => [styles.calculate, pressed ? styles.pressed : null]}>
          <Text style={styles.calculateLabel}>Calculate</Text>
        </Pressable>
      </View>

      <ResultPanel
        status={panel === null ? 'empty' : outdated ? 'outdated' : panel.status}
        title={panel && !outdated ? panel.title : undefined}
        body={panel && !outdated ? panel.body : undefined}
        warning={panel && !outdated ? panel.warning : null}
        note={panel && !outdated ? panel.note : null}
        summary={panel && !outdated ? panel.summary : []}
        metrics={panel && !outdated ? panel.metrics : undefined}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.backgroundElement,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  label: {
    color: Palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  selector: {
    minHeight: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceRaised,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  selectorError: {
    borderColor: Palette.danger,
  },
  selectorCopy: {
    flex: 1,
    gap: 2,
  },
  selectorValue: {
    color: Palette.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  placeholder: {
    color: Palette.textMuted,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '500',
  },
  selectorHint: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  chevron: {
    color: Palette.accent,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  error: {
    color: Palette.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  instrumentList: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    overflow: 'hidden',
  },
  instrumentRow: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
    gap: 2,
    backgroundColor: Palette.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  instrumentRowActive: {
    backgroundColor: Palette.backgroundSelected,
  },
  instrumentSymbol: {
    color: Palette.text,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  instrumentName: {
    color: Palette.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  calculate: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: Palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  calculateLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.82,
  },
});
