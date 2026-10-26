import { StyleSheet, View } from 'react-native';

import type { FormSection } from '@/components/form-section';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

type FormSectionsProps = {
  sections: FormSection[];
};

/** Native keeps one card so the Android column matches the existing calculator. */
export function FormSections({ sections }: FormSectionsProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      {sections.map((section) => (
        <View key={section.key} style={styles.block}>
          {section.children}
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundElement,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  block: {
    gap: Spacing.three,
  },
});
}
