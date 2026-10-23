import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ResultPanel, type CapturedTrade } from '@/components/result-panel';
import { ScreenHeader } from '@/components/screen-header';
import { ScreenScroll } from '@/components/screen-scroll';
import { SegmentedControl } from '@/components/segmented-control';
import { useSettings } from '@/components/settings-context';
import { INSTRUMENTS } from '@/constants/instruments';
import { Palette, Spacing } from '@/constants/theme';
import { isPositiveDecimal, sanitizeDecimal } from '@/lib/decimal-input';

type RiskMode = 'percent' | 'amount';

type FieldKey = 'instrument' | 'balance' | 'riskValue' | 'entry' | 'stopLoss' | 'takeProfit';

type FieldErrors = Partial<Record<FieldKey, string>>;

export default function CalculatorScreen() {
  const { currency } = useSettings();
  const [instrument, setInstrument] = useState<string | null>(null);
  const [instrumentOpen, setInstrumentOpen] = useState(false);
  const [balance, setBalance] = useState('');
  const [riskMode, setRiskMode] = useState<RiskMode>('percent');
  const [riskValue, setRiskValue] = useState('');
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [trade, setTrade] = useState<CapturedTrade | null>(null);

  const selected = INSTRUMENTS.find((item) => item.symbol === instrument);

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

  function onCalculate() {
    const nextErrors: FieldErrors = {};

    if (!instrument) {
      nextErrors.instrument = 'Select an instrument';
    }
    if (!isPositiveDecimal(balance)) {
      nextErrors.balance = 'Enter an account balance greater than zero';
    }
    if (!isPositiveDecimal(riskValue)) {
      nextErrors.riskValue =
        riskMode === 'percent'
          ? 'Enter a risk percentage greater than zero'
          : `Enter a risk amount in ${currency} greater than zero`;
    }
    if (!isPositiveDecimal(entry)) {
      nextErrors.entry = 'Enter an entry price greater than zero';
    }
    if (!isPositiveDecimal(stopLoss)) {
      nextErrors.stopLoss = 'Enter a stop loss greater than zero';
    }
    if (takeProfit.trim().length > 0 && !isPositiveDecimal(takeProfit)) {
      nextErrors.takeProfit = 'Enter a take profit greater than zero, or leave it blank';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setTrade(null);
      return;
    }

    const riskLabel =
      riskMode === 'percent' ? `${riskValue.trim()}%` : `${riskValue.trim()} ${currency}`;

    setTrade({
      instrument: instrument ?? '',
      balance: balance.trim(),
      riskLabel,
      entry: entry.trim(),
      stopLoss: stopLoss.trim(),
      takeProfit: takeProfit.trim().length > 0 ? takeProfit.trim() : 'Not set',
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
          label="Account balance"
          value={balance}
          onChangeText={(value) => {
            setBalance(sanitizeDecimal(value));
            clearError('balance');
          }}
          placeholder="Enter account balance"
          error={errors.balance}
        />

        <SegmentedControl
          label="Risk"
          value={riskMode}
          onChange={(mode) => {
            setRiskMode(mode);
            clearError('riskValue');
          }}
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
          error={errors.riskValue}
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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Calculate"
          onPress={onCalculate}
          style={({ pressed }) => [styles.calculate, pressed ? styles.pressed : null]}>
          <Text style={styles.calculateLabel}>Calculate</Text>
        </Pressable>
      </View>

      <ResultPanel trade={trade} />
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
