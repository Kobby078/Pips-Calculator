import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { HelpButton, HelpCallout } from '@/components/help-info';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import type { HelpTopic } from '@/lib/help-content';

type Segment<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: readonly Segment<T>[];
  onChange: (value: T) => void;
  helpTopic?: HelpTopic;
};

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  helpTopic,
}: SegmentedControlProps<T>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={styles.labelWithHelp}>
          <Text style={styles.label}>{label}</Text>
          {helpTopic ? <HelpButton topic={helpTopic} /> : null}
        </View>
      </View>
      {helpTopic ? <HelpCallout topic={helpTopic} /> : null}
      <View style={styles.track}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.segment,
                selected ? styles.segmentSelected : null,
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.segmentLabel, selected ? styles.segmentLabelSelected : null]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelWithHelp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  track: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
    segmentSelected: {
      backgroundColor: colors.backgroundSelected,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        android: {
          elevation: 1,
        },
        ios: {
          shadowColor: '#3A2E50',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
        },
      }),
    },
  segmentLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentLabelSelected: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.8,
  },
});
}
