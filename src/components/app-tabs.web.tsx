import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet, type PressableProps } from 'react-native';

import css from '@/components/app-tabs.module.css';
import { BrandLogo } from '@/components/brand-logo';
import { useThemedStyles } from '@/hooks/use-theme';
import type { ThemeColors } from '@/constants/theme';

import { ThemedText } from './themed-text';

export default function AppTabs() {
  const styles = useThemedStyles(createStyles);
  return (
    <Tabs>
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="calculator" href="/" asChild>
            <TabButton>Calculator</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton>Settings</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

type WebPressableProps = PressableProps & { className?: string };

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      {...(props as WebPressableProps)}
      className={isFocused ? `${css.link} ${css.linkOn}` : css.link}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}>
      <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <View {...props} style={[props.style, styles.tabListContainer]} className={css.shell}>
      <div className={css.bar}>
        <div className={css.brand}>
          <div className={css.brandEmblem}>
            <BrandLogo variant="emblem" height={36} />
          </div>
          <div className={css.brandComplete}>
            <BrandLogo variant="complete" height={56} />
          </div>
        </div>
        <nav className={css.nav}>{props.children}</nav>
      </div>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    slot: {
      flex: 1,
      minHeight: 0,
    },
    tabListContainer: {
      width: '100%',
      flexShrink: 0,
      backgroundColor: colors.nav,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
