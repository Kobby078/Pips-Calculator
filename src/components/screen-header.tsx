import { Platform, StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
};

export function ScreenHeader({ title, subtitle }: ScreenHeaderProps) {
  const colors = useTheme();

  return (
    <View style={styles.header}>
      <View {...(Platform.OS === 'web' ? { dataSet: { pageBrand: 'true' } } : {})}>
        <BrandLogo variant="complete" height={72} />
      </View>
      <ThemedText themeColor="text" style={[styles.title, { color: colors.text }]}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={[styles.subtitle, { color: colors.textSecondary }]}>
        {subtitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.two,
    paddingBottom: Spacing.one,
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
