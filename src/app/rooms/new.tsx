import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createRoomWithMembers,
  dedupeMemberEmails,
  isValidEmail,
  isValidIsoDate,
  normalizeEmail,
} from '@/lib/rooms';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

export default function RoomCreateScreen() {
  const router = useRouter();
  const theme = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const canCreateRoom =
    name.trim().length > 0 &&
    startDate.trim().length > 0 &&
    endDate.trim().length > 0 &&
    !isSubmitting;

  useEffect(() => {
    let active = true;

    async function requireLogin() {
      if (!isSupabaseConfigured) {
        return;
      }

      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();

      if (active && !data.user) {
        router.replace('/login');
      }
    }

    requireLogin();

    return () => {
      active = false;
    };
  }, [router]);

  const addEmail = () => {
    const nextEmail = normalizeEmail(emailInput);

    if (!nextEmail) {
      return;
    }

    if (!isValidEmail(nextEmail)) {
      setFeedback('参加者メールアドレスの形式が正しくありません。');
      return;
    }

    setMemberEmails((current) =>
      dedupeMemberEmails([...current, nextEmail], ''),
    );
    setEmailInput('');
    setFeedback(null);
  };

  const removeEmail = (emailToRemove: string) => {
    setMemberEmails((current) =>
      current.filter((email) => email !== emailToRemove),
    );
  };

  const handleSubmit = async () => {
    const pendingEmail = normalizeEmail(emailInput);
    const nextMemberEmails =
      pendingEmail && isValidEmail(pendingEmail)
        ? dedupeMemberEmails([...memberEmails, pendingEmail], '')
        : memberEmails;

    if (pendingEmail && !isValidEmail(pendingEmail)) {
      setFeedback('追加前の参加者メールアドレスを確認してください。');
      return;
    }

    if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
      setFeedback('開始日と終了日は YYYY-MM-DD 形式で入力してください。');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const room = await createRoomWithMembers({
        name,
        description,
        startDate,
        endDate,
        memberEmails: nextMemberEmails,
      });

      router.replace(`/rooms/${room.id}/members` as any);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'roomの作成に失敗しました。',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">room作成</ThemedText>
              <ThemedText themeColor="textSecondary">
                room名、開催日、参加者のメールアドレスをまとめて登録します。
              </ThemedText>
            </ThemedView>

            {!isSupabaseConfigured ? (
              <ThemedView type="backgroundElement" style={styles.alert}>
                <ThemedText type="smallBold">Supabase が未設定です</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  `EXPO_PUBLIC_SUPABASE_URL` と
                  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を設定してください。
                </ThemedText>
              </ThemedView>
            ) : null}

            {feedback ? (
              <ThemedView type="backgroundElement" style={styles.alert}>
                <ThemedText type="smallBold">入力を確認してください</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {feedback}
                </ThemedText>
              </ThemedView>
            ) : null}

            <ThemedView
              type="backgroundElement"
              style={[styles.form, { borderColor: theme.border }]}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">基本情報</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  必須
                </ThemedText>
              </View>

              <Field label="room名">
                <TextInput
                  autoCapitalize="words"
                  placeholder="沖縄旅行 2026"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text,
                    },
                  ]}
                  value={name}
                  onChangeText={setName}
                />
              </Field>

              <Field label="説明">
                <TextInput
                  multiline
                  placeholder="旅行の精算をまとめるroom"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.textArea,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text,
                    },
                  ]}
                  value={description}
                  onChangeText={setDescription}
                />
              </Field>

              <View style={styles.row}>
                <Field label="開始日" style={styles.rowItem}>
                  <TextInput
                    autoCapitalize="none"
                    inputMode="numeric"
                    placeholder="2026-06-01"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                        color: theme.text,
                      },
                    ]}
                    value={startDate}
                    onChangeText={setStartDate}
                  />
                </Field>
                <Field label="終了日" style={styles.rowItem}>
                  <TextInput
                    autoCapitalize="none"
                    inputMode="numeric"
                    placeholder="2026-06-05"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      {
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                        color: theme.text,
                      },
                    ]}
                    value={endDate}
                    onChangeText={setEndDate}
                  />
                </Field>
              </View>
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[styles.form, { borderColor: theme.border }]}
            >
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">参加者メールアドレス</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  任意
                </ThemedText>
              </View>

              <View style={styles.emailComposer}>
                <TextInput
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onSubmitEditing={addEmail}
                  placeholder="member@example.com"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    styles.emailInput,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text,
                    },
                  ]}
                  value={emailInput}
                  onChangeText={setEmailInput}
                />
                <Pressable
                  onPress={addEmail}
                  style={({ pressed }) => [
                    styles.smallButton,
                    { backgroundColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.primaryText }}
                  >
                    追加
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.chips}>
                {memberEmails.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    まだ参加者は追加されていません。
                  </ThemedText>
                ) : (
                  memberEmails.map((email) => (
                    <View
                      key={email}
                      style={[
                        styles.chip,
                        { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <ThemedText type="small" style={styles.chipText}>
                        {email}
                      </ThemedText>
                      <Pressable
                        onPress={() => removeEmail(email)}
                        style={({ pressed }) => [
                          styles.chipRemove,
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{ color: theme.primary }}
                        >
                          削除
                        </ThemedText>
                      </Pressable>
                    </View>
                  ))
                )}
              </View>
            </ThemedView>

            <View style={styles.actions}>
              <Pressable
                disabled={!canCreateRoom}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: !canCreateRoom
                      ? theme.backgroundSelected
                      : theme.primary,
                  },
                  pressed && canCreateRoom && styles.pressed,
                ]}
              >
                <ThemedText
                  type="default"
                  style={{
                    fontWeight: 'bold',
                    color: !canCreateRoom
                      ? theme.textSecondary
                      : theme.primaryText,
                  }}
                >
                  {isSubmitting ? '作成中...' : 'この内容でRoomを作成する'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.ghostButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="default"
                  style={{ color: theme.textSecondary, fontWeight: 'bold' }}
                >
                  キャンセルして戻る
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({
  children,
  label,
  style,
}: {
  children: ReactNode;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ThemedView style={[styles.field, style]}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.four,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  alert: {
    gap: Spacing.one,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  form: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  rowItem: {
    minWidth: 140,
    flex: 1,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  textArea: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  emailComposer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  emailInput: {
    minWidth: 220,
    flex: 1,
  },
  chips: {
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    backgroundColor: '#e5e7eb',
  },
  chipText: {
    flex: 1,
  },
  chipRemove: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  actions: {
    gap: Spacing.two,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
  },
  smallButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
  },
  ghostButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
