import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'headline'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'caption'
    | 'captionBold'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'headline' && styles.headline,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'caption' && styles.caption,
        type === 'captionBold' && styles.captionBold,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  caption: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
    letterSpacing: 0,
  },
  captionBold: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 700,
    letterSpacing: 0,
  },
  small: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
    letterSpacing: 0,
  },
  smallBold: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
    letterSpacing: 0,
  },
  default: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: 500,
    letterSpacing: 0,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 41,
    letterSpacing: 0,
  },
  headline: {
    fontFamily: Fonts.sans,
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 28,
    letterSpacing: 0,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 700,
    letterSpacing: 0,
  },
  link: {
    fontFamily: Fonts.sans,
    lineHeight: 20,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0,
  },
  linkPrimary: {
    fontFamily: Fonts.sans,
    lineHeight: 20,
    fontSize: 14,
    fontWeight: 700,
    color: '#0071e3',
    letterSpacing: 0,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
