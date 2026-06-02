import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
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
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
  type FieldValues,
  type Path,
  type PathValue,
} from 'react-hook-form';
import { z } from 'zod';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createExpenseWithTargets,
  fetchExpenseTargetCandidates,
  type ExpenseType,
  type SplitType,
} from '@/lib/expenses';
import { isValidIsoDate, type RoomMemberRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

const expenseTypeOptions: { label: string; value: ExpenseType }[] = [
  { label: '共通経費', value: 'common' },
  { label: '個人間立替', value: 'personal' },
];

const splitTypeOptions: { label: string; value: SplitType }[] = [
  { label: '均等', value: 'equal' },
  { label: '金額指定', value: 'custom' },
];

const categoryOptions = [
  '宿泊費',
  '交通費',
  '食費',
  '会場費',
  '備品代',
  '観光費',
  'その他',
];

const noReceiptReasons = [
  'レシートが発行されなかった',
  'レシートをもらい忘れた',
  '交通費のためレシートがない',
  '個人間送金のためレシートがない',
  'その他',
];

const defaultValues = {
  amountText: '',
  category: '',
  customShares: {},
  description: '',
  expenseType: 'common',
  noReceiptNote: '',
  noReceiptReason: '',
  paidAt: '',
  receiptImageUrl: '',
  selectedMemberIds: [],
  splitType: 'equal',
} satisfies ExpenseFormValues;

const expenseFormSchema = z
  .object({
    amountText: z
      .string()
      .refine(
        (value) => parsePositiveInteger(value) !== null,
        '金額は1円以上の整数で入力してください。',
      ),
    category: z
      .string()
      .refine(
        (value) => value.trim().length > 0,
        'カテゴリを選択してください。',
      ),
    customShares: z.record(z.string(), z.string()),
    description: z
      .string()
      .refine((value) => value.trim().length > 0, '内容を入力してください。'),
    expenseType: z.enum(['common', 'personal']),
    noReceiptNote: z.string(),
    noReceiptReason: z.string(),
    paidAt: z
      .string()
      .refine(
        (value) => isValidIsoDate(value),
        '支払日は YYYY-MM-DD 形式で入力してください。',
      ),
    receiptImageUrl: z.string(),
    selectedMemberIds: z.array(z.string()),
    splitType: z.enum(['equal', 'custom']),
  })
  .superRefine((value, context) => {
    const amount = parsePositiveInteger(value.amountText);
    const hasReceiptImage = value.receiptImageUrl.trim().length > 0;

    if (!hasReceiptImage && !value.noReceiptReason.trim()) {
      context.addIssue({
        code: 'custom',
        message: 'レシート画像がない場合はレシートなし理由を選択してください。',
        path: ['noReceiptReason'],
      });
    }

    if (!hasReceiptImage && !value.noReceiptNote.trim()) {
      context.addIssue({
        code: 'custom',
        message: 'レシート画像がない場合は補足メモを入力してください。',
        path: ['noReceiptNote'],
      });
    }

    if (value.expenseType !== 'personal') {
      return;
    }

    if (value.selectedMemberIds.length === 0) {
      context.addIssue({
        code: 'custom',
        message: '個人間立替の場合は対象者を1人以上選択してください。',
        path: ['selectedMemberIds'],
      });
    }

    if (value.splitType !== 'custom') {
      return;
    }

    let targetTotal = 0;
    for (const memberId of value.selectedMemberIds) {
      const share = parsePositiveInteger(value.customShares[memberId] ?? '');

      if (share === null) {
        context.addIssue({
          code: 'custom',
          message:
            '金額指定の場合は対象者ごとの金額を1円以上の整数で入力してください。',
          path: ['customShares', memberId],
        });
        continue;
      }

      targetTotal += share;
    }

    if (amount !== null && targetTotal !== amount) {
      context.addIssue({
        code: 'custom',
        message: '対象者ごとの金額合計を支出金額と一致させてください。',
        path: ['customShares'],
      });
    }
  });

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export default function ExpenseCreateScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const router = useRouter();
  const theme = useTheme();
  const resolvedRoomId = Array.isArray(roomId) ? undefined : roomId;
  const [members, setMembers] = useState<RoomMemberRecord[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setValue,
  } = useForm<ExpenseFormValues>({
    defaultValues,
    resolver: zodResolver(expenseFormSchema),
  });

  const amountText = useWatch({ control, name: 'amountText' });
  const category = useWatch({ control, name: 'category' });
  const customShares = useWatch({ control, name: 'customShares' });
  const expenseType = useWatch({ control, name: 'expenseType' });
  const noReceiptReason = useWatch({ control, name: 'noReceiptReason' });
  const receiptImageUrl = useWatch({ control, name: 'receiptImageUrl' });
  const selectedMemberIds = useWatch({ control, name: 'selectedMemberIds' });
  const splitType = useWatch({ control, name: 'splitType' });

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
          amountShare:
            splitType === 'custom'
              ? parsePositiveInteger(customShares[member.id] ?? '')
              : null,
          member,
        })),
    [customShares, members, selectedMemberIds, splitType],
  );

  const setFormValue = <TName extends Path<ExpenseFormValues>>(
    name: TName,
    value: PathValue<ExpenseFormValues, TName>,
  ) => {
    setValue(name, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const selectExpenseType = (nextExpenseType: ExpenseType) => {
    setFormValue('expenseType', nextExpenseType);

    if (nextExpenseType === 'common') {
      setFormValue('selectedMemberIds', []);
      setFormValue('splitType', 'equal');
      setFormValue('customShares', {});
    }
  };

  const selectSplitType = (nextSplitType: SplitType) => {
    setFormValue('splitType', nextSplitType);

    if (nextSplitType === 'equal') {
      setFormValue('customShares', {});
    }
  };

  const toggleMember = (memberId: string) => {
    const nextMemberIds = selectedMemberIds.includes(memberId)
      ? selectedMemberIds.filter((id) => id !== memberId)
      : [...selectedMemberIds, memberId];
    const nextCustomShares = { ...customShares };

    if (!nextMemberIds.includes(memberId)) {
      delete nextCustomShares[memberId];
    }

    setFormValue('selectedMemberIds', nextMemberIds);
    setFormValue('customShares', nextCustomShares);
  };

  const setReceiptImageUrl = (uri: string) => {
    setFormValue('receiptImageUrl', uri);

    if (uri) {
      setFormValue('noReceiptReason', '');
      setFormValue('noReceiptNote', '');
    }
  };

  const pickReceiptFromLibrary = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setFeedback('画像ライブラリへのアクセス許可が必要です。');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceiptImageUrl(result.assets[0]?.uri ?? '');
      setFeedback(null);
    }
  };

  const takeReceiptPhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissionResult.granted) {
      setFeedback('カメラへのアクセス許可が必要です。');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceiptImageUrl(result.assets[0]?.uri ?? '');
      setFeedback(null);
    }
  };

  const onValidSubmit = async (values: ExpenseFormValues) => {
    if (!resolvedRoomId) {
      setFeedback('roomId が指定されていません。');
      return;
    }

    const amount = parsePositiveInteger(values.amountText);
    if (amount === null) {
      setFeedback('金額は1円以上の整数で入力してください。');
      return;
    }

    setFeedback(null);

    try {
      await createExpenseWithTargets({
        amount,
        category: values.category,
        description: values.description,
        expenseType: values.expenseType,
        noReceiptNote: values.noReceiptNote,
        noReceiptReason: values.noReceiptReason,
        paidAt: values.paidAt,
        receiptImageUrl: values.receiptImageUrl,
        roomId: resolvedRoomId,
        splitType: values.expenseType === 'personal' ? values.splitType : null,
        targets: values.expenseType === 'personal' ? selectedTargets : [],
      });

      reset(defaultValues);
      setFeedback('支出を登録しました。');
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : '支出の登録に失敗しました。',
      );
    }
  };

  const onInvalidSubmit = (fieldErrors: FieldErrors<ExpenseFormValues>) => {
    setFeedback(readErrorMessage(fieldErrors) ?? '入力を確認してください。');
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
              <Field label="支出タイプ" error={errors.expenseType?.message}>
                <OptionRow>
                  {expenseTypeOptions.map((option) => (
                    <OptionButton
                      key={option.value}
                      isSelected={expenseType === option.value}
                      label={option.label}
                      onPress={() => selectExpenseType(option.value)}
                    />
                  ))}
                </OptionRow>
              </Field>

              <Field label="金額" error={errors.amountText?.message}>
                <Controller
                  control={control}
                  name="amountText"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextInput
                      inputMode="numeric"
                      keyboardType="number-pad"
                      onBlur={onBlur}
                      placeholder="12000"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
              </Field>

              <Field label="カテゴリ" error={errors.category?.message}>
                <OptionRow>
                  {categoryOptions.map((option) => (
                    <OptionButton
                      key={option}
                      isSelected={category === option}
                      label={option}
                      onPress={() => setFormValue('category', option)}
                    />
                  ))}
                </OptionRow>
              </Field>

              <Field label="内容" error={errors.description?.message}>
                <Controller
                  control={control}
                  name="description"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextInput
                      multiline
                      onBlur={onBlur}
                      placeholder="ホテル代 2泊分"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.textArea,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
              </Field>

              <Field label="支払日" error={errors.paidAt?.message}>
                <Controller
                  control={control}
                  name="paidAt"
                  render={({ field: { onBlur, onChange, value } }) => (
                    <TextInput
                      autoCapitalize="none"
                      inputMode="numeric"
                      onBlur={onBlur}
                      placeholder="2026-06-01"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        {
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
              </Field>
            </ThemedView>

            <ThemedView type="backgroundElement" style={styles.form}>
              <Field
                label="レシート画像"
                error={errors.receiptImageUrl?.message}
              >
                <View style={styles.receiptActions}>
                  <Pressable
                    onPress={pickReceiptFromLibrary}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold">画像を選択</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={takeReceiptPhoto}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold">撮影する</ThemedText>
                  </Pressable>
                </View>
                {receiptImageUrl ? (
                  <ThemedView
                    type="backgroundElement"
                    style={styles.receiptInfo}
                  >
                    <ThemedText type="smallBold">選択済み</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {receiptImageUrl}
                    </ThemedText>
                    <Pressable
                      onPress={() => setReceiptImageUrl('')}
                      style={({ pressed }) => [
                        styles.clearReceiptButton,
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText type="smallBold">画像を削除</ThemedText>
                    </Pressable>
                  </ThemedView>
                ) : null}
              </Field>

              {!receiptImageUrl.trim() ? (
                <>
                  <Field
                    label="レシートなし理由"
                    error={errors.noReceiptReason?.message}
                  >
                    <OptionRow>
                      {noReceiptReasons.map((reason) => (
                        <OptionButton
                          key={reason}
                          isSelected={noReceiptReason === reason}
                          label={reason}
                          onPress={() =>
                            setFormValue('noReceiptReason', reason)
                          }
                        />
                      ))}
                    </OptionRow>
                  </Field>

                  <Field label="補足メモ" error={errors.noReceiptNote?.message}>
                    <Controller
                      control={control}
                      name="noReceiptNote"
                      render={({ field: { onBlur, onChange, value } }) => (
                        <TextInput
                          multiline
                          onBlur={onBlur}
                          placeholder="交通費のため領収書がありません。"
                          placeholderTextColor={theme.textSecondary}
                          style={[
                            styles.textArea,
                            {
                              borderColor: theme.backgroundSelected,
                              color: theme.text,
                            },
                          ]}
                          value={value}
                          onChangeText={onChange}
                        />
                      )}
                    />
                  </Field>
                </>
              ) : null}
            </ThemedView>

            {expenseType === 'personal' ? (
              <ThemedView type="backgroundElement" style={styles.form}>
                <Field label="割り方" error={errors.splitType?.message}>
                  <OptionRow>
                    {splitTypeOptions.map((option) => (
                      <OptionButton
                        key={option.value}
                        isSelected={splitType === option.value}
                        label={option.label}
                        onPress={() => selectSplitType(option.value)}
                      />
                    ))}
                  </OptionRow>
                </Field>

                <Field label="対象者" error={errors.selectedMemberIds?.message}>
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
                  <Field
                    label="対象者ごとの金額"
                    error={readErrorMessage(errors.customShares)}
                  >
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
                              placeholder={amountText ? amountText : '3000'}
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
                                setFormValue('customShares', {
                                  ...customShares,
                                  [member.id]: value,
                                })
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
                disabled={isSubmitting || !isSupabaseConfigured}
                onPress={() =>
                  void handleSubmit(onValidSubmit, onInvalidSubmit)()
                }
                style={({ pressed }) => [
                  styles.button,
                  (isSubmitting || !isSupabaseConfigured) &&
                    styles.buttonDisabled,
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
  error,
  label,
  style,
}: {
  children: ReactNode;
  error?: string;
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ThemedView style={[styles.field, style]}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
      {error ? (
        <ThemedText type="small" style={styles.errorText}>
          {error}
        </ThemedText>
      ) : null}
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

function parsePositiveInteger(value: string) {
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);
  return parsedValue >= 1 ? parsedValue : null;
}

function readErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if ('message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return Object.values(error as FieldValues)
    .map(readErrorMessage)
    .find((message) => message);
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
  errorText: {
    color: '#dc2626',
  },
  memberList: {
    gap: Spacing.two,
  },
  receiptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  receiptInfo: {
    gap: Spacing.one,
    borderRadius: Spacing.two,
    padding: Spacing.two,
  },
  clearReceiptButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#a3a3a3',
    paddingHorizontal: Spacing.three,
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
  secondaryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: '#a3a3a3',
    paddingHorizontal: Spacing.three,
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
