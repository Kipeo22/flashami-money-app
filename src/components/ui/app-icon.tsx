import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, type ColorValue } from 'react-native';

export type AppIconName =
  | 'activity'
  | 'add'
  | 'arrowLeft'
  | 'arrowRight'
  | 'calendar'
  | 'expenses'
  | 'logout'
  | 'mail'
  | 'rooms'
  | 'search'
  | 'settings'
  | 'wallet';

const iconNames: Record<AppIconName, SymbolViewProps['name']> = {
  activity: {
    ios: 'clock.arrow.circlepath',
    android: 'history',
    web: 'history',
  },
  add: {
    ios: 'plus',
    android: 'add',
    web: 'add',
  },
  arrowLeft: {
    ios: 'arrow.left',
    android: 'arrow_back',
    web: 'arrow_back',
  },
  arrowRight: {
    ios: 'arrow.right',
    android: 'arrow_forward',
    web: 'arrow_forward',
  },
  calendar: {
    ios: 'calendar',
    android: 'calendar_today',
    web: 'calendar_today',
  },
  expenses: {
    ios: 'plus.circle',
    android: 'add_circle',
    web: 'add_circle',
  },
  logout: {
    ios: 'rectangle.portrait.and.arrow.right',
    android: 'logout',
    web: 'logout',
  },
  mail: {
    ios: 'envelope',
    android: 'mail',
    web: 'mail',
  },
  rooms: {
    ios: 'person.2.fill',
    android: 'groups',
    web: 'groups',
  },
  search: {
    ios: 'magnifyingglass',
    android: 'search',
    web: 'search',
  },
  settings: {
    ios: 'gearshape',
    android: 'settings',
    web: 'settings',
  },
  wallet: {
    ios: 'wallet.pass.fill',
    android: 'account_balance_wallet',
    web: 'account_balance_wallet',
  },
};

type AppIconProps = {
  color: ColorValue;
  name: AppIconName;
  size?: number;
};

export function AppIcon({ color, name, size = 20 }: AppIconProps) {
  return (
    <SymbolView
      fallback={
        <Text style={[styles.fallback, { color, fontSize: size }]}>•</Text>
      }
      name={iconNames[name]}
      size={size}
      style={{ height: size, width: size }}
      tintColor={color}
      type="monochrome"
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
});
