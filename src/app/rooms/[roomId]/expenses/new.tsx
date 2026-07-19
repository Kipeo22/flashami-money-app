import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import {
  AppHeader,
  PrimaryButton,
  SecondaryButton,
  SurfaceCard,
} from '@/components/ios-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createExpenseWithTargets,
  fetchExpenseById,
  fetchExpenseTargetCandidates,
  updateRejectedExpenseWithTargets,
  validateExpenseInput,
  type ExpenseType,
  type SplitType,
} from '@/lib/expenses';
import {
  fetchRoomById,
  getLocalIsoDate,
  isExpenseRegistrationOpen,
  normalizeEmail,
  type RoomMemberRecord,
  type RoomRecord,
} from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

const categories = [
  '宿泊費',
  '交通費',
  '食費',
  '会場費',
  '備品代',
  '観光費',
  'その他',
];
const noReceiptReasons = [
  '発行されなかった',
  'もらい忘れた',
  '交通費',
  '個人間送金',
  'その他',
];

export default function ExpenseFormScreen() {
  const params = useLocalSearchParams<{
    expenseId?: string;
    roomId?: string;
    type?: string;
  }>();
  const roomId = Array.isArray(params.roomId) ? undefined : params.roomId;
  const expenseId = Array.isArray(params.expenseId)
    ? undefined
    : params.expenseId;
  const initialType: ExpenseType =
    params.type === 'personal' ? 'personal' : 'common';
  const router = useRouter();
  const theme = useTheme();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [paidAt, setPaidAt] = useState(getLocalIsoDate());
  const [expenseType, setExpenseType] = useState<ExpenseType>(initialType);
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [members, setMembers] = useState<RoomMemberRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [shares, setShares] = useState<Record<string, string>>({});
  const [receiptUri, setReceiptUri] = useState('');
  const [receiptBase64, setReceiptBase64] = useState('');
  const [noReceiptReason, setNoReceiptReason] = useState('');
  const [noReceiptNote, setNoReceiptNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(Boolean(roomId));
  const [confirming, setConfirming] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const draftKey = roomId
    ? `flashami-money-app:expense-draft:${roomId}:${expenseId ?? 'new'}`
    : null;

  useEffect(() => {
    let active = true;
    if (!roomId || !isSupabaseConfigured) return;
    const resolvedRoomId = roomId;
    const restoreSavedDraft = (draft: ExpenseDraft) => {
      setAmount(draft.amount ?? '');
      setCategory(draft.category ?? '');
      setDescription(draft.description ?? '');
      setExpenseType(draft.expenseType ?? initialType);
      setNoReceiptNote(draft.noReceiptNote ?? '');
      setNoReceiptReason(draft.noReceiptReason ?? '');
      setPaidAt(draft.paidAt ?? getLocalIsoDate());
      setSelectedIds(draft.selectedIds ?? []);
      setShares(draft.shares ?? {});
      setSplitType(draft.splitType ?? 'equal');
    };
    async function loadForm() {
      try {
        const [memberData, roomData, savedDraft] = await Promise.all([
          fetchExpenseTargetCandidates(resolvedRoomId),
          fetchRoomById(resolvedRoomId),
          draftKey ? AsyncStorage.getItem(draftKey) : Promise.resolve(null),
        ]);
        if (!active) return;
        setMembers(memberData);
        setRoom(roomData);

        if (expenseId) {
          const expense = await fetchExpenseById(resolvedRoomId, expenseId);
          if (!active) return;
          if (!expense.is_current_user_payer || expense.status !== 'rejected') {
            throw new Error('この支出は修正して再申請できません。');
          }
          setAmount(String(expense.amount));
          setCategory(expense.category);
          setDescription(expense.description);
          setExpenseType(expense.expense_type);
          setPaidAt(expense.paid_at);
          setSplitType(expense.split_type ?? 'equal');
          setReceiptUri(expense.receipt_image_url ?? '');
          setNoReceiptReason(expense.no_receipt_reason ?? '');
          setNoReceiptNote(expense.no_receipt_note ?? '');
          const targetMembers = memberData.filter((member) =>
            expense.targets.some(
              (target) =>
                (target.user_id && target.user_id === member.user_id) ||
                (target.email &&
                  normalizeEmail(target.email) ===
                    normalizeEmail(member.email)),
            ),
          );
          setSelectedIds(targetMembers.map((member) => member.id));
          setShares(
            Object.fromEntries(
              targetMembers.map((member) => {
                const target = expense.targets.find(
                  (candidate) =>
                    (candidate.user_id &&
                      candidate.user_id === member.user_id) ||
                    (candidate.email &&
                      normalizeEmail(candidate.email) ===
                        normalizeEmail(member.email)),
                );
                return [member.id, String(target?.amount_share ?? '')];
              }),
            ),
          );
          if (savedDraft) {
            restoreSavedDraft(JSON.parse(savedDraft) as ExpenseDraft);
          }
        } else if (savedDraft) {
          restoreSavedDraft(JSON.parse(savedDraft) as ExpenseDraft);
        }
      } catch (error) {
        if (active) {
          setFeedback(
            error instanceof Error
              ? error.message
              : '支出入力画面を読み込めませんでした。',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
          setDraftHydrated(true);
        }
      }
    }

    loadForm();
    return () => {
      active = false;
    };
  }, [draftKey, expenseId, initialType, roomId]);

  useEffect(() => {
    if (!draftHydrated || !draftKey) return;
    const draft: ExpenseDraft = {
      amount,
      category,
      description,
      expenseType,
      noReceiptNote,
      noReceiptReason,
      paidAt,
      selectedIds,
      shares,
      splitType,
    };
    AsyncStorage.setItem(draftKey, JSON.stringify(draft)).catch(() => {
      // Draft persistence is best-effort and must not block registration.
    });
  }, [
    amount,
    category,
    description,
    draftHydrated,
    draftKey,
    expenseType,
    noReceiptNote,
    noReceiptReason,
    paidAt,
    selectedIds,
    shares,
    splitType,
  ]);

  const selectedMembers = useMemo(
    () => members.filter((member) => selectedIds.includes(member.id)),
    [members, selectedIds],
  );
  const parsedAmount = Number(amount.replaceAll(',', ''));
  const shareTotal = selectedMembers.reduce(
    (total, member) => total + Number(shares[member.id] || 0),
    0,
  );
  const targetNames = selectedMembers
    .map((member) => member.display_name || member.email)
    .join('、');
  const targetShareSummary = selectedMembers
    .map((member, index) => {
      const baseShare = Math.floor(parsedAmount / selectedMembers.length);
      const remainder = parsedAmount % selectedMembers.length;
      const memberShare =
        splitType === 'custom'
          ? Number(shares[member.id] ?? 0)
          : baseShare + (index < remainder ? 1 : 0);
      return `${member.display_name || member.email}：¥${memberShare.toLocaleString(
        'ja-JP',
      )}`;
    })
    .join('\n');
  const registrationOpen = room ? isExpenseRegistrationOpen(room) : false;

  const setReceipt = (asset?: ImagePicker.ImagePickerAsset) => {
    if (!asset?.base64) {
      setFeedback('レシート画像を読み込めませんでした。');
      return;
    }
    setReceiptUri(asset.uri);
    setReceiptBase64(asset.base64);
    setNoReceiptReason('');
    setNoReceiptNote('');
    setFeedback(null);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setFeedback('レシートを撮影するにはカメラの許可が必要です。');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setReceipt(result.assets[0]);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setReceipt(result.assets[0]);
  };

  const toggleMember = (id: string) => {
    setSelectedIds((ids) =>
      ids.includes(id)
        ? ids.filter((candidate) => candidate !== id)
        : [...ids, id],
    );
  };

  const buildInput = () => ({
    amount: parsedAmount,
    category,
    description,
    expenseType,
    noReceiptNote,
    noReceiptReason,
    paidAt,
    receiptImageBase64: receiptBase64,
    receiptImageUrl: receiptUri,
    roomId: roomId ?? '',
    splitType: expenseType === 'personal' ? splitType : null,
    targets: selectedMembers.map((member) => ({
      amountShare:
        splitType === 'custom' ? Number(shares[member.id] ?? 0) : null,
      member,
    })),
  });

  const openConfirmation = () => {
    if (!roomId) {
      setFeedback('イベントが指定されていません。');
      return;
    }
    if (!registrationOpen) {
      setFeedback('このイベントは現在、支出登録期間外です。');
      return;
    }
    const validationError = validateExpenseInput(buildInput());
    if (validationError) {
      setFeedback(validationError);
      return;
    }
    setFeedback(null);
    setConfirming(true);
  };

  const distributeSharesEqually = () => {
    if (!Number.isInteger(parsedAmount) || parsedAmount < 1) {
      setFeedback('先に支出金額を入力してください。');
      return;
    }
    if (selectedMembers.length === 0) {
      setFeedback('対象者を1人以上選択してください。');
      return;
    }
    const base = Math.floor(parsedAmount / selectedMembers.length);
    const remainder = parsedAmount % selectedMembers.length;
    setShares(
      Object.fromEntries(
        selectedMembers.map((member, index) => [
          member.id,
          String(base + (index < remainder ? 1 : 0)),
        ]),
      ),
    );
    setFeedback(null);
  };

  const submit = async () => {
    if (!roomId) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      const expense = expenseId
        ? await updateRejectedExpenseWithTargets({
            ...buildInput(),
            expenseId,
          })
        : await createExpenseWithTargets(buildInput());
      if (draftKey) {
        await AsyncStorage.removeItem(draftKey);
      }
      setConfirming(false);
      router.replace(`/rooms/${roomId}/expenses/${expense.id}` as never);
    } catch (error) {
      setConfirming(false);
      setFeedback(
        error instanceof Error ? error.message : '支出を登録できませんでした。',
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
          <View style={styles.headerWrap}>
            <AppHeader title={expenseId ? '支出を修正' : '支出を入力'} />
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              {room ? (
                <SurfaceCard style={styles.roomBanner}>
                  <View style={styles.roomBannerText}>
                    <ThemedText type="small" themeColor="textSecondary">
                      登録先
                    </ThemedText>
                    <ThemedText type="smallBold">{room.name}</ThemedText>
                  </View>
                  <ThemedText
                    type="smallBold"
                    themeColor={registrationOpen ? 'primary' : 'danger'}
                  >
                    {registrationOpen ? '登録受付中' : '登録期間外'}
                  </ThemedText>
                </SurfaceCard>
              ) : null}

              <View style={styles.amountSection}>
                <ThemedText type="small" themeColor="textSecondary">
                  金額 <ThemedText themeColor="danger">*</ThemedText>
                </ThemedText>
                <View
                  style={[
                    styles.amountRow,
                    { borderBottomColor: theme.border },
                  ]}
                >
                  <ThemedText type="subtitle">¥</ThemedText>
                  <TextInput
                    inputMode="numeric"
                    keyboardType="number-pad"
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor={theme.border}
                    style={[styles.amountInput, { color: theme.text }]}
                    value={amount}
                  />
                </View>
              </View>

              <SurfaceCard
                style={[
                  styles.formCard,
                  { backgroundColor: theme.overBackground },
                ]}
              >
                <Field label="支出タイプ" required>
                  <View
                    style={[
                      styles.segment,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    <SegmentButton
                      active={expenseType === 'common'}
                      label="共通経費"
                      onPress={() => setExpenseType('common')}
                    />
                    <SegmentButton
                      active={expenseType === 'personal'}
                      label="個人間立替"
                      onPress={() => setExpenseType('personal')}
                    />
                  </View>
                </Field>
                <Field label="カテゴリ" required>
                  <View style={styles.chips}>
                    {categories.map((item) => (
                      <Chip
                        active={category === item}
                        key={item}
                        label={item}
                        onPress={() => setCategory(item)}
                      />
                    ))}
                  </View>
                </Field>
                <Field label="内容" required>
                  <TextInput
                    onChangeText={setDescription}
                    placeholder="例：食べ歩き"
                    placeholderTextColor={theme.textDisabled}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundElement,
                        color: theme.text,
                      },
                    ]}
                    value={description}
                  />
                </Field>
                <Field label="支払日" required>
                  <DateField
                    onChange={setPaidAt}
                    placeholder="支払日を選択"
                    value={paidAt}
                  />
                </Field>
              </SurfaceCard>

              {expenseType === 'personal' ? (
                <SurfaceCard
                  style={[
                    styles.formCard,
                    { backgroundColor: theme.overBackground },
                  ]}
                >
                  <Field label="割り方" required>
                    <View
                      style={[
                        styles.segment,
                        { backgroundColor: theme.backgroundElement },
                      ]}
                    >
                      <SegmentButton
                        active={splitType === 'equal'}
                        label="均等"
                        onPress={() => setSplitType('equal')}
                      />
                      <SegmentButton
                        active={splitType === 'custom'}
                        label="金額指定"
                        onPress={() => setSplitType('custom')}
                      />
                    </View>
                  </Field>
                  <View style={styles.labelRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      対象者 <ThemedText themeColor="danger">*</ThemedText>
                    </ThemedText>
                    <Pressable
                      onPress={() =>
                        setSelectedIds(members.map((member) => member.id))
                      }
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ color: theme.primary }}
                      >
                        全選択
                      </ThemedText>
                    </Pressable>
                  </View>
                  <View style={styles.chips}>
                    {members.map((member) => (
                      <Chip
                        active={selectedIds.includes(member.id)}
                        key={member.id}
                        label={
                          member.display_name || member.email.split('@')[0]
                        }
                        onPress={() => toggleMember(member.id)}
                      />
                    ))}
                  </View>
                  {splitType === 'custom' && selectedMembers.length > 0 ? (
                    <View style={styles.shareList}>
                      <View style={styles.shareSummary}>
                        <View>
                          <ThemedText type="small" themeColor="textSecondary">
                            入力合計
                          </ThemedText>
                          <ThemedText type="smallBold">
                            ¥{shareTotal.toLocaleString('ja-JP')} / ¥
                            {Number.isFinite(parsedAmount)
                              ? parsedAmount.toLocaleString('ja-JP')
                              : '0'}
                          </ThemedText>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          onPress={distributeSharesEqually}
                          style={styles.equalShareButton}
                        >
                          <ThemedText
                            type="smallBold"
                            style={{ color: theme.primary }}
                          >
                            均等に入力
                          </ThemedText>
                        </Pressable>
                      </View>
                      {shareTotal !== parsedAmount ? (
                        <ThemedText type="small" themeColor="danger">
                          {shareTotal < parsedAmount ? '残り' : '超過'} ¥
                          {Math.abs(parsedAmount - shareTotal).toLocaleString(
                            'ja-JP',
                          )}
                        </ThemedText>
                      ) : null}
                      {selectedMembers.map((member) => (
                        <View key={member.id} style={styles.shareRow}>
                          <ThemedText type="small">
                            {member.display_name || member.email}
                          </ThemedText>
                          <TextInput
                            inputMode="numeric"
                            onChangeText={(value) =>
                              setShares((current) => ({
                                ...current,
                                [member.id]: value,
                              }))
                            }
                            placeholder="0"
                            placeholderTextColor={theme.textDisabled}
                            style={[
                              styles.shareInput,
                              {
                                backgroundColor: theme.backgroundElement,
                                color: theme.text,
                              },
                            ]}
                            value={shares[member.id] ?? ''}
                          />
                        </View>
                      ))}
                    </View>
                  ) : null}
                </SurfaceCard>
              ) : null}

              <SurfaceCard
                style={[
                  styles.formCard,
                  { backgroundColor: theme.overBackground },
                ]}
              >
                <Field label="レシート">
                  {receiptUri ? (
                    <View style={styles.receiptPreviewWrap}>
                      <Image
                        source={{ uri: receiptUri }}
                        style={styles.receiptPreview}
                      />
                      <Pressable
                        onPress={() => {
                          setReceiptUri('');
                          setReceiptBase64('');
                        }}
                        style={[
                          styles.removeReceipt,
                          { backgroundColor: theme.danger },
                        ]}
                      >
                        <ThemedText style={styles.removeText}>×</ThemedText>
                      </Pressable>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.receiptDrop,
                        { borderColor: theme.textDisabled },
                      ]}
                    >
                      <SymbolView
                        name={{
                          ios: 'camera.fill',
                          android: 'photo_camera',
                          web: 'photo_camera',
                        }}
                        size={32}
                        tintColor={theme.textSecondary}
                        fallback={
                          <Text style={{ color: theme.textSecondary }}>▣</Text>
                        }
                      />
                      <ThemedText type="small" themeColor="textSecondary">
                        撮影または写真から選択
                      </ThemedText>
                      <View style={styles.receiptActions}>
                        <SecondaryButton
                          onPress={takePhoto}
                          style={styles.receiptButton}
                        >
                          撮影
                        </SecondaryButton>
                        <SecondaryButton
                          onPress={pickImage}
                          style={styles.receiptButton}
                        >
                          写真を選ぶ
                        </SecondaryButton>
                      </View>
                    </View>
                  )}
                </Field>

                {!receiptUri ? (
                  <>
                    <Field label="レシートなし理由" required>
                      <View style={styles.chips}>
                        {noReceiptReasons.map((reason) => (
                          <Chip
                            active={noReceiptReason === reason}
                            key={reason}
                            label={reason}
                            onPress={() => setNoReceiptReason(reason)}
                          />
                        ))}
                      </View>
                    </Field>
                    <Field label="補足メモ" required>
                      <TextInput
                        multiline
                        onChangeText={setNoReceiptNote}
                        placeholder="レシートがない事情を入力してください"
                        placeholderTextColor={theme.textDisabled}
                        style={[
                          styles.memo,
                          {
                            backgroundColor: theme.backgroundElement,
                            color: theme.text,
                          },
                        ]}
                        textAlignVertical="top"
                        value={noReceiptNote}
                      />
                    </Field>
                  </>
                ) : null}
              </SurfaceCard>

              {feedback ? (
                <ThemedText type="small" themeColor="danger">
                  {feedback}
                </ThemedText>
              ) : null}
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.draftNote}
              >
                文字入力はこの端末に下書きとして一時保存されます。
              </ThemedText>
              <PrimaryButton
                disabled={loading || submitting || !registrationOpen}
                onPress={openConfirmation}
              >
                {loading
                  ? '読み込み中…'
                  : expenseId
                    ? '確認して再申請 →'
                    : '確認して登録 →'}
              </PrimaryButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        animationType="fade"
        onRequestClose={() => setConfirming(false)}
        transparent
        visible={confirming}
      >
        <View style={styles.confirmBackdrop}>
          <View
            style={[
              styles.confirmCard,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <ThemedText type="subtitle">
              {expenseId ? 'この内容で再申請しますか？' : '登録内容の確認'}
            </ThemedText>
            <ScrollView
              contentContainerStyle={styles.confirmRows}
              showsVerticalScrollIndicator
              style={styles.confirmScroll}
            >
              <ConfirmRow label="イベント" value={room?.name ?? '-'} />
              <ConfirmRow
                label="金額"
                value={`¥${parsedAmount.toLocaleString('ja-JP')}`}
              />
              <ConfirmRow
                label="種類"
                value={expenseType === 'common' ? '共通経費' : '個人間立替'}
              />
              <ConfirmRow label="カテゴリ" value={category} />
              <ConfirmRow label="内容" value={description} />
              <ConfirmRow label="支払日" value={paidAt} />
              {expenseType === 'personal' ? (
                <>
                  <ConfirmRow label="対象者" value={targetNames || '-'} />
                  <ConfirmRow
                    label="割り方"
                    value={splitType === 'equal' ? '均等' : '金額指定'}
                  />
                  <ConfirmRow
                    label="各自の金額"
                    value={targetShareSummary || '-'}
                  />
                </>
              ) : null}
              <ConfirmRow
                label="レシート"
                value={receiptUri ? '添付あり' : '添付なし'}
              />
            </ScrollView>
            <View style={styles.confirmActions}>
              <SecondaryButton
                onPress={() => setConfirming(false)}
                style={styles.confirmAction}
              >
                戻って修正
              </SecondaryButton>
              <PrimaryButton
                disabled={submitting}
                onPress={submit}
                style={styles.confirmAction}
              >
                {submitting ? '送信中…' : expenseId ? '再申請する' : '登録する'}
              </PrimaryButton>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function Field({
  children,
  label,
  required = false,
}: {
  children: React.ReactNode;
  label: string;
  required?: boolean;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}{' '}
        {required ? <ThemedText themeColor="danger">*</ThemedText> : null}
      </ThemedText>
      {children}
    </View>
  );
}
function SegmentButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.segmentButton,
        active && { backgroundColor: theme.primary },
      ]}
    >
      <ThemedText
        type="smallBold"
        style={{ color: active ? '#ffffff' : theme.textSecondary }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.primarySoft : theme.backgroundElement,
          borderColor: active ? theme.primary : theme.border,
        },
      ]}
    >
      <ThemedText
        type="small"
        style={{ color: active ? theme.primary : theme.textSecondary }}
      >
        {active ? '✓ ' : ''}
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.confirmRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.confirmValue}>
        {value}
      </ThemedText>
    </View>
  );
}

