import { SymbolView } from 'expo-symbols';
import { usePathname, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppPreferences, type AppMode } from '@/lib/app-preferences';

const navItems: {
  href: string;
  isActive: (pathname: string) => boolean;
  label: string;
  modes: AppMode[];
  symbol: ComponentProps<typeof SymbolView>['name'];
}[] = [
  {
    href: '/',
    isActive: (pathname: string) => pathname === '/',
    label: '入力',
    modes: ['participant', 'admin'],
    symbol: { ios: 'house', android: 'home', web: 'home' },
  },
  {
    href: '/rooms',
    isActive: (pathname: string) => pathname.startsWith('/rooms'),
    label: 'Room',
    modes: ['admin'],
    symbol: { ios: 'person.3', android: 'groups', web: 'groups' },
  },
  {
    href: '/admin',
    isActive: (pathname: string) => pathname.startsWith('/admin'),
    label: '管理',
    modes: ['admin'],
    symbol: {
      ios: 'checklist',
      android: 'assignment_turned_in',
      web: 'assignment_turned_in',
    },
  },
  {
    href: '/settings',
    isActive: (pathname: string) => pathname === '/settings',
    label: '設定',
    modes: ['participant', 'admin'],
    symbol: { ios: 'gearshape', android: 'settings', web: 'settings' },
  },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const { appMode } = useAppPreferences();
  const visibleNavItems = navItems.filter((item) =>
    item.modes.includes(appMode),
  );

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.container,
        { borderTopColor: theme.border },
        Shadows.tabBar,
      ]}
    >
      {visibleNavItems.map((item) => {
        const isActive = item.isActive(pathname);
        const color = isActive ? theme.primary : theme.textSecondary;

        return (
          <Pressable
            key={item.href}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => router.replace(item.href as never)}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <SymbolView
              name={item.symbol}
              size={22}
              tintColor={color}
              type={isActive ? 'hierarchical' : 'monochrome'}
              fallback={<Text style={[styles.fallbackIcon, { color }]}>□</Text>}
            />
            <ThemedText
              type="small"
              style={[
                styles.label,
                { color, fontWeight: isActive ? '700' : '500' },
              ]}
            >
              {item.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.one,
  },
  item: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
  },
  label: {
    fontSize: 11,
    lineHeight: 16,
  },
  fallbackIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.55,
  },
});
