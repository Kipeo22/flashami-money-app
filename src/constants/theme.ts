/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#23221e',
    background: '#f8f7f6',
    backgroundElement: '#ffffff',
    backgroundSelected: '#edebe8',
    border: '#d6d3d0',
    brand: '#00c4cc',
    danger: '#e01e5a',
    link: '#0071c1',
    overBackground: '#f2f1f0',
    primary: '#0077c7',
    primarySoft: '#e6f4fb',
    primaryPressed: '#0069b0',
    textDisabled: '#c1bdb7',
    textSecondary: '#706d65',
    warning: '#ffcc17',
  },
  dark: {
    text: '#f8f7f6',
    background: '#171614',
    backgroundElement: '#23221e',
    backgroundSelected: '#3a3834',
    border: '#4e4c49',
    brand: '#00c4cc',
    danger: '#ff5c8a',
    link: '#69d7ff',
    overBackground: '#2d2b28',
    primary: '#69d7ff',
    primarySoft: '#123a49',
    primaryPressed: '#2d7df0',
    textDisabled: '#706d65',
    textSecondary: '#c1bdb7',
    warning: '#ffcc17',
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
  control: 6,
  panel: 8,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
