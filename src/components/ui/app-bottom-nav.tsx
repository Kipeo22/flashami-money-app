import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppIcon, type AppIconName } from './app-icon';

type TabKey = 'rooms' | 'expenses' | 'activity' | 'settings';

const tabs: { icon: AppIconName; key: TabKey; label: string }[] = [
  { icon: 'rooms', key: 'rooms', label: 'Rooms' },
  { icon: 'expenses', key: 'expenses', label: 'Add\nExpense' },
  { icon: 'activity', key: 'activity', label: 'Activity' },
  { icon: 'settings', key: 'settings', label: 'Settings' },
];

type AppBottomNavProps = {
  active: TabKey;
};

export function AppBottomNav({ active }: AppBottomNavProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.nav,
        Shadow.floating,
        {
          backgroundColor: theme.tabBar,
          borderColor: theme.separator,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const color = isActive ? theme.primary : theme.textSecondary;

        return (
          <Pressable
            accessibilityRole="button"
            key={tab.key}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <AppIcon color={color} name={tab.icon} size={23} />
            <ThemedText type="caption" style={[styles.label, { color }]}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    alignItems: 'flex-start',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'space-around',
    left: 0,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
    position: 'absolute',
    right: 0,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.half,
    minHeight: 48,
    justifyContent: 'flex-start',
  },
  label: {
    lineHeight: 13,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.68,
  },
});
