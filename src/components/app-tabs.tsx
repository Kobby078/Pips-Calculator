import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';

export default function AppTabs() {
  const colors = useTheme();
  return (
    <NativeTabs
      backgroundColor={colors.nav}
      indicatorColor={colors.button}
      tintColor={colors.button}
      rippleColor={colors.backgroundSelected}
      iconColor={{ default: colors.textSecondary, selected: colors.text }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.text },
      }}
      labelVisibilityMode="labeled"
      tabBarRespectsIMEInsets
      activityEnabled>
      <NativeTabs.Trigger name="index" contentStyle={{ backgroundColor: colors.background }}>
        <NativeTabs.Trigger.Label>Calculator</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="function" md="calculate" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings" contentStyle={{ backgroundColor: colors.background }}>
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
