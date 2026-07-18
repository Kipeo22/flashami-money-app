import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export function AppHeader({
  action,
  backLabel = '戻る',
  onBack,
  title,
}: {
  action?: ReactNode;
  backLabel?: string;
  onBack?: () => void;
  title: string;
}) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={backLabel}
        hitSlop={8}
        onPress={onBack ?? router.back}
        style={styles.headerSide}
      >
        <SymbolView
          name={{
            ios: 'chevron.left',
            android: 'arrow_back',
            web: 'arrow_back',
          }}
          size={22}
          tintColor={theme.primary}
          fallback={
            <Text style={[styles.fallback, { color: theme.primary }]}>‹</Text>
          }
        />
      </Pressable>
      <ThemedText type="subtitle" numberOfLines={1} style={styles.headerTitle}>
        {title}
      </ThemedText>
      <View style={[styles.headerSide, styles.headerAction]}>{action}</View>
    </View>
  );
}

export function IconButton({
  accessibilityLabel,
  filled = false,
  onPress,
  symbol,
}: {
  accessibilityLabel: string;
  filled?: boolean;
  onPress: () => void;
  symbol: SymbolName;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={onPress}
      style={[
        styles.iconButton,
        { backgroundColor: filled ? theme.primary : theme.primarySoft },
      ]}
    >
      <SymbolView
        name={symbol}
        size={20}
        tintColor={filled ? '#ffffff' : theme.primary}
        fallback={
          <Text style={{ color: filled ? '#ffffff' : theme.primary }}>•</Text>
        }
      />
    </Pressable>
  );
}

export function SurfaceCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        Shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({
  children,
  disabled,
  onPress,
  style,
}: {
  children: ReactNode;
  disabled?: boolean;
  onPress: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.primaryButton,
        {
          backgroundColor: disabled ? theme.backgroundSelected : theme.primary,
        },
        style,
      ]}
    >
      {typeof children === 'string' ? (
        <ThemedText
          type="default"
          style={[
            styles.primaryLabel,
            disabled && { color: theme.textSecondary },
          ]}
        >
          {children}
        </ThemedText>
      ) : (
        children
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  children,
  danger = false,
  onPress,
  style,
}: {
  children: string;
  danger?: boolean;
  onPress: PressableProps['onPress'];
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const color = danger ? theme.danger : theme.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.secondaryButton, { borderColor: color }, style]}
    >
      <ThemedText type="default" style={{ color, fontWeight: '700' }}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'danger' | 'neutral' | 'primary' | 'success' | 'warning';
}) {
  const theme = useTheme();
  const palette = {
    danger: { background: '#fdeced', color: theme.danger },
    neutral: {
      background: theme.backgroundSelected,
      color: theme.textSecondary,
    },
    primary: { background: theme.primarySoft, color: theme.primary },
    success: { background: '#ecf8ef', color: '#20a550' },
    warning: { background: '#fff4e5', color: '#d97706' },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      <ThemedText
        type="smallBold"
        style={[styles.badgeLabel, { color: palette.color }]}
      >
        {label}
      </ThemedText>
    </View>
  );
}

export function RoundIcon({
  color,
  symbol,
}: {
  color?: 'orange' | 'red' | 'blue';
  symbol: SymbolName;
}) {
  const theme = useTheme();
  const tint =
    color === 'orange'
      ? '#f59e0b'
      : color === 'red'
        ? theme.danger
        : theme.primary;
  const background =
    color === 'orange'
      ? '#fff5e8'
      : color === 'red'
        ? '#fdeced'
        : theme.primarySoft;
  return (
    <View style={[styles.roundIcon, { backgroundColor: background }]}>
      <SymbolView
        name={symbol}
        size={22}
        tintColor={tint}
        fallback={<Text style={{ color: tint }}>•</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeLabel: { fontSize: 11, lineHeight: 16 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  fallback: { fontSize: 30, lineHeight: 32 },
  header: {
    minHeight: 52,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAction: { alignItems: 'flex-end' },
  headerSide: {
    width: 52,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 20, lineHeight: 26, textAlign: 'center' },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  primaryButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
  },
  primaryLabel: { color: '#ffffff', fontWeight: '700' },
  roundIcon: {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  secondaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
  },
});
