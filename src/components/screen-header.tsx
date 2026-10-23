import { StyleSheet, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
};

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <ThemedText style={styles.brand}>ATLASJFX</ThemedText>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
    paddingBottom: Spacing.one,
  },
  brand: {
    color: Palette.accent,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 2.4,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
});
