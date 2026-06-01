import { Pressable, StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppIcon, type AppIconName } from './app-icon';

type IconButtonProps = {
  accessibilityLabel: string;
  icon: AppIconName;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
};

export function IconButton({
  accessibilityLabel,
  icon,
  onPress,
  variant = 'secondary',
}: IconButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary ? theme.primary : theme.backgroundElement,
        },
        pressed && styles.pressed,
      ]}
    >
      <AppIcon
        color={isPrimary ? '#ffffff' : theme.primary}
        name={icon}
        size={22}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  pressed: {
    opacity: 0.68,
  },
});
