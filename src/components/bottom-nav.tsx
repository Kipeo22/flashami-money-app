import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { usePathname, useRouter } from 'expo-router';
import { type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
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
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isCompactNav = navItems.length <= 2;

  const renderNavItem = (item: (typeof navItems)[number]) => {
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
          isCompactNav && styles.compactItem,
          isActive && { backgroundColor: theme.primarySoft },
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={item.symbol}
          size={isCompactNav ? 21 : 22}
          tintColor={color}
          type={isActive ? 'hierarchical' : 'monochrome'}
          fallback={<Text style={[styles.fallbackIcon, { color }]}>□</Text>}
        />
        <ThemedText
          type="small"
          style={[
            styles.label,
            isCompactNav && styles.compactLabel,
            { color, fontWeight: isActive ? '700' : '500' },
          ]}
        >
          {item.label}
        </ThemedText>
      </Pressable>
    );
  };

  const content = <>{navItems.map(renderNavItem)}</>;

  return (
    <View style={[styles.shell, { backgroundColor: theme.background }]}>
      {isLiquidGlassNavAvailable() ? (
        <GlassView
          colorScheme="auto"
          glassEffectStyle="regular"
          isInteractive
          tintColor={theme.backgroundElement}
          style={[
            styles.container,
            isCompactNav ? styles.compactContainer : styles.wideContainer,
            Shadows.tabBar,
          ]}
        >
          {content}
        </GlassView>
      ) : (
        <ThemedView
          type="backgroundElement"
          style={[
            styles.container,
            styles.fallbackContainer,
            isCompactNav ? styles.compactContainer : styles.wideContainer,
            {
              backgroundColor:
                Platform.OS === 'web'
                  ? withAlpha(theme.backgroundElement, 0.9)
                  : theme.backgroundElement,
              borderColor: theme.border,
            },
            Shadows.tabBar,
          ]}
        >
          {content}
        </ThemedView>
      )}
    </View>
  );
}

function isLiquidGlassNavAvailable() {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

function withAlpha(hexColor: string, alpha: number) {
  const normalizedHex = hexColor.replace('#', '');

  if (normalizedHex.length !== 6) {
    return hexColor;
  }

  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

const webFallbackGlass =
  Platform.OS === 'web'
    ? {
        backdropFilter: 'blur(18px) saturate(1.25)',
      }
    : null;

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  container: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    overflow: 'visible',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
  },
  compactContainer: {
    maxWidth: 430,
  },
  wideContainer: {
    maxWidth: MaxContentWidth,
  },
  fallbackContainer: {
    borderWidth: 1,
    ...(webFallbackGlass ?? {}),
  },
  item: {
    minHeight: 46,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
  },
  compactItem: {
    minHeight: 46,
    paddingHorizontal: Spacing.two,
  },
  label: {
    fontSize: 11,
    lineHeight: 16,
  },
  compactLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  fallbackIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.55,
  },
});