type ExpenseDraft = {
  amount: string;
  category: string;
  description: string;
  expenseType: ExpenseType;
  noReceiptNote: string;
  noReceiptReason: string;
  paidAt: string;
  selectedIds: string[];
  shares: Record<string, string>;
  splitType: SplitType;
};

const styles = StyleSheet.create({
  amountInput: {
    flex: 1,
    padding: 0,
    fontFamily: Fonts.sans,
    fontSize: 48,
    lineHeight: 58,
    textAlign: 'center',
  },
  amountRow: {
    width: 190,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  amountSection: { alignItems: 'center', gap: 4 },
  chip: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  confirmAction: { flex: 1 },
  confirmActions: { flexDirection: 'row', gap: 10 },
  confirmBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 20, 24, 0.52)',
    padding: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 400,
    gap: 20,
    borderRadius: Radius.panel,
    padding: 20,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  confirmRows: { gap: 12 },
  confirmScroll: { maxHeight: 390 },
  confirmValue: { flex: 1, textAlign: 'right' },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: 24 },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34,
  },
  draftNote: { textAlign: 'center' },
  equalShareButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  field: { gap: 8 },
  formCard: { gap: 18, padding: 16 },
  headerWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 18,
  },
  input: {
    minHeight: 50,
    borderRadius: Radius.control,
    paddingHorizontal: 14,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  memo: {
    minHeight: 92,
    borderRadius: Radius.control,
    padding: 14,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  receiptActions: { flexDirection: 'row', gap: 10 },
  receiptButton: { minHeight: 42, paddingHorizontal: 16 },
  receiptDrop: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.control,
  },
  receiptPreview: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.control,
  },
  receiptPreviewWrap: { position: 'relative' },
  removeReceipt: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  removeText: { color: '#ffffff', fontSize: 22 },
  roomBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 12,
  },
  roomBannerText: { flex: 1, gap: 2 },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  segment: { flexDirection: 'row', borderRadius: Radius.control, padding: 4 },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  shareInput: {
    width: 100,
    minHeight: 42,
    borderRadius: Radius.control,
    paddingHorizontal: 10,
    fontFamily: Fonts.sans,
    textAlign: 'right',
  },
  shareList: { gap: 8 },
  shareSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
