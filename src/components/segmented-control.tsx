import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

type Segment<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  label: string;
  value: T;
  options: readonly Segment<T>[];
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
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
