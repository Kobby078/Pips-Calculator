import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField } from '@/components/form-field';
import { Palette, Spacing } from '@/constants/theme';
import { isPositiveDecimal, sanitizeDecimal } from '@/lib/decimal-input';
import {
  COMMON_MINIMUM_LOTS,
  describeVolumeGrid,
  minimumLotChoice,
  type InstrumentVolume,
  type ResolvedLotSettings,
} from '@/lib/lot-settings';

type BrokerVolumeProps = {
  symbol: string;
  resolved: ResolvedLotSettings;
  onChange: (volume: InstrumentVolume) => void;
  onUseDefaults: () => void;
};

export function BrokerVolume({ symbol, resolved, onChange, onUseDefaults }: BrokerVolumeProps) {
  const grid = describeVolumeGrid(resolved.minimumLot, resolved.lotIncrement);
  const [open, setOpen] = useState(grid.kind === 'incompatible' || !resolved.valid);
  const [customOpen, setCustomOpen] = useState(false);
  const choice = customOpen ? 'custom' : minimumLotChoice(resolved.minimumLot);
  const minimumError =
    resolved.valid || isPositiveDecimal(resolved.minimumLot) ? undefined : 'Enter a minimum greater than zero.';
  const incrementError =
    resolved.valid || isPositiveDecimal(resolved.lotIncrement) ? undefined : 'Enter an increment greater than zero.';

  function selectPreset(minimumLot: string) {
    setCustomOpen(false);
    onChange({ minimumLot, lotIncrement: resolved.lotIncrement });
  }

  const summary = resolved.valid
    ? `Minimum ${resolved.minimumLot}, step ${resolved.lotIncrement}`
    : 'Enter a minimum and a step';

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Broker volume for ${symbol}`}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [styles.header, pressed ? styles.pressed : null]}>
        <View style={styles.headerCopy}>
          <Text style={styles.question}>Broker volume</Text>
          <Text style={styles.hint}>{summary}</Text>
        </View>
        <Text style={styles.toggle}>{open ? 'Hide' : 'Show'}</Text>
      </Pressable>
      {!open && (grid.kind === 'incompatible' || !resolved.valid) ? (
        <Text style={styles.error}>{grid.message}</Text>
      ) : null}
      {open ? (
        <View style={styles.details}>
      <Text style={styles.hint}>
        Minimum lot is the smallest size that broker will accept. Lot increment is the step above it. A minimum
        that is not a whole number of steps is incompatible, and no size is recommended.
      </Text>
      <View style={styles.chips}>
        {COMMON_MINIMUM_LOTS.map((value) => {
          const selected = choice === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Minimum lot ${value}`}
              onPress={() => selectPreset(value)}
              style={({ pressed }) => [
                styles.chip,
                selected ? styles.chipSelected : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>{value}</Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: choice === 'custom' }}
          accessibilityLabel="Custom minimum lot"
          onPress={() => setCustomOpen(true)}
          style={({ pressed }) => [
            styles.chip,
            choice === 'custom' ? styles.chipSelected : null,
            pressed ? styles.pressed : null,
          ]}>
          <Text style={[styles.chipLabel, choice === 'custom' ? styles.chipLabelSelected : null]}>Custom</Text>
        </Pressable>
      </View>
      {choice === 'custom' ? (
        <FormField
          label="Custom minimum lot"
          value={resolved.minimumLot}
          onChangeText={(value) => onChange({ minimumLot: sanitizeDecimal(value), lotIncrement: resolved.lotIncrement })}
          placeholder="Enter a custom minimum lot"
          error={minimumError}
        />
      ) : minimumError ? (
        <Text style={styles.error}>{minimumError}</Text>
      ) : null}
      <FormField
        label="Lot increment"
        value={resolved.lotIncrement}
        onChangeText={(value) => onChange({ minimumLot: resolved.minimumLot, lotIncrement: sanitizeDecimal(value) })}
        placeholder="Enter lot increment"
        hint="Example: 0.01 or 0.001. This step can be smaller than the minimum."
        error={incrementError}
      />
      <Text style={grid.kind === 'matched' ? styles.hint : styles.error}>{grid.message}</Text>
      <Text style={styles.hint}>
        {resolved.source === 'instrument'
          ? `Using the minimum and increment saved for ${symbol}.`
          : 'Using your Settings defaults for now. These are values you chose, not a specification from your broker.'}
      </Text>
      {resolved.source === 'instrument' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use Settings defaults"
          onPress={onUseDefaults}
          style={({ pressed }) => [styles.defaults, pressed ? styles.pressed : null]}>
          <Text style={styles.defaultsLabel}>Use Settings defaults</Text>
        </Pressable>
      ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  header: {
    minHeight: 52,
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
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  toggle: {
    color: Palette.accent,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  details: {
    gap: Spacing.two,
  },
  question: {
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minWidth: 72,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.border,
    backgroundColor: Palette.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: Palette.backgroundSelected,
    borderColor: Palette.accent,
  },
  chipLabel: {
    color: Palette.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  chipLabelSelected: {
    color: Palette.text,
  },
  error: {
    color: Palette.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  defaults: {
    alignSelf: 'flex-start',
    minHeight: 36,
    justifyContent: 'center',
  },
  defaultsLabel: {
    color: Palette.accent,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
});
