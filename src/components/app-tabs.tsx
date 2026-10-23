import { NativeTabs } from 'expo-router/native-tabs';

import { Palette } from '@/constants/theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Palette.background}
      indicatorColor={Palette.accent}
      tintColor={Palette.accent}
      rippleColor={Palette.backgroundSelected}
      iconColor={{ default: Palette.textSecondary, selected: Palette.text }}
      labelStyle={{
        default: { color: Palette.textSecondary },
        selected: { color: Palette.text },
      }}
      labelVisibilityMode="labeled"
      tabBarRespectsIMEInsets
      activityEnabled>
      <NativeTabs.Trigger name="index" contentStyle={{ backgroundColor: Palette.background }}>
        <NativeTabs.Trigger.Label>Calculator</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="function" md="calculate" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings" contentStyle={{ backgroundColor: Palette.background }}>
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
