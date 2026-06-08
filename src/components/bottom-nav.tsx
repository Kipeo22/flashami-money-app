import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import { usePathname, useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { QuickExpenseModal } from '@/components/quick-expense-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppPreferences, type AppMode } from '@/lib/app-preferences';

const navItems: {
  href: string;
  isActive: (pathname: string, appMode: AppMode) => boolean;
  label: string;
  modes: AppMode[];
  symbol: ComponentProps<typeof SymbolView>['name'];
}[] = [
  {
    href: '/',
    isActive: (pathname: string, appMode: AppMode) =>
      pathname === '/' ||
      (appMode === 'participant' && pathname.startsWith('/rooms')),
    label: 'イベント',
    modes: ['participant', 'admin'],
    symbol: { ios: 'calendar', android: 'event', web: 'event' },
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
  const [isQuickExpenseVisible, setIsQuickExpenseVisible] = useState(false);
  const visibleNavItems = navItems.filter((item) =>
    item.modes.includes(appMode),
  );
  const isCompactNav = visibleNavItems.length <= 2;
  const actionIndex = Math.ceil(visibleNavItems.length / 2);

  const renderNavItem = (item: (typeof visibleNavItems)[number]) => {
    const isActive = item.isActive(pathname, appMode);
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

  const content = (
    <>
      {visibleNavItems.slice(0, actionIndex).map(renderNavItem)}
      <Pressable
        accessibilityLabel="支出入力"
        accessibilityRole="button"
        onPress={() => setIsQuickExpenseVisible(true)}
        style={({ pressed }) => [
          styles.actionButton,
          { backgroundColor: theme.primary },
          pressed && styles.actionPressed,
        ]}
      >
        <SymbolView
          name={{
            ios: 'plus.circle.fill',
            android: 'add_circle',
            web: 'add_circle',
          }}
          size={26}
          tintColor="#ffffff"
          type="hierarchical"
          fallback={
            <Text style={[styles.actionIconFallback, { color: '#ffffff' }]}>
              +
            </Text>
          }
        />
        <ThemedText
          type="smallBold"
          style={[styles.actionLabel, { color: '#ffffff' }]}
        >
          入力
        </ThemedText>
      </Pressable>
      {visibleNavItems.slice(actionIndex).map(renderNavItem)}
    </>
  );

  return (
    <>
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
      <QuickExpenseModal
        onClose={() => setIsQuickExpenseVisible(false)}
        visible={isQuickExpenseVisible}
      />
    </>
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
  actionButton: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: 34,
    transform: [{ translateY: -10 }],
  },
  actionLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  actionIconFallback: {
    fontSize: 26,
    lineHeight: 26,
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
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
