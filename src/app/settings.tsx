import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { ScreenHeader } from '@/components/screen-header';
import { ScreenScroll } from '@/components/screen-scroll';
import { useSettings } from '@/components/settings-context';
import { ACCOUNT_CURRENCIES, type AccountCurrency } from '@/constants/currencies';
import { SettingsContentWidth, Spacing, type ThemeColors } from '@/constants/theme';
import { useResolvedColorScheme, useThemedStyles } from '@/hooks/use-theme';
import type { AppearancePreference } from '@/lib/appearance';
import { isPositiveDecimal, sanitizeDecimal } from '@/lib/decimal-input';
import { TRADING_RISK_DISCLOSURE } from '@/lib/present-position';

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
    appearance,
    setAppearance,
    showHelpExplanations,
    setShowHelpExplanations,
  } = useSettings();
  const scheme = useResolvedColorScheme();
  const styles = useThemedStyles(createStyles);
  const [confirmingReset, setConfirmingReset] = useState(false);

  function confirmReset() {
    if (Platform.OS === 'web') {
      setConfirmingReset(true);
      return;
    }
    Alert.alert(
      'Reset preferences?',
      'This clears the saved instrument, balance, and risk. Broker lot sizes, account currency, appearance, and display settings stay on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetTradePreferences },
      ],
    );
  }

  function applyWebReset() {
    resetTradePreferences();
    setConfirmingReset(false);
  }

  return (
    <ScreenScroll key={`settings-scroll-${scheme}`}>
      <View style={styles.column}>
      <ScreenHeader
        title="Settings"
        subtitle="Saved on this device. Lot defaults apply until you set a broker size on the calculator."
      />

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Appearance</Text>
          <Text style={styles.hint}>
            System Default follows this device. Light and Dark stay fixed inside the app.
          </Text>
          <View style={styles.appearanceList}>
            {(
              [
                ['system', 'System Default'],
                ['light', 'Light'],
                ['dark', 'Dark'],
              ] as const
            ).map(([value, label]) => {
              const selected = appearance === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={label}
                  onPress={() => setAppearance(value as AppearancePreference)}
                  style={({ pressed }) => [
                    styles.appearanceOption,
                    selected ? styles.appearanceOptionSelected : null,
                    pressed ? styles.pressed : null,
                  ]}>
                  <Text style={[styles.appearanceLabel, selected ? styles.appearanceLabelSelected : null]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.field}>
          <Text style={styles.label}>Help guidance</Text>
          <Text style={styles.hint}>
            Show supplementary guidance below relevant inputs. When off, tap the (i) information buttons beside input labels for on-demand help.
          </Text>
          <View style={styles.appearanceList}>
            {[
              { value: false, label: 'Off (Compact mode)' },
              { value: true, label: 'On (Show helpful explanations)' },
            ].map((option) => {
              const selected = showHelpExplanations === option.value;
              return (
                <Pressable
                  key={option.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={option.label}
                  onPress={() => setShowHelpExplanations(option.value)}
                  style={({ pressed }) => [
                    styles.appearanceOption,
                    selected ? styles.appearanceOptionSelected : null,
                    pressed ? styles.pressed : null,
                  ]}>
                  <Text style={[styles.appearanceLabel, selected ? styles.appearanceLabelSelected : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

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

        {showHelpExplanations ? (
          <Text style={styles.hint}>
            Minimum lot is the smallest size a broker will accept. Lot increment is the step above that minimum.
            They can differ. These defaults are your choices, not a check against a broker.
          </Text>
        ) : null}
        <FormField
          label="Minimum lot size"
          value={minimumLotSize}
          onChangeText={(value) => setMinimumLotSize(sanitizeDecimal(value))}
          placeholder="Enter minimum lot size"
          hint="Example: 0.01. Used when an instrument has no saved broker size."
          hintVisible={showHelpExplanations}
          helpTopic="minimumLot"
          error={isPositiveDecimal(minimumLotSize) ? undefined : 'Enter a minimum lot size greater than zero.'}
        />

        <FormField
          label="Lot increment"
          value={lotIncrement}
          onChangeText={(value) => setLotIncrement(sanitizeDecimal(value))}
          placeholder="Enter lot increment"
          hint="Example: 0.01. Lots step up from the minimum by this amount, and never round up."
          hintVisible={showHelpExplanations}
          helpTopic="lotIncrement"
          error={isPositiveDecimal(lotIncrement) ? undefined : 'Enter a lot increment greater than zero.'}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reset preferences"
          disabled={!hydrated}
          onPress={confirmReset}
          style={({ pressed }) => [styles.reset, !hydrated ? styles.resetDisabled : null, pressed ? styles.pressed : null]}>
          <Text style={[styles.resetLabel, !hydrated ? styles.resetLabelDisabled : null]}>Reset preferences</Text>
        </Pressable>
        <Text style={styles.hint}>
          Clears the saved instrument, balance, and risk. Lot sizes, account currency, appearance, and display settings stay saved.
        </Text>
        {confirmingReset ? (
          <View style={styles.confirm}>
            <Text style={styles.label}>Reset preferences?</Text>
            <Text style={styles.hint}>
              This clears the saved instrument, balance, and risk. Broker lot sizes, account currency, appearance, and display settings stay on this
              device.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirmingReset(false)}
                style={({ pressed }) => [styles.reset, styles.confirmAction, pressed ? styles.pressed : null]}>
                <Text style={styles.resetLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={applyWebReset}
                style={({ pressed }) => [styles.reset, styles.confirmAction, pressed ? styles.pressed : null]}>
                <Text style={styles.resetLabel}>Reset</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
      <Text style={styles.disclaimer}>{TRADING_RISK_DISCLOSURE}</Text>
      </View>
    </ScreenScroll>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  column: {
    width: '100%',
    maxWidth: SettingsContentWidth,
    alignSelf: 'flex-start',
    gap: Spacing.three,
  },
    card: {
      backgroundColor: colors.backgroundElement,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: Spacing.three,
      gap: Spacing.four,
      ...Platform.select({
        android: {
          elevation: 1.5,
        },
        ios: {
          shadowColor: '#3A2E50',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
      }),
    },
  field: {
    gap: Spacing.two,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  hint: {
    color: colors.textMuted,
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
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyChipSelected: {
    backgroundColor: colors.backgroundSelected,
    borderColor: colors.accent,
  },
  currencyLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
  },
  currencyLabelSelected: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.82,
  },
  reset: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
  },
  resetDisabled: {
    opacity: 0.45,
  },
  resetLabel: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  confirm: {
    gap: Spacing.two,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  confirmAction: {
    flex: 1,
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  resetLabelDisabled: {
    color: colors.disabled,
  },
  appearanceList: {
    gap: Spacing.two,
  },
  appearanceOption: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: Spacing.three,
    justifyContent: 'center',
  },
  appearanceOptionSelected: {
    backgroundColor: colors.backgroundSelected,
    borderColor: colors.accent,
  },
  appearanceLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  appearanceLabelSelected: {
    color: colors.text,
  },
});
}
