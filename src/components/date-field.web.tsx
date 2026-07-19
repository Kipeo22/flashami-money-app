import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function DateField({
  allowClear = false,
  onChange,
  placeholder = 'YYYY-MM-DD',
  value,
}: {
  allowClear?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <TextInput
        aria-label={placeholder}
        inputMode="numeric"
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textDisabled}
        style={[
          styles.input,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            color: theme.text,
          },
        ]}
        value={value}
      />
      {allowClear && value ? (
        <ThemedText
          onPress={() => onChange('')}
          type="small"
          style={{ color: theme.primary }}
        >
          クリア
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 50,
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.control,
    paddingHorizontal: 14,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  wrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
