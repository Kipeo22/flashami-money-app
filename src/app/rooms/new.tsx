import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader, PrimaryButton, SurfaceCard } from '@/components/ios-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createRoomWithMembers } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function CreateRoomScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [integrationOpen, setIntegrationOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async () => {
    if (!isSupabaseConfigured) {
      router.replace('/login');
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const room = await createRoomWithMembers({
        description,
        endDate,
        memberEmails: [],
        name,
        startDate,
      });
      router.replace(`/rooms/${room.id}` as never);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'roomを作成できませんでした。',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.safeArea}
        >
          <View style={styles.container}>
            <AppHeader title="新しいroomを作成" />
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              <Field
                label="room名"
                hint="旅行やイベントの名前を入力してください。"
              >
                <TextInput
                  onChangeText={setName}
                  placeholder="例：卒業旅行2026"
                  placeholderTextColor={theme.textDisabled}
                  style={[
                    styles.input,
                    { borderColor: theme.border, color: theme.text },
                  ]}
                  value={name}
                />
              </Field>

              <Field label="説明（任意）">
                <TextInput
                  multiline
                  onChangeText={setDescription}
                  placeholder="イベントの概要や目的など"
                  placeholderTextColor={theme.textDisabled}
                  style={[
                    styles.textArea,
                    { borderColor: theme.border, color: theme.text },
                  ]}
                  textAlignVertical="top"
                  value={description}
                />
              </Field>

              <Field label="期間" hint="日程が未定の場合は空欄でも構いません。">
                <View
                  style={[
                    styles.dateShell,
                    { backgroundColor: theme.overBackground },
                  ]}
                >
                  <DateInput
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="yyyy-mm-dd"
                  />
                  <SymbolView
                    name={{
                      ios: 'arrow.right',
                      android: 'arrow_forward',
                      web: 'arrow_forward',
                    }}
                    size={18}
                    tintColor={theme.textSecondary}
                    fallback={
                      <Text style={{ color: theme.textSecondary }}>→</Text>
                    }
                  />
                  <DateInput
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="yyyy-mm-dd"
                  />
                </View>
              </Field>

              <Pressable
                onPress={() => setIntegrationOpen((value) => !value)}
                style={({ pressed }) => [
                  styles.integrationPressable,
                  pressed && styles.pressed,
                ]}
              >
                <SurfaceCard
                  style={[styles.integration, { backgroundColor: '#f3f4ff' }]}
                >
                  <View style={styles.integrationRow}>
                    <View
                      style={[
                        styles.integrationIcon,
                        { backgroundColor: theme.primarySoft },
                      ]}
                    >
                      <SymbolView
                        name={{ ios: 'link', android: 'link', web: 'link' }}
                        size={18}
                        tintColor={theme.primary}
                        fallback={
                          <Text style={{ color: theme.primary }}>⌁</Text>
                        }
                      />
                    </View>
                    <View style={styles.integrationText}>
                      <ThemedText type="smallBold">外部連携</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        Discord, Google Spreadsheet（任意）
                      </ThemedText>
                    </View>
                    <SymbolView
                      name={{
                        ios: integrationOpen ? 'chevron.up' : 'chevron.down',
                        android: integrationOpen
                          ? 'expand_less'
                          : 'expand_more',
                        web: integrationOpen ? 'expand_less' : 'expand_more',
                      }}
                      size={18}
                      tintColor={theme.textSecondary}
                      fallback={
                        <Text style={{ color: theme.textSecondary }}>⌄</Text>
                      }
                    />
                  </View>
                  {integrationOpen ? (
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.integrationNote}
                    >
                      room作成後、設定画面から連携先を登録できます。
                    </ThemedText>
                  ) : null}
                </SurfaceCard>
              </Pressable>

              {feedback ? (
                <ThemedText type="small" themeColor="danger">
                  {feedback}
                </ThemedText>
              ) : null}
            </ScrollView>
            <View
              style={[
                styles.footer,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <PrimaryButton
                disabled={!name.trim() || submitting}
                onPress={submit}
              >
                {submitting ? '作成中…' : 'roomを作成 →'}
              </PrimaryButton>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

function DateInput({
  onChangeText,
  placeholder,
  value,
}: {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.dateInputWrap}>
      <SymbolView
        name={{
          ios: 'calendar',
          android: 'calendar_today',
          web: 'calendar_today',
        }}
        size={17}
        tintColor={theme.textSecondary}
        fallback={<Text style={{ color: theme.textSecondary }}>□</Text>}
      />
      <TextInput
        inputMode="numeric"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textDisabled}
        style={[styles.dateInput, { color: theme.text }]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 20,
    position: 'relative',
  },
  content: { gap: 30, paddingTop: 14, paddingBottom: 112 },
  dateInput: { flex: 1, minWidth: 0, fontFamily: Fonts.sans, fontSize: 15 },
  dateInputWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateShell: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.control,
    paddingHorizontal: 14,
  },
  field: { gap: 9 },
  footer: {
    position: 'absolute',
    right: 20,
    bottom: 0,
    left: 20,
    zIndex: 10,
    paddingTop: 12,
    paddingBottom: 12,
  },
  hint: { fontSize: 12, lineHeight: 18 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  integration: {
    width: '100%',
    minHeight: 72,
    gap: 10,
    padding: 14,
  },
  integrationPressable: { width: '100%' },
  integrationRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  integrationIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  integrationNote: { marginTop: 8 },
  integrationText: { flex: 1 },
  pressed: { opacity: 0.6 },
  safeArea: { flex: 1 },
  scrollView: { flex: 1, width: '100%' },
  screen: { flex: 1 },
  textArea: {
    minHeight: 104,
    borderWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
});
