import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useHelp } from '@/components/help-context';
import { Spacing, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { HELP_CONTENT, type HelpTopic } from '@/lib/help-content';

type HelpProps = {
  topic: HelpTopic;
};

export function HelpButton({ topic }: HelpProps) {
  const { isHelpOpen, toggleHelp } = useHelp();
  const styles = useThemedStyles(createStyles);
  const item = HELP_CONTENT[topic];
  const open = isHelpOpen(topic);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Explanation for ${item?.title ?? topic}`}
      accessibilityHint={open ? 'Tap to close explanation' : 'Tap to show explanation'}
      accessibilityState={{ expanded: open }}
      hitSlop={12}
      onPress={() => toggleHelp(topic)}
      style={({ pressed }) => [
        styles.iconButton,
        open ? styles.iconButtonActive : null,
        pressed ? styles.pressed : null,
      ]}>
      <Text style={[styles.iconGlyph, open ? styles.iconGlyphActive : null]}>i</Text>
    </Pressable>
  );
}

export function HelpCallout({ topic }: HelpProps) {
  const { isHelpOpen, closeHelp } = useHelp();
  const styles = useThemedStyles(createStyles);
  const item = HELP_CONTENT[topic];
  const open = isHelpOpen(topic);

  if (!open || !item) {
    return null;
  }

  return (
    <View style={styles.callout}>
      <View style={styles.calloutHeader}>
        <Text style={styles.calloutTitle}>{item.title}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close explanation"
          hitSlop={10}
          onPress={closeHelp}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.pressed : null]}>
          <Text style={styles.closeGlyph}>✕</Text>
        </Pressable>
      </View>
      <Text style={styles.calloutBody}>{item.body}</Text>
    </View>
  );
}

export function HelpInfo({ topic }: HelpProps) {
  return (
    <View style={stylesLocal.wrap}>
      <HelpButton topic={topic} />
      <HelpCallout topic={topic} />
    </View>
  );
}

const stylesLocal = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    iconButton: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    iconGlyph: {
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: '700',
      fontStyle: 'italic',
      textAlign: 'center',
    },
    iconGlyphActive: {
      color: '#FFFFFF',
    },
    callout: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: Spacing.three,
      paddingVertical: Spacing.two,
      gap: 4,
      marginVertical: 4,
    },
    calloutHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Spacing.two,
    },
    calloutTitle: {
      color: colors.accent,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
      flex: 1,
    },
    closeButton: {
      padding: 2,
    },
    closeGlyph: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 16,
      fontWeight: '600',
    },
    calloutBody: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 18,
    },
    pressed: {
      opacity: 0.8,
    },
  });
}
