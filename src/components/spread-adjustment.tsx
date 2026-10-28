import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { SegmentedControl } from '@/components/segmented-control';
import { useSettings } from '@/components/settings-context';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import type { PriceLevelMode } from '@/lib/trading-calculations';

type SpreadAdjustmentProps = {
  symbol: string | null;
  isGold: boolean;
  enabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  priceMode: PriceLevelMode;
  onChangePriceMode: (mode: PriceLevelMode) => void;
  value: string;
  onChangeValue: (value: string) => void;
  error?: string;
};

export function SpreadAdjustment({
  symbol,
  isGold,
  enabled,
  onToggleEnabled,
  priceMode,
  onChangePriceMode,
  value,
  onChangeValue,
  error,
}: SpreadAdjustmentProps) {
  const { showHelpExplanations } = useSettings();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);

  const unit = isGold ? 'USD' : 'pips';
  const displayValue = value.trim() ? value : '0';
  const modeLabel = priceMode === 'chart' ? 'Chart levels' : 'Executable prices';
  const summary = enabled
    ? `${displayValue} ${unit} · ${modeLabel}`
    : 'Disabled';

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Spread adjustment for ${symbol ?? 'instrument'}`}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.header, pressed ? styles.pressed : null]}>
        <View style={styles.headerCopy}>
          <Text style={styles.question}>Spread adjustment</Text>
          <Text style={styles.hint}>{summary}</Text>
        </View>
        <Text style={styles.toggle}>{open ? 'Hide' : 'Show'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.details}>
          <SegmentedControl
            label="Spread calculation"
            value={enabled ? 'enabled' : 'disabled'}
            onChange={(selected) => onToggleEnabled(selected === 'enabled')}
            options={[
              { value: 'disabled', label: 'Disabled' },
              { value: 'enabled', label: 'Enabled' },
            ]}
          />

          {enabled ? (
            <>
              <SegmentedControl
                label="Price mode"
                value={priceMode}
                onChange={onChangePriceMode}
                helpTopic="priceMode"
                options={[
                  { value: 'chart', label: 'Chart levels' },
                  { value: 'executable', label: 'Executable prices' },
                ]}
              />

              {showHelpExplanations ? (
                <Text style={styles.modeExplanation}>
                  {priceMode === 'chart'
                    ? 'Chart levels: Bid/Ask execution is modeled. Buy enters at Ask and exits at Bid; Sell enters at Bid and exits at Ask. The spread expands your stop distance and narrows your reward distance without double counting.'
                    : 'Executable prices: Your entry and exit prices already reflect broker execution. Existing price differences are used directly without double-counting spread.'}
                </Text>
              ) : null}

              <FormField
                label={isGold ? 'Spread (USD price difference)' : 'Spread (pips)'}
                value={value}
                onChangeText={onChangeValue}
                placeholder={isGold ? 'e.g. 0.35' : 'e.g. 1.2'}
                hint={
                  isGold
                    ? 'Enter gold spread as a USD dollar difference per ounce. Free market quotes do not include broker spreads.'
                    : 'Enter spread in pips. Free market quotes do not include broker spreads.'
                }
                hintVisible={showHelpExplanations}
                helpTopic="spread"
                error={error}
              />

              <Text style={styles.disclaimer}>
                Reference quotes from free APIs are indicative and do not supply broker executable spreads. Commission and slippage remain excluded.
              </Text>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: Spacing.two,
    },
    header: {
      minHeight: 52,
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
    headerCopy: {
      flex: 1,
      gap: 2,
    },
    question: {
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
    toggle: {
      color: colors.accent,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: '700',
    },
    details: {
      gap: Spacing.three,
      paddingTop: Spacing.one,
    },
    modeExplanation: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    disclaimer: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
    },
    pressed: {
      opacity: 0.82,
    },
  });
}
