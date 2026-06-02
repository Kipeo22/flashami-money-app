import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  createExpenseWithTargets,
  fetchExpenseTargetCandidates,
  type ExpenseType,
  type SplitType,
} from '@/lib/expenses';
import { type RoomMemberRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

const expenseTypeOptions: { label: string; value: ExpenseType }[] = [
  { label: '共通経費', value: 'common' },
  { label: '個人間立替', value: 'personal' },
];

const splitTypeOptions: { label: string; value: SplitType }[] = [
  { label: '均等', value: 'equal' },
  { label: '金額指定', value: 'custom' },
];

const noReceiptReasons = [
  'レシートが発行されなかった',
  'レシートをもらい忘れた',
  '交通費のためレシートがない',
  '個人間送金のためレシートがない',
  'その他',
];

export default function ExpenseCreateScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const router = useRouter();
  const theme = useTheme();

  const resolvedRoomId = Array.isArray(roomId) ? undefined : roomId;
  const [expenseType, setExpenseType] = useState<ExpenseType>('common');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [paidAt, setPaidAt] = useState('');
  const [receiptImageUrl, setReceiptImageUrl] = useState('');
  const [noReceiptReason, setNoReceiptReason] = useState('');
  const [noReceiptNote, setNoReceiptNote] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [members, setMembers] = useState<RoomMemberRecord[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      if (!resolvedRoomId || !isSupabaseConfigured) {
        setIsLoadingMembers(false);
        return;
      }

      setIsLoadingMembers(true);
      try {
        const memberData = await fetchExpenseTargetCandidates(resolvedRoomId);
        if (active) {
          setMembers(memberData);
        }
      } catch (error) {
        if (active) {
          setFeedback(
            error instanceof Error
              ? error.message
              : '参加者の取得に失敗しました。',
          );
        }
      } finally {
        if (active) {
          setIsLoadingMembers(false);
        }
      }
    }

    loadMembers();

    return () => {
      active = false;
    };
  }, [resolvedRoomId]);

  const selectedTargets = useMemo(
    () =>
      members
        .filter((member) => selectedMemberIds.includes(member.id))
        .map((member) => ({
          member,
          amountShare:
            splitType === 'custom'
              ? Number.parseInt(customShares[member.id] ?? '', 10)
              : null,
        })),
    [customShares, members, selectedMemberIds, splitType],
  );

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const handleSubmit = async () => {
    if (!resolvedRoomId) {
      setFeedback('roomId が指定されていません。');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await createExpenseWithTargets({
        roomId: resolvedRoomId,
        expenseType,
        amount: Number.parseInt(amount, 10),
        category,
        description,
        paidAt,
        receiptImageUrl,
        noReceiptReason,
        noReceiptNote,
        splitType: expenseType === 'personal' ? splitType : null,
        targets: expenseType === 'personal' ? selectedTargets : [],
      });

      setFeedback('支出を登録しました。');
      setAmount('');
      setCategory('');
      setDescription('');
      setReceiptImageUrl('');
      setNoReceiptReason('');
      setNoReceiptNote('');
      setSelectedMemberIds([]);
      setCustomShares({});
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : '支出の登録に失敗しました。',
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
              <ThemedText type="subtitle">支出登録</ThemedText>
              <ThemedText themeColor="textSecondary">
                room内の共通経費または個人間立替を登録します。
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
                <ThemedText type="smallBold">登録状況</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {feedback}
                </ThemedText>
              </ThemedView>
            ) : null}

            <ThemedView type="backgroundElement" style={styles.form}>
              <Field label="支出タイプ">
                <OptionRow>
                  {expenseTypeOptions.map((option) => (
                    <OptionButton
                      key={option.value}
                      isSelected={expenseType === option.value}
                      label={option.label}
                      onPress={() => setExpenseType(option.value)}
                    />
                  ))}
                </OptionRow>
              </Field>

              <Field label="金額">
                <TextInput
                  inputMode="numeric"
                  keyboardType="number-pad"
                  placeholder="12000"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  value={amount}
                  onChangeText={setAmount}
                />
              </Field>

              <Field label="カテゴリ">
                <TextInput
                  placeholder="宿泊費"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  value={category}
                  onChangeText={setCategory}
                />
              </Field>

              <Field label="内容">
                <TextInput
                  multiline
                  placeholder="ホテル代 2泊分"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.textArea,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  value={description}
                  onChangeText={setDescription}
                />
              </Field>

              <Field label="支払日">
                <TextInput
                  inputMode="numeric"
                  placeholder="2026-06-01"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  value={paidAt}
                  onChangeText={setPaidAt}
                />
              </Field>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.form}>
              <Field label="レシート画像URL/パス">
                <TextInput
                  autoCapitalize="none"
                  placeholder="receipts/room-id/expense-id.jpg"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  value={receiptImageUrl}
                  onChangeText={setReceiptImageUrl}
                />
              </Field>

              {!receiptImageUrl.trim() ? (
                <>
                  <Field label="レシートなし理由">
                    <OptionRow>
                      {noReceiptReasons.map((reason) => (
                        <OptionButton
                          key={reason}
                          isSelected={noReceiptReason === reason}
                          label={reason}
                          onPress={() => setNoReceiptReason(reason)}
                        />
                      ))}
                    </OptionRow>
                  </Field>

                  <Field label="補足メモ">
                    <TextInput
                      multiline
                      placeholder="交通費のため領収書がありません。"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.textArea,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                      value={noReceiptNote}
                      onChangeText={setNoReceiptNote}
                    />
                  </Field>
                </>
              ) : null}
            </ThemedView>

            {expenseType === 'personal' ? (
              <ThemedView type="backgroundElement" style={styles.form}>
                <Field label="割り方">
                  <OptionRow>
                    {splitTypeOptions.map((option) => (
                      <OptionButton
                        key={option.value}
                        isSelected={splitType === option.value}
                        label={option.label}
                        onPress={() => setSplitType(option.value)}
                      />
                    ))}
                  </OptionRow>
                </Field>

                <Field label="対象者">
                  {isLoadingMembers ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      参加者を読み込んでいます。
                    </ThemedText>
                  ) : members.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      このroomには対象者として選択できる参加者がありません。
                    </ThemedText>
                  ) : (
                    <View style={styles.memberList}>
                      {members.map((member) => {
                        const isSelected = selectedMemberIds.includes(
                          member.id,
                        );

                        return (
                          <Pressable
                            key={member.id}
                            onPress={() => toggleMember(member.id)}
                            style={({ pressed }) => [
                              styles.memberRow,
                              {
                                backgroundColor: isSelected
                                  ? theme.backgroundSelected
                                  : theme.background,
                                borderColor: theme.backgroundSelected,
                              },
                              pressed && styles.pressed,
                            ]}
                          >
                            <View style={styles.memberMain}>
                              <ThemedText type="smallBold">
                                {member.display_name || member.email}
                              </ThemedText>
                              <ThemedText
                                type="small"
                                themeColor="textSecondary"
                              >
                                {member.email}
                              </ThemedText>
                            </View>
                            <ThemedText type="smallBold">
                              {isSelected ? '選択中' : '選択'}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </Field>

                {splitType === 'custom' && selectedMemberIds.length > 0 ? (
                  <Field label="対象者ごとの金額">
                    <View style={styles.memberList}>
                      {members
                        .filter((member) =>
                          selectedMemberIds.includes(member.id),
                        )
                        .map((member) => (
                          <View key={member.id} style={styles.shareRow}>
                            <ThemedText
                              type="smallBold"
                              style={styles.shareLabel}
                            >
                              {member.display_name || member.email}
                            </ThemedText>
                            <TextInput
                              inputMode="numeric"
                              keyboardType="number-pad"
                              placeholder="3000"
                              placeholderTextColor={theme.textSecondary}
                              style={[
                                styles.input,
                                styles.shareInput,
                                {
                                  borderColor: theme.backgroundSelected,
                                  color: theme.text,
                                },
                              ]}
                              value={customShares[member.id] ?? ''}
                              onChangeText={(value) =>
                                setCustomShares((current) => ({
                                  ...current,
                                  [member.id]: value,
                                }))
                              }
                            />
                          </View>
                        ))}
                    </View>
                  </Field>
                ) : null}
              </ThemedView>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.button,
                  isSubmitting && styles.buttonDisabled,
                  pressed && !isSubmitting && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.buttonText}>
                  {isSubmitting ? '登録中...' : '支出を登録する'}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.ghostButton,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold">戻る</ThemedText>
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

function OptionRow({ children }: { children: ReactNode }) {
  return <View style={styles.optionRow}>{children}</View>;
}

function OptionButton({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        isSelected && styles.optionButtonSelected,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={isSelected ? styles.optionButtonTextSelected : undefined}
      >
        {label}
      </ThemedText>
    </Pressable>
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
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  form: {
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  textArea: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#a3a3a3',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  optionButtonSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  optionButtonTextSelected: {
    color: '#ffffff',
  },
  memberList: {
    gap: Spacing.two,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  memberMain: {
    flex: 1,
    gap: 2,
  },
  shareRow: {
    gap: Spacing.one,
  },
  shareLabel: {
    flex: 1,
  },
  shareInput: {
    width: '100%',
  },
  actions: {
    gap: Spacing.two,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    backgroundColor: '#2563eb',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  ghostButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    borderColor: '#a3a3a3',
  },
  buttonText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.72,
  },
});
