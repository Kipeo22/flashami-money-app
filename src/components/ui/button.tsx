import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppIcon, type AppIconName } from './app-icon';

type AppButtonProps = {
  disabled?: boolean;
  icon?: AppIconName;
  isLoading?: boolean;
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function AppButton({
  disabled,
  icon,
  isLoading,
  label,
  onPress,
  variant = 'primary',
}: AppButtonProps) {
  const theme = useTheme();
  const isInactive = disabled || isLoading;
  const foreground =
    variant === 'primary'
      ? '#ffffff'
      : variant === 'secondary'
        ? theme.text
        : theme.primary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isInactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: theme.primary },
        variant === 'secondary' && {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
        },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        (pressed || isInactive) && styles.pressed,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          <ThemedText type="smallBold" style={{ color: foreground }}>
            {label}
          </ThemedText>
          {icon && <AppIcon color={foreground} name={icon} size={17} />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.68,
  },
});
