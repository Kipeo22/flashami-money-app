import { usePathname, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState, type ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuickExpenseModal } from '@/components/quick-expense-modal';
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
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { appMode } = useAppPreferences();
  const [isQuickExpenseVisible, setIsQuickExpenseVisible] = useState(false);
  const tabActiveColor = colorScheme === 'dark' ? '#0a84ff' : '#007aff';
  const tabInactiveColor = colorScheme === 'dark' ? '#98989d' : '#8e8e93';
  const visibleNavItems = navItems.filter((item) =>
    item.modes.includes(appMode),
  );
  const actionIndex = Math.ceil(visibleNavItems.length / 2);

  const leftNavItems = visibleNavItems.slice(0, actionIndex);
  const rightNavItems = visibleNavItems.slice(actionIndex);

  const renderNavItem = (item: (typeof visibleNavItems)[number]) => {
    const isActive = item.isActive(pathname, appMode);
    const color = isActive ? tabActiveColor : tabInactiveColor;

    return (
      <View key={item.href} style={styles.tabSlot}>
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: isActive }}
          hitSlop={8}
          onPress={() => router.replace(item.href as never)}
          style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}
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
  };

  const renderActionItem = () => {
    return (
      <View
        key="quick-expense"
        pointerEvents="box-none"
        style={styles.centerActionSlot}
      >
        <Pressable
          accessibilityLabel="支出入力"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => setIsQuickExpenseVisible(true)}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.actionContent}>
            <View
              style={[styles.actionCircle, { backgroundColor: tabActiveColor }]}
            >
              <SymbolView
                name={{
                  ios: 'plus',
                  android: 'add',
                  web: 'add',
                }}
                size={28}
                tintColor="#fff"
                type="monochrome"
                fallback={<Text style={styles.actionIconFallback}>+</Text>}
              />
            </View>

            <Text
              numberOfLines={1}
              style={[
                styles.actionLabel,
                { color: tabActiveColor, fontWeight: '700' },
              ]}
            >
              入力
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <>
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
          <View style={styles.sideGroup}>
            {leftNavItems.map(renderNavItem)}
          </View>

          <View style={styles.centerGap} />

          <View style={styles.sideGroup}>
            {rightNavItems.map(renderNavItem)}
          </View>

          {renderActionItem()}
        </View>
      </View>

      <QuickExpenseModal
        onClose={() => setIsQuickExpenseVisible(false)}
        visible={isQuickExpenseVisible}
      />
    </>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    alignSelf: 'stretch',
    flexShrink: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  container: {
    width: '100%',
    height: 68,
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative',
  },

  sideGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  centerGap: {
    width: 86,
    flexShrink: 0,
  },

  tabSlot: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    height: 68,
  },

  tabButton: {
    width: '100%',
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },

  navContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconFrame: {
    width: '100%',
    height: 28,
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

  centerActionSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -22,
    alignItems: 'center',
    zIndex: 10,
    elevation: 10,
  },

  actionButton: {
    width: 86,
    height: 90,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actionContent: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  actionLabel: {
    width: 64,
    marginTop: 0,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    includeFontPadding: false,
  },

  actionIconFallback: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '700',
    textAlign: 'center',
  },

  fallbackIcon: {
    fontSize: 22,
    lineHeight: 24,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.55,
  },
});
