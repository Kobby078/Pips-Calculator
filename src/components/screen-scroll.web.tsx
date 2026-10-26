import { forwardRef, type ComponentRef, type ReactNode } from 'react';
import { ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import css from '@/components/dashboard.module.css';
import { DashboardMaxWidth, Spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

type ScreenScrollProps = {
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
};

export const ScreenScroll = forwardRef<ComponentRef<typeof ScrollView>, ScreenScrollProps>(function ScreenScroll(
  { children, footer, maxWidth = DashboardMaxWidth },
  ref,
) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  return (
    <View style={styles.flex}>
      <ScrollView
        ref={ref}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topInset + Spacing.three }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <div className={css.page} style={{ maxWidth }}>
          {children}
        </div>
      </ScrollView>
      {footer ? (
        <div className={css.dock}>
          <View style={[styles.footer, { paddingBottom: Spacing.two + insets.bottom }]}>{footer}</View>
        </div>
      ) : null}
    </View>
  );
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  content: {
    width: '100%',
    flexGrow: 1,
  },
  footer: {
    flexShrink: 0,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.background,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
});
}
