import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';

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

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  label: {
    color: Palette.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  track: {
    flexDirection: 'row',
    gap: Spacing.one,
    padding: 4,
    borderRadius: 14,
    backgroundColor: Palette.surfaceRaised,
    borderWidth: 1,
    borderColor: Palette.border,
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
    backgroundColor: Palette.backgroundSelected,
  },
  segmentLabel: {
    color: Palette.textSecondary,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
  },
  segmentLabelSelected: {
    color: Palette.text,
  },
  pressed: {
    opacity: 0.8,
  },
});
