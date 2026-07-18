import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
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
  fetchExpenseTargetCandidates,
  type ExpenseType,
  type SplitType,
} from '@/lib/expenses';
import type { RoomMemberRecord } from '@/lib/rooms';
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
  const params = useLocalSearchParams<{ roomId?: string; type?: string }>();
  const roomId = Array.isArray(params.roomId) ? undefined : params.roomId;
  const initialType: ExpenseType =
    params.type === 'personal' ? 'personal' : 'common';
  const router = useRouter();
  const theme = useTheme();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [paidAt, setPaidAt] = useState(today());
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
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!roomId || !isSupabaseConfigured) return;
    fetchExpenseTargetCandidates(roomId)
      .then((data) => active && setMembers(data))
      .catch(
        (error) =>
          active &&
          setFeedback(
            error instanceof Error
              ? error.message
              : '参加者を取得できませんでした。',
          ),
      );
    return () => {
      active = false;
    };
  }, [roomId]);

  const selectedMembers = useMemo(
    () => members.filter((member) => selectedIds.includes(member.id)),
    [members, selectedIds],
  );

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

  const submit = async () => {
    if (!roomId) {
      setFeedback('roomが指定されていません。');
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const parsedAmount = Number(amount.replaceAll(',', ''));
      const expense = await createExpenseWithTargets({
        amount: parsedAmount,
        category,
        description,
        expenseType,
        noReceiptNote,
        noReceiptReason,
        paidAt,
        receiptImageBase64: receiptBase64,
        receiptImageUrl: receiptUri,
        roomId,
        splitType: expenseType === 'personal' ? splitType : null,
        targets: selectedMembers.map((member) => ({
          amountShare:
            splitType === 'custom' ? Number(shares[member.id] ?? 0) : null,
          member,
        })),
      });
      router.replace(`/rooms/${roomId}/expenses/${expense.id}` as never);
    } catch (error) {
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
            <AppHeader title="支出を入力" />
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              <View style={styles.amountSection}>
                <ThemedText type="small" themeColor="textSecondary">
                  金額
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
                <Field label="支出タイプ">
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
                <Field label="カテゴリ">
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
                <Field label="内容">
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
                <Field label="支払日">
                  <TextInput
                    inputMode="numeric"
                    onChangeText={setPaidAt}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textDisabled}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundElement,
                        color: theme.text,
                      },
                    ]}
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
                  <Field label="割り方">
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
                      対象者
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
                    <Field label="レシートなし理由">
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
                    <Field label="補足メモ">
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
              <PrimaryButton disabled={submitting} onPress={submit}>
                {submitting ? '登録中…' : '確認して登録 →'}
              </PrimaryButton>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
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
function today() {
  return new Date().toISOString().slice(0, 10);
}

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
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: 24 },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34,
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
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  removeText: { color: '#ffffff', fontSize: 22 },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  segment: { flexDirection: 'row', borderRadius: Radius.control, padding: 4 },
  segmentButton: {
    flex: 1,
    minHeight: 38,
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
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
