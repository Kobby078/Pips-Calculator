import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ScreenHeader } from '@/components/screen-header';
import { ScreenScroll } from '@/components/screen-scroll';
import { useSettings } from '@/components/settings-context';
import { ACCOUNT_CURRENCIES, type AccountCurrency } from '@/constants/currencies';
import { Palette, Spacing } from '@/constants/theme';
import { isPositiveDecimal, sanitizeDecimal } from '@/lib/decimal-input';

export default function SettingsScreen() {
  const {
    currency,
    setCurrency,
    currencyNotice,
    minimumLotSize,
    setMinimumLotSize,
    lotIncrement,
    setLotIncrement,
    hydrated,
    resetTradePreferences,
  } = useSettings();

  function confirmReset() {
    Alert.alert(
      'Reset preferences?',
      'This clears the saved instrument, balance, and risk. Broker lot sizes and account currency stay on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetTradePreferences },
      ],
    );
  }

  return (
    <ScreenScroll>
      <ScreenHeader
        title="Settings"
        subtitle="Saved on this device. Lot defaults apply until you set a broker size on the calculator."
      />

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Account currency</Text>
          <Text style={styles.hint}>
            Denomination for the balance and cash risk. Quote-currency results use this currency when
            a rate is known. Typed amounts are not exchanged.
          </Text>
          {currencyNotice ? <Text style={styles.hint}>{currencyNotice}</Text> : null}
          <View style={styles.currencyGrid}>
            {ACCOUNT_CURRENCIES.map((code) => {
              const selected = code === currency;
              return (
                <Pressable
                  key={code}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={code}
                  onPress={() => setCurrency(code as AccountCurrency)}
                  style={({ pressed }) => [
                    styles.currencyChip,
                    selected ? styles.currencyChipSelected : null,
                    pressed ? styles.pressed : null,
                  ]}>
                  <Text style={[styles.currencyLabel, selected ? styles.currencyLabelSelected : null]}>
                    {code}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.hint}>
          Minimum lot is the smallest size a broker will accept. Lot increment is the step above that minimum.
          They can differ. These defaults are your choices, not a check against a broker.
        </Text>
        <FormField
          label="Minimum lot size"
          value={minimumLotSize}
          onChangeText={(value) => setMinimumLotSize(sanitizeDecimal(value))}
          placeholder="Enter minimum lot size"
          hint="Example: 0.01. Used when an instrument has no saved broker size."
          error={isPositiveDecimal(minimumLotSize) ? undefined : 'Enter a minimum lot size greater than zero.'}
        />

        <FormField
          label="Lot increment"
          value={lotIncrement}
          onChangeText={(value) => setLotIncrement(sanitizeDecimal(value))}
          placeholder="Enter lot increment"
          hint="Example: 0.01. Lots step up from the minimum by this amount, and never round up."
          error={isPositiveDecimal(lotIncrement) ? undefined : 'Enter a lot increment greater than zero.'}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset preferences"
          disabled={!hydrated}
          onPress={confirmReset}
          style={({ pressed }) => [styles.reset, !hydrated ? styles.resetDisabled : null, pressed ? styles.pressed : null]}>
          <Text style={styles.resetLabel}>Reset preferences</Text>
        </Pressable>
        <Text style={styles.hint}>
          Clears the saved instrument, balance, and risk. Lot sizes and account currency stay saved.
        </Text>
      </View>
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
    gap: Spacing.four,
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
  hint: {
    color: Palette.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  currencyChip: {
    minWidth: 76,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyChipSelected: {
    backgroundColor: Palette.backgroundSelected,
    borderColor: Palette.accent,
  },
  currencyLabel: {
    color: Palette.textSecondary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  currencyLabelSelected: {
    color: Palette.text,
  },
  pressed: {
    opacity: 0.82,
  },
  reset: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceRaised,
  },
  resetDisabled: {
    opacity: 0.45,
  },
  resetLabel: {
    color: Palette.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
});
