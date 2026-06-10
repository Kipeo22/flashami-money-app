import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createExpenseWithTargets } from '@/lib/expenses';
import { fetchCurrentUserRooms, type UserRoomRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

const categoryOptions = [
  '食費',
  '交通費',
  '宿泊費',
  '会場費',
  '備品代',
  '観光費',
  'その他',
];

const noReceiptReasons = [
  'レシートが発行されなかった',
  'レシートをもらい忘れた',
  '交通費のためレシートがない',
  'その他',
];

export function QuickExpenseModal({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const [activeRoom, setActiveRoom] = useState<UserRoomRecord | null>(null);
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noReceiptNote, setNoReceiptNote] = useState('');
  const [noReceiptReason, setNoReceiptReason] = useState('');
  const [paidAt, setPaidAt] = useState(getTodayIsoDate());
  const [receiptImageBase64, setReceiptImageBase64] = useState('');
  const [receiptImageUrl, setReceiptImageUrl] = useState('');

  useEffect(() => {
    let active = true;

    async function loadActiveRoom() {
      if (!visible) {
        return;
      }

      if (!isSupabaseConfigured) {
        setFeedback('ログインが必要です。');
        return;
      }

      setIsLoadingRoom(true);
      setFeedback(null);

      try {
        const rooms = await fetchCurrentUserRooms();
        const room = rooms.find((candidate) =>
          isRoomActive(candidate, getTodayIsoDate()),
        );

        if (!active) {
          return;
        }

        setActiveRoom(room ?? null);
        if (!room) {
          setFeedback('開催中のイベントがありません。');
        }
      } catch (error) {
        if (active) {
          setFeedback(
            error instanceof Error
              ? error.message
              : '開催中のイベントを取得できませんでした。',
          );
        }
      } finally {
        if (active) {
          setIsLoadingRoom(false);
        }
      }
    }

    loadActiveRoom();

    return () => {
      active = false;
    };
  }, [visible]);

  const resetForm = () => {
    setAmountText('');
    setCategory('');
    setDescription('');
    setNoReceiptNote('');
    setNoReceiptReason('');
    setPaidAt(getTodayIsoDate());
    setReceiptImageBase64('');
    setReceiptImageUrl('');
  };

  const handleClose = () => {
    setFeedback(null);
    resetForm();
    onClose();
  };

  const setReceiptImage = (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      setFeedback('レシート画像データを読み込めませんでした。');
      return;
    }

    setReceiptImageUrl(asset.uri);
    setReceiptImageBase64(asset.base64);
    setNoReceiptReason('');
    setNoReceiptNote('');
    setFeedback(null);
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
      base64: true,
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset) {
        setReceiptImage(asset);
      }
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
      base64: true,
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset) {
        setReceiptImage(asset);
      }
    }
  };

  const submitExpense = async () => {
    if (!activeRoom) {
      setFeedback('開催中のイベントがありません。');
      return;
    }

    const amount = parsePositiveInteger(amountText);
    if (amount === null) {
      setFeedback('金額は1円以上の整数で入力してください。');
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await createExpenseWithTargets({
        amount,
        category,
        description,
        expenseType: 'common',
        noReceiptNote,
        noReceiptReason,
        paidAt,
        receiptImageBase64,
        receiptImageUrl,
        roomId: activeRoom.id,
        splitType: null,
        targets: [],
      });

      resetForm();
      setFeedback('支出を登録しました。');
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : '支出の登録に失敗しました。',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isLoadingRoom || isSubmitting || !activeRoom;

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <SafeAreaView style={styles.safeArea}>
            <ThemedView
              type="backgroundElement"
              style={[
                styles.sheet,
                { borderColor: theme.border },
                Shadows.card,
              ]}
            >
              <View style={styles.handle} />

              <View style={styles.header}>
                <View style={styles.headerText}>
                  <ThemedText type="subtitle">支出入力</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {activeRoom?.name ??
                      (isLoadingRoom ? 'イベントを確認中' : 'イベント未選択')}
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityLabel="閉じる"
                  onPress={handleClose}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { backgroundColor: theme.backgroundSelected },
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                    size={18}
                    tintColor={theme.textSecondary}
                    fallback={
                      <Text style={{ color: theme.textSecondary }}>×</Text>
                    }
                  />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
              >
                {feedback ? (
                  <ThemedView type="overBackground" style={styles.feedbackBox}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {feedback}
                    </ThemedText>
                  </ThemedView>
                ) : null}

                <View style={styles.amountRow}>
                  <ThemedText type="default" style={styles.yenText}>
                    ¥
                  </ThemedText>
                  <TextInput
                    autoFocus
                    inputMode="numeric"
                    keyboardType="number-pad"
                    onChangeText={setAmountText}
                    placeholder="0"
                    placeholderTextColor={theme.textDisabled}
                    style={[styles.amountInput, { color: theme.text }]}
                    value={amountText}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">カテゴリ</ThemedText>
                  <View style={styles.optionRow}>
                    {categoryOptions.map((option) => (
                      <OptionButton
                        isSelected={category === option}
                        key={option}
                        label={option}
                        onPress={() => setCategory(option)}
                      />
                    ))}
                  </View>
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">内容</ThemedText>
                  <TextInput
                    onChangeText={setDescription}
                    placeholder="昼食代、タクシー代など"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={description}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">支払日</ThemedText>
                  <TextInput
                    autoCapitalize="none"
                    inputMode="numeric"
                    onChangeText={setPaidAt}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.background,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
                    value={paidAt}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedText type="smallBold">レシート</ThemedText>
                  <View style={styles.receiptActions}>
                    <Pressable
                      onPress={takeReceiptPhoto}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        { borderColor: theme.primary },
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ color: theme.primary }}
                      >
                        撮影
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={pickReceiptFromLibrary}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        { borderColor: theme.primary },
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ color: theme.primary }}
                      >
                        画像
                      </ThemedText>
                    </Pressable>
                  </View>

                  {receiptImageUrl ? (
                    <View style={styles.receiptPreviewRow}>
                      <Image
                        source={{ uri: receiptImageUrl }}
                        style={styles.receiptPreview}
                      />
                      <Pressable
                        onPress={() => {
                          setReceiptImageBase64('');
                          setReceiptImageUrl('');
                        }}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{ color: theme.danger }}
                        >
                          削除
                        </ThemedText>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      <ThemedText type="small" themeColor="textSecondary">
                        レシートがない場合は理由とメモを入力してください。
                      </ThemedText>
                      <View style={styles.optionRow}>
                        {noReceiptReasons.map((reason) => (
                          <OptionButton
                            isSelected={noReceiptReason === reason}
                            key={reason}
                            label={reason}
                            onPress={() => setNoReceiptReason(reason)}
                          />
                        ))}
                      </View>
                      <TextInput
                        multiline
                        onChangeText={setNoReceiptNote}
                        placeholder="例: 交通費のため領収書なし"
                        placeholderTextColor={theme.textSecondary}
                        style={[
                          styles.textArea,
                          {
                            backgroundColor: theme.background,
                            borderColor: theme.border,
                            color: theme.text,
                          },
                        ]}
                        value={noReceiptNote}
                      />
                    </>
                  )}
                </View>
              </ScrollView>

              <Pressable
                disabled={isSubmitDisabled}
                onPress={submitExpense}
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: isSubmitDisabled
                      ? theme.backgroundSelected
                      : theme.primary,
                  },
                  pressed && !isSubmitDisabled && styles.pressed,
                ]}
              >
                <ThemedText
                  type="default"
                  style={{
                    color: isSubmitDisabled ? theme.textSecondary : '#ffffff',
                    fontWeight: '700',
                  }}
                >
                  {isSubmitting ? '登録中...' : 'この内容で登録'}
                </ThemedText>
              </Pressable>
            </ThemedView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
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
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionButton,
        {
          backgroundColor: isSelected ? theme.primarySoft : 'transparent',
          borderColor: isSelected ? theme.primary : theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={{ color: isSelected ? theme.primary : theme.textSecondary }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isRoomActive(room: UserRoomRecord, todayIso: string) {
  if (!room.start_date || !room.end_date) {
    return false;
  }

  return room.start_date <= todayIso && room.end_date >= todayIso;
}

function parsePositiveInteger(value: string) {
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number.parseInt(trimmedValue, 10);
  return parsedValue >= 1 ? parsedValue : null;
}

const styles = StyleSheet.create({
  amountInput: {
    minWidth: 0,
    flex: 1,
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 54,
    padding: 0,
  },
  amountRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  feedbackBox: {
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  handle: {
    width: 38,
    height: 5,
    alignSelf: 'center',
    borderRadius: 3,
    backgroundColor: '#c1bdb7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  input: {
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.control,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  optionButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    paddingHorizontal: Spacing.three,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.62,
  },
  receiptActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  receiptPreview: {
    width: 64,
    height: 64,
    borderRadius: Radius.control,
  },
  receiptPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  safeArea: {
    justifyContent: 'flex-end',
  },
  secondaryButton: {
    minHeight: 44,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    paddingHorizontal: Spacing.three,
  },
  sheet: {
    width: '100%',
    maxHeight: '92%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.three,
  },
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.panel,
  },
  textArea: {
    minHeight: 84,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.control,
    fontSize: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    textAlignVertical: 'top',
  },
  yenText: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
});
