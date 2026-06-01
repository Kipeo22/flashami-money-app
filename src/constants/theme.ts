/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1d1d1f',
    background: '#ffffff',
    backgroundElement: '#f5f5f7',
    backgroundSelected: '#e8e8ed',
    surface: '#ffffff',
    surfaceRaised: '#ffffff',
    border: '#dfe1e7',
    separator: '#e7e8ee',
    textSecondary: '#5f636d',
    textTertiary: '#8a8f99',
    primary: '#0071e3',
    primaryPressed: '#005bb8',
    primarySoft: '#eaf3ff',
    danger: '#b42318',
    success: '#147a3f',
    tabBar: '#fbfbfd',
  },
  dark: {
    text: '#f5f5f7',
    background: '#000000',
    backgroundElement: '#16171a',
    backgroundSelected: '#2e3135',
    surface: '#1f2024',
    surfaceRaised: '#2a2b31',
    border: '#3a3c43',
    separator: '#34363c',
    textSecondary: '#b0b4ba',
    textTertiary: '#7d838c',
    primary: '#2997ff',
    primaryPressed: '#147ce5',
    primarySoft: '#0f2b47',
    danger: '#ffb4ab',
    success: '#8bdba8',
    tabBar: '#101114',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  twoHalf: 12,
  three: 16,
  four: 24,
  five: 32,
  fiveHalf: 40,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 20,
  xlarge: 28,
  pill: 980,
} as const;

export const Shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 12 },
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
} as const;

export const BottomTabInset = Platform.select({ ios: 58, android: 74 }) ?? 58;
export const MaxContentWidth = 560;
