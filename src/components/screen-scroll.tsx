import { forwardRef, type ComponentRef, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhoneContentWidth, Spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

type ScreenScrollProps = {
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: number;
};

export const ScreenScroll = forwardRef<ComponentRef<typeof ScrollView>, ScreenScrollProps>(function ScreenScroll(
  { children, footer, maxWidth = PhoneContentWidth },
  ref,
) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.flex}>
        <ScrollView
          ref={ref}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              maxWidth,
              paddingTop: topInset + Spacing.three,
              paddingBottom: footer ? Spacing.four : Spacing.five,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
      {footer ? (
        <View style={[styles.footer, Platform.OS === 'web' ? { paddingBottom: Spacing.two + insets.bottom } : null]}>
          {footer}
        </View>
      ) : null}
    </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    alignSelf: 'center',
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
