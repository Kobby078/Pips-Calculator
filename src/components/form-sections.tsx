import { StyleSheet, View } from 'react-native';

import { Palette, Spacing } from '@/constants/theme';
import type { FormSection } from '@/components/form-section';

type FormSectionsProps = {
  sections: FormSection[];
};

/** Native keeps one card so the Android column matches the existing calculator. */
export function FormSections({ sections }: FormSectionsProps) {
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.backgroundElement,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  block: {
    gap: Spacing.three,
  },
});
