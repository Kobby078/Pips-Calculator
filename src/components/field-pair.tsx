import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

/** Phone and Android stack the pair. Web widens it from 768px. */
export function FieldPair({ children }: { children: ReactNode }) {
  return <View style={styles.pair}>{children}</View>;
}

const styles = StyleSheet.create({
  pair: {
    gap: Spacing.three,
  },
});
