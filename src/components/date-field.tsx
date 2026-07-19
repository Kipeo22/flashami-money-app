import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getLocalIsoDate } from '@/lib/rooms';

export function DateField({
  allowClear = false,
  onChange,
  placeholder = '日付を選択',
  value,
}: {
  allowClear?: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selectedDate = value ? new Date(`${value}T12:00:00`) : new Date();

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setOpen(false);
    }
    if (event.type === 'set' && date) {
      onChange(getLocalIsoDate(date));
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel={value ? `選択中の日付 ${value}` : placeholder}
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={[
            styles.control,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <SymbolView
            name={{
              ios: 'calendar',
              android: 'calendar_today',
              web: 'calendar_today',
            }}
            size={18}
            tintColor={theme.primary}
            fallback={<Text style={{ color: theme.primary }}>□</Text>}
          />
          <ThemedText
            type="default"
            themeColor={value ? 'text' : 'textSecondary'}
            style={styles.label}
          >
            {value ? formatDateLabel(value) : placeholder}
          </ThemedText>
        </Pressable>
        {allowClear && value ? (
          <Pressable
            accessibilityLabel="日付をクリア"
            accessibilityRole="button"
            onPress={() => onChange('')}
            style={styles.clearButton}
          >
            <ThemedText type="small" style={{ color: theme.primary }}>
              クリア
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <View
          style={[
            styles.pickerWrap,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
          ]}
        >
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            locale="ja-JP"
            mode="date"
            onChange={handleChange}
            value={selectedDate}
          />
          {Platform.OS === 'ios' ? (
            <Pressable onPress={() => setOpen(false)} style={styles.doneButton}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                完了
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return year && month && day ? `${year}年${month}月${day}日` : value;
}

const styles = StyleSheet.create({
  clearButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  control: {
    minHeight: 50,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.control,
    paddingHorizontal: 14,
  },
  doneButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { flex: 1 },
  pickerWrap: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.control,
    padding: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wrapper: { gap: 8 },
});
