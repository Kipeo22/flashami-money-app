import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppIcon, type AppIconName } from './app-icon';

type TextFieldProps = TextInputProps & {
  icon?: AppIconName;
  label: string;
};

export function TextField({ icon, label, style, ...props }: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View
        style={[styles.field, { backgroundColor: theme.backgroundElement }]}
      >
        {icon && <AppIcon color={theme.textTertiary} name={icon} size={21} />}
        <TextInput
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.text }, style]}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.two,
  },
  field: {
    alignItems: 'center',
    borderRadius: Radius.medium,
    flexDirection: 'row',
    gap: Spacing.twoHalf,
    minHeight: 54,
    paddingHorizontal: Spacing.three,
  },
  input: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    minHeight: 54,
  },
});
