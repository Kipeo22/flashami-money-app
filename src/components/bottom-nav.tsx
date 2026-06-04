import { SymbolView } from 'expo-symbols';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const navItems = [
  {
    href: '/',
    isActive: (pathname: string) => pathname === '/',
    label: 'メイン',
    symbol: { ios: 'house', android: 'home', web: 'home' },
  },
  {
    href: '/rooms',
    isActive: (pathname: string) => pathname.startsWith('/rooms'),
    label: 'Room',
    symbol: { ios: 'person.3', android: 'groups', web: 'groups' },
  },
  {
    href: '/settings',
    isActive: (pathname: string) => pathname === '/settings',
    label: '設定',
    symbol: { ios: 'gearshape', android: 'settings', web: 'settings' },
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.container, { borderTopColor: theme.border }]}
    >
      {navItems.map((item) => {
        const isActive = item.isActive(pathname);
        const color = isActive ? theme.primary : theme.textSecondary;

        return (
          <Pressable
            key={item.href}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => router.replace(item.href as never)}
            style={({ pressed }) => [
              styles.item,
              isActive && { backgroundColor: theme.primarySoft },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={item.symbol}
              size={22}
              tintColor={color}
              fallback={<Text style={[styles.fallbackIcon, { color }]}>□</Text>}
            />
            <ThemedText type="smallBold" style={[styles.label, { color }]}>
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
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.two,
  },
  item: {
    minHeight: 56,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.two,
  },
  label: {
    fontSize: 12,
    lineHeight: 18,
  },
  fallbackIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.72,
  },
});
