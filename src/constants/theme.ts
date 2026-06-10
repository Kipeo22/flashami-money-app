/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1c1c1e',
    background: '#f2f2f7',
    backgroundElement: '#ffffff',
    backgroundSelected: '#e5e5ea',
    border: '#d1d1d6',
    brand: '#007aff',
    danger: '#ff3b30',
    link: '#007aff',
    overBackground: '#f9f9fb',
    primary: '#007aff',
    primarySoft: '#e5f1ff',
    primaryPressed: '#005ecb',
    textDisabled: '#c7c7cc',
    textSecondary: '#6e6e73',
    warning: '#ff9500',
  },
  dark: {
    text: '#f5f5f7',
    background: '#000000',
    backgroundElement: '#1c1c1e',
    backgroundSelected: '#2c2c2e',
    border: '#38383a',
    brand: '#0a84ff',
    danger: '#ff453a',
    link: '#0a84ff',
    overBackground: '#2c2c2e',
    primary: '#0a84ff',
    primarySoft: '#102f52',
    primaryPressed: '#64b5ff',
    textDisabled: '#636366',
    textSecondary: '#aeaeb2',
    warning: '#ff9f0a',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** Let iOS use San Francisco through the native system font. */
    sans: undefined,
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'AdjustedYuGothic, "Yu Gothic", YuGothic, "Hiragino Sans", sans-serif',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  control: 10,
  panel: 14,
  pill: 999,
} as const;

export const Shadows = {
  card:
    Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
    }) ?? {},
  tabBar:
    Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      default: {
        boxShadow: '0 -1px 4px rgba(0, 0, 0, 0.04)',
      },
    }) ?? {},
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 620;
