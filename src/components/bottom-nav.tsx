import { usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';

const navItems: {
  href: string;
  isActive: (pathname: string) => boolean;
  label: string;
  symbol: ComponentProps<typeof SymbolView>['name'];
}[] = [
  {
    href: '/',
    isActive: (pathname: string) => pathname === '/',
    label: 'ホーム',
    symbol: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    href: '/rooms',
    isActive: (pathname: string) => pathname.startsWith('/rooms'),
    label: 'イベント',
    symbol: { ios: 'person.3', android: 'groups', web: 'groups' },
  },
  {
    href: '/notifications',
    isActive: (pathname: string) => pathname === '/notifications',
    label: '通知',
    symbol: {
      ios: 'bell.fill',
      android: 'notifications',
      web: 'notifications',
    },
  },
  {
    href: '/account',
    isActive: (pathname: string) => pathname === '/account',
    label: 'アカウント',
    symbol: {
      ios: 'person.crop.circle',
      android: 'account_circle',
      web: 'account_circle',
    },
  },
];

export function BottomNav() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const tabActiveColor = colorScheme === 'dark' ? '#0a84ff' : '#007aff';
  const tabInactiveColor = colorScheme === 'dark' ? '#98989d' : '#8e8e93';

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={styles.container}>
        {navItems.map((item) => {
          const isActive = item.isActive(pathname);
          const color = isActive ? tabActiveColor : tabInactiveColor;

          return (
            <View key={item.href} style={styles.tabSlot}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                hitSlop={8}
                onPress={() => router.replace(item.href as never)}
                style={({ pressed }) => [
                  styles.tabButton,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.navContent}>
                  <View style={styles.iconFrame}>
                    <SymbolView
                      name={item.symbol}
                      size={24}
                      tintColor={color}
                      type={isActive ? 'hierarchical' : 'monochrome'}
                      fallback={
                        <Text style={[styles.fallbackIcon, { color }]}>□</Text>
                      }
                    />
                  </View>

                  <Text
                    numberOfLines={1}
                    style={[
                      styles.navLabel,
                      { color, fontWeight: isActive ? '700' : '500' },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 68,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  fallbackIcon: {
    fontSize: 22,
    lineHeight: 24,
    textAlign: 'center',
  },
  iconFrame: {
    width: '100%',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    width: '100%',
    marginTop: 3,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.55,
  },
  shell: {
    width: '100%',
    alignSelf: 'stretch',
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    width: '100%',
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  tabSlot: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 68,
  },
});
