/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#23221e',
    background: '#fbfaf9',
    backgroundElement: '#ffffff',
    backgroundSelected: '#f0efed',
    border: '#e4e1dd',
    brand: '#0077c7',
    danger: '#d9272e',
    link: '#0071c1',
    overBackground: '#f6f5f3',
    primary: '#0879df',
    primarySoft: '#eaf4ff',
    primaryPressed: '#005fb8',
    textDisabled: '#aaa69f',
    textSecondary: '#706d65',
    warning: '#f59e0b',
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
    /** Use the native San Francisco / Japanese system fallback on iOS. */
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
  panel: 18,
  pill: 999,
} as const;

export const Shadows = {
  card:
    Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
      default: {
        boxShadow: '0 4px 16px rgba(35, 34, 30, 0.07)',
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
export const MaxContentWidth = 430;
