import { Image } from 'expo-image';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
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
import { useTheme } from '@/hooks/use-theme';
import {
  buildEqualShares,
  createExpense,
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_TYPE_OPTIONS,
  fetchExpenseTargetCandidates,
  NO_RECEIPT_REASON_OPTIONS,
  SPLIT_TYPE_OPTIONS,
  type ExpenseTargetInput,
  type ExpenseType,
  type SplitType,
} from '@/lib/expenses';
import { fetchRoomById, type RoomRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

type TargetCandidate = Awaited<
  ReturnType<typeof fetchExpenseTargetCandidates>
>[number];

const TODAY = new Date().toISOString().slice(0, 10);

export default function ExpenseCreateScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const router = useRouter();
  const theme = useTheme();

  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [members, setMembers] = useState<TargetCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expenseType, setExpenseType] = useState<ExpenseType>('common');
  const [amountInput, setAmountInput] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [paidAt, setPaidAt] = useState(TODAY);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);
  const [noReceiptReason, setNoReceiptReason] = useState('');
  const [noReceiptNote, setNoReceiptNote] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!roomId || Array.isArray(roomId)) {
        setFeedback('roomId が指定されていません。');
        setIsLoading(false);
        return;
      }

      if (!isSupabaseConfigured) {
        setFeedback(
          'Supabase が未設定です。`EXPO_PUBLIC_SUPABASE_URL` と `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を設定してください。',
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setFeedback(null);

      try {
        const [roomData, memberData] = await Promise.all([
          fetchRoomById(roomId),
          fetchExpenseTargetCandidates(roomId),
        ]);

        if (!active) {
          return;
        }

        setRoom(roomData);
        setMembers(memberData);
      } catch (error) {
        if (!active) {
          return;
        }

        setFeedback(
          error instanceof Error
            ? error.message
            : 'フォームに必要なデータの取得に失敗しました。',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [roomId]);

  const amount = Number.parseInt(amountInput, 10) || 0;

  const selectedTargets = useMemo<ExpenseTargetInput[]>(
    () =>
      members
        .filter((member) => selectedMemberIds.includes(member.id))
        .map((member) => ({
          userId: member.userId,
          email: member.email,
          displayName: member.displayName,
          amountShare: (() => {
            const nextValue = customShares[member.id];
            const parsed = Number.parseInt(nextValue ?? '', 10);
            return Number.isNaN(parsed) ? null : parsed;
          })(),
        })),
    [customShares, members, selectedMemberIds],
  );

  const equalShares = useMemo(
    () => buildEqualShares(amount, selectedTargets.length),
    [amount, selectedTargets.length],
  );

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  };

  const selectExpenseType = (nextExpenseType: ExpenseType) => {
    setExpenseType(nextExpenseType);

    if (nextExpenseType === 'common') {
      setSelectedMemberIds([]);
      setCustomShares({});
      setSplitType('equal');
    }
  };

  const pickReceiptImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        '権限が必要です',
        'レシート画像を添付するには写真ライブラリへのアクセスを許可してください。',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceiptImageUrl(result.assets[0]?.uri ?? null);
      setFeedback(null);
    }
  };

  const handleSubmit = async () => {
    if (!roomId || Array.isArray(roomId)) {
      setFeedback('roomId が指定されていません。');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await createExpense({
        roomId,
        expenseType,
        amount,
        category,
        description,
        paidAt,
        receiptImageUrl,
        noReceiptReason,
        noReceiptNote,
        splitType,
        targets: selectedTargets,
      });

      router.replace(`/rooms/${roomId}/members` as any);
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
                {room
                  ? `${room.name} の支出を登録します。`
                  : 'room内の支出を登録します。'}
              </ThemedText>
            </ThemedView>

            <View style={styles.actions}>
              {roomId && !Array.isArray(roomId) ? (
                <Link href={`/rooms/${roomId}/members` as any} asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold">参加者一覧へ</ThemedText>
                  </Pressable>
                </Link>
              ) : null}
            </View>

            {!isSupabaseConfigured ? (
              <Card>
                <ThemedText type="smallBold">Supabase が未設定です</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  `EXPO_PUBLIC_SUPABASE_URL` と
                  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を設定してください。
                </ThemedText>
              </Card>
            ) : null}

            {isLoading ? (
              <Card>
                <ThemedText type="smallBold">読み込み中</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  room と参加者を取得しています。
                </ThemedText>
              </Card>
            ) : null}

            {feedback ? (
              <Card>
                <ThemedText type="smallBold">入力を確認してください</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {feedback}
                </ThemedText>
              </Card>
            ) : null}

            <Card style={styles.form}>
              <Field label="支出タイプ">
                <OptionRow>
                  {EXPENSE_TYPE_OPTIONS.map((option) => (
                    <OptionButton
                      key={option.value}
                      label={option.label}
                      onPress={() => selectExpenseType(option.value)}
                      selected={expenseType === option.value}
                    />
                  ))}
                </OptionRow>
              </Field>

              <Field label="金額">
                <TextInput
                  inputMode="numeric"
                  keyboardType="numeric"
                  placeholder="12000"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  value={amountInput}
                  onChangeText={setAmountInput}
                />
              </Field>

              <Field label="カテゴリ">
                <OptionRow>
                  {EXPENSE_CATEGORY_OPTIONS.map((option) => (
                    <OptionButton
                      key={option}
                      label={option}
                      onPress={() => setCategory(option)}
                      selected={category === option}
                    />
                  ))}
                </OptionRow>
              </Field>

              <Field label="内容">
                <TextInput
                  placeholder="宿の予約代を立替"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
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
                  autoCapitalize="none"
                  inputMode="numeric"
                  placeholder="2026-06-02"
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
            </Card>

            <Card style={styles.form}>
              <Field label="レシート画像">
                <View style={styles.receiptActions}>
                  <Pressable
                    onPress={pickReceiptImage}
                    style={({ pressed }) => [
                      styles.button,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold" style={styles.buttonText}>
                      画像を選択する
                    </ThemedText>
                  </Pressable>

                  {receiptImageUrl ? (
                    <Pressable
                      onPress={() => setReceiptImageUrl(null)}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText type="smallBold">画像を外す</ThemedText>
                    </Pressable>
                  ) : null}
                </View>

                {receiptImageUrl ? (
                  <Image
                    contentFit="cover"
                    source={{ uri: receiptImageUrl }}
                    style={styles.receiptPreview}
                  />
                ) : (
                  <>
                    <Field label="レシートなし理由" compact>
                      <OptionRow>
                        {NO_RECEIPT_REASON_OPTIONS.map((option) => (
                          <OptionButton
                            key={option}
                            label={option}
                            onPress={() => setNoReceiptReason(option)}
                            selected={noReceiptReason === option}
                          />
                        ))}
                      </OptionRow>
                    </Field>

                    <Field label="補足メモ" compact>
                      <TextInput
                        multiline
                        placeholder="交通系IC利用のためレシートなし"
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
                )}
              </Field>
            </Card>

            {expenseType === 'personal' ? (
              <Card style={styles.form}>
                <Field label="対象者">
                  <View style={styles.memberList}>
                    {members.length === 0 ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        選択できる参加者がまだ登録されていません。
                      </ThemedText>
                    ) : (
                      members.map((member) => {
                        const selected = selectedMemberIds.includes(member.id);

                        return (
                          <Pressable
                            key={member.id}
                            onPress={() => toggleMember(member.id)}
                            style={({ pressed }) => [
                              styles.memberRow,
                              {
                                backgroundColor: selected
                                  ? theme.backgroundSelected
                                  : theme.background,
                                borderColor: theme.backgroundSelected,
                                opacity: pressed ? 0.72 : 1,
                              },
                            ]}
                          >
                            <View style={styles.memberMain}>
                              <ThemedText type="smallBold">
                                {member.displayName || member.email}
                              </ThemedText>
                              <ThemedText
                                type="small"
                                themeColor="textSecondary"
                              >
                                {member.email}
                              </ThemedText>
                            </View>
                            <Badge
                              label={selected ? '選択中' : member.status}
                            />
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                </Field>

                <Field label="割り方">
                  <OptionRow>
                    {SPLIT_TYPE_OPTIONS.map((option) => (
                      <OptionButton
                        key={option.value}
                        label={option.label}
                        onPress={() => setSplitType(option.value)}
                        selected={splitType === option.value}
                      />
                    ))}
                  </OptionRow>
                </Field>

                {selectedTargets.length > 0 ? (
                  <View style={styles.shareList}>
                    {selectedTargets.map((target, index) => (
                      <View
                        key={target.email}
                        style={[
                          styles.shareRow,
                          {
                            backgroundColor: theme.background,
                            borderColor: theme.backgroundSelected,
                          },
                        ]}
                      >
                        <View style={styles.shareMeta}>
                          <ThemedText type="smallBold">
                            {target.displayName || target.email}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {target.email}
                          </ThemedText>
                        </View>

                        {splitType === 'custom' ? (
                          <TextInput
                            inputMode="numeric"
                            keyboardType="numeric"
                            placeholder="3000"
                            placeholderTextColor={theme.textSecondary}
                            style={[
                              styles.shareInput,
                              {
                                borderColor: theme.backgroundSelected,
                                color: theme.text,
                              },
                            ]}
                            value={customShares[selectedMemberIds[index]] ?? ''}
                            onChangeText={(value) =>
                              setCustomShares((current) => ({
                                ...current,
                                [selectedMemberIds[index]]: value,
                              }))
                            }
                          />
                        ) : (
                          <ThemedText type="smallBold">
                            {equalShares[index] ?? 0}円
                          </ThemedText>
                        )}
                      </View>
                    ))}
                  </View>
                ) : null}
              </Card>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                disabled={isSubmitting || isLoading}
                onPress={handleSubmit}
                style={({ pressed }) => [
                  styles.button,
                  (isSubmitting || isLoading) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.buttonText}>
                  {isSubmitting ? '登録中...' : '支出を登録する'}
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ThemedView type="backgroundElement" style={[styles.card, style]}>
      {children}
    </ThemedView>
  );
}

function Field({
  children,
  compact = false,
  label,
}: {
  children: ReactNode;
  compact?: boolean;
  label: string;
}) {
  return (
    <View style={[styles.field, compact && styles.compactField]}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function OptionRow({ children }: { children: ReactNode }) {
  return <View style={styles.optionRow}>{children}</View>;
}

function OptionButton({
  label,
  onPress,
  selected,
}: {
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        {
          backgroundColor: selected
            ? theme.backgroundSelected
            : theme.background,
          borderColor: theme.backgroundSelected,
          opacity: pressed ? 0.72 : 1,
        },
      ]}
    >
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function Badge({ label }: { label: string }) {
  const theme = useTheme();

  return (
    <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {label}
      </ThemedText>
    </View>
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  form: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  compactField: {
    marginTop: Spacing.one,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  textArea: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    backgroundColor: '#2563eb',
  },
  secondaryButton: {
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
  disabled: {
    opacity: 0.56,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  receiptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  receiptPreview: {
    width: '100%',
    height: 220,
    borderRadius: Spacing.two,
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
  badge: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  shareList: {
    gap: Spacing.two,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  shareMeta: {
    flex: 1,
    gap: 2,
  },
  shareInput: {
    minWidth: 96,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    textAlign: 'right',
    fontSize: 16,
  },
});
