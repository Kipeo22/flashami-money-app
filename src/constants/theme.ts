/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#001435',
    background: '#f5f7fa',
    backgroundElement: '#ffffff',
    backgroundSelected: '#eef1f4',
    border: '#e5e8ed',
    brand: '#0070ba',
    danger: '#d20021',
    link: '#0070ba',
    overBackground: '#f5f7fa',
    primary: '#003087',
    primarySoft: '#eaf2ff',
    primaryPressed: '#001c64',
    textDisabled: '#9da3a6',
    textSecondary: '#687173',
    warning: '#ffb81c',
  },
  dark: {
    text: '#ffffff',
    background: '#0a0e1a',
    backgroundElement: '#141a2a',
    backgroundSelected: '#1f2740',
    border: '#2a3142',
    brand: '#3b82f6',
    danger: '#ff5c6c',
    link: '#69a7ff',
    overBackground: '#1f2740',
    primary: '#3b82f6',
    primarySoft: '#182b4f',
    primaryPressed: '#69a7ff',
    textDisabled: '#687173',
    textSecondary: '#a8aec4',
    warning: '#ffb81c',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'Hiragino Sans',
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
  control: 12,
  panel: 16,
  pill: 999,
} as const;

export const Shadows = {
  card:
    Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
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
        shadowOpacity: 0.04,
        shadowRadius: 4,
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
export const MaxContentWidth = 800;
