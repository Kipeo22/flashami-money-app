import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchExpenseById,
  updateExpenseReviewStatus,
  type ExpenseDetailRecord,
} from '@/lib/expenses';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ExpenseDetailScreen() {
  const { expenseId, roomId } = useLocalSearchParams<{
    expenseId?: string;
    roomId?: string;
  }>();
  const router = useRouter();
  const theme = useTheme();
  const resolvedRoomId = Array.isArray(roomId) ? undefined : roomId;
  const resolvedExpenseId = Array.isArray(expenseId) ? undefined : expenseId;
  const [expense, setExpense] = useState<ExpenseDetailRecord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadExpense() {
      if (!resolvedRoomId || !resolvedExpenseId) {
        setIsLoading(false);
        return;
      }

      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }

      setIsLoading(true);
      try {
        const expenseData = await fetchExpenseById(
          resolvedRoomId,
          resolvedExpenseId,
        );

        if (active) {
          setExpense(expenseData);
          setRejectionReason(expenseData.rejection_reason ?? '');
          setFeedback(null);
          setStatusFeedback(null);
        }
      } catch (error) {
        if (active) {
          setFeedback(
            error instanceof Error
              ? error.message
              : '支出情報の取得に失敗しました。',
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadExpense();

    return () => {
      active = false;
    };
  }, [resolvedExpenseId, resolvedRoomId, router]);

  const handleApprove = async () => {
    if (!resolvedRoomId || !resolvedExpenseId) {
      setStatusFeedback('roomId または expenseId が指定されていません。');
      return;
    }

    setIsUpdatingStatus(true);
    setStatusFeedback(null);

    try {
      const updatedExpense = await updateExpenseReviewStatus({
        expenseId: resolvedExpenseId,
        roomId: resolvedRoomId,
        status: 'approved',
      });

      setExpense(updatedExpense);
      setRejectionReason('');
      setStatusFeedback('支出を承認しました。');
    } catch (error) {
      setStatusFeedback(
        error instanceof Error ? error.message : '承認に失敗しました。',
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleReject = async () => {
    if (!resolvedRoomId || !resolvedExpenseId) {
      setStatusFeedback('roomId または expenseId が指定されていません。');
      return;
    }

    setIsUpdatingStatus(true);
    setStatusFeedback(null);

    try {
      const updatedExpense = await updateExpenseReviewStatus({
        expenseId: resolvedExpenseId,
        rejectionReason,
        roomId: resolvedRoomId,
        status: 'rejected',
      });

      setExpense(updatedExpense);
      setRejectionReason(updatedExpense.rejection_reason ?? '');
      setStatusFeedback('支出を差し戻しました。');
    } catch (error) {
      setStatusFeedback(
        error instanceof Error ? error.message : '差し戻しに失敗しました。',
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">支出詳細</ThemedText>
              <ThemedText themeColor="textSecondary">
                登録された支出とレシート画像を確認します。
              </ThemedText>
            </ThemedView>

            {isLoading ? (
              <ThemedView type="backgroundElement" style={styles.alert}>
                <ThemedText type="small" themeColor="textSecondary">
                  支出情報を読み込んでいます。
                </ThemedText>
              </ThemedView>
            ) : null}

            {feedback ? (
              <ThemedView type="backgroundElement" style={styles.alert}>
                <ThemedText type="smallBold">取得状況</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {feedback}
                </ThemedText>
              </ThemedView>
            ) : null}

            {expense ? (
              <>
                <ThemedView
                  type="backgroundElement"
                  style={[styles.card, { borderColor: theme.border }]}
                >
                  <DetailRow label="種別" value={formatExpenseType(expense)} />
                  <DetailRow
                    label="金額"
                    value={formatCurrency(expense.amount)}
                  />
                  <DetailRow
                    label="支払者"
                    value={
                      expense.payer_display_name ||
                      expense.payer_email ||
                      '未設定'
                    }
                  />
                  <DetailRow label="カテゴリ" value={expense.category} />
                  <DetailRow label="内容" value={expense.description} />
                  <DetailRow label="支払日" value={expense.paid_at} />
                  <DetailRow label="割り方" value={formatSplitType(expense)} />
                  <DetailRow
                    label="ステータス"
                    value={formatExpenseStatus(expense.status)}
                  />
                  {expense.status === 'rejected' ? (
                    <DetailRow
                      label="差し戻し理由"
                      value={expense.rejection_reason}
                    />
                  ) : null}
                </ThemedView>

                {expense.current_user_role === 'admin' ? (
                  <ThemedView
                    type="backgroundElement"
                    style={[styles.card, { borderColor: theme.border }]}
                  >
                    <View style={styles.sectionHeader}>
                      <ThemedText type="smallBold">承認・差し戻し</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        admin
                      </ThemedText>
                    </View>

                    {statusFeedback ? (
                      <ThemedView
                        type="overBackground"
                        style={styles.inlineFeedback}
                      >
                        <ThemedText type="small" themeColor="textSecondary">
                          {statusFeedback}
                        </ThemedText>
                      </ThemedView>
                    ) : null}

                    <TextInput
                      multiline
                      editable={!isUpdatingStatus}
                      placeholder="レシート画像が不鮮明、金額が違う、対象者が不明など"
                      placeholderTextColor={theme.textSecondary}
                      value={rejectionReason}
                      onChangeText={setRejectionReason}
                      style={[
                        styles.textArea,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                          color: theme.text,
                        },
                      ]}
                    />

                    <View style={styles.reviewActions}>
                      <Pressable
                        disabled={isUpdatingStatus}
                        onPress={handleApprove}
                        style={({ pressed }) => [
                          styles.reviewButton,
                          {
                            backgroundColor: isUpdatingStatus
                              ? theme.backgroundSelected
                              : theme.primarySoft,
                            borderColor: isUpdatingStatus
                              ? theme.border
                              : theme.primary,
                          },
                          pressed && !isUpdatingStatus && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{
                            color: isUpdatingStatus
                              ? theme.textSecondary
                              : theme.primary,
                          }}
                        >
                          承認する
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        disabled={isUpdatingStatus}
                        onPress={handleReject}
                        style={({ pressed }) => [
                          styles.reviewButton,
                          {
                            backgroundColor: isUpdatingStatus
                              ? theme.backgroundSelected
                              : 'transparent',
                            borderColor: isUpdatingStatus
                              ? theme.border
                              : theme.danger,
                          },
                          pressed && !isUpdatingStatus && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{
                            color: isUpdatingStatus
                              ? theme.textSecondary
                              : theme.danger,
                          }}
                        >
                          差し戻す
                        </ThemedText>
                      </Pressable>
                    </View>
                  </ThemedView>
                ) : null}

                <ThemedView
                  type="backgroundElement"
                  style={[styles.card, { borderColor: theme.border }]}
                >
                  <View style={styles.sectionHeader}>
                    <ThemedText type="smallBold">対象者</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {expense.expense_type === 'common'
                        ? '全体'
                        : `${expense.targets.length}名`}
                    </ThemedText>
                  </View>

                  {expense.expense_type === 'common' ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      共通経費としてroom全体に紐づく支出です。
                    </ThemedText>
                  ) : expense.targets.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      対象者は登録されていません。
                    </ThemedText>
                  ) : (
                    <View style={styles.targetList}>
                      {expense.targets.map((target) => (
                        <View
                          key={target.id}
                          style={[
                            styles.targetRow,
                            {
                              backgroundColor: theme.background,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <View style={styles.targetMain}>
                            <ThemedText type="smallBold">
                              {target.display_name ||
                                target.email ||
                                '対象者未設定'}
                            </ThemedText>
                            {target.email ? (
                              <ThemedText
                                type="small"
                                themeColor="textSecondary"
                              >
                                {target.email}
                              </ThemedText>
                            ) : null}
                          </View>
                          <ThemedText type="smallBold">
                            {target.amount_share
                              ? formatCurrency(target.amount_share)
                              : '均等'}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </ThemedView>

                <ThemedView
                  type="backgroundElement"
                  style={[styles.card, { borderColor: theme.border }]}
                >
                  <View style={styles.sectionHeader}>
                    <ThemedText type="smallBold">レシート</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {expense.receipt_image_url ? '画像あり' : '画像なし'}
                    </ThemedText>
                  </View>
                  {expense.receipt_image_url ? (
                    <Image
                      source={{ uri: expense.receipt_image_url }}
                      style={styles.receiptImage}
                    />
                  ) : (
                    <View style={styles.noReceipt}>
                      <DetailRow
                        label="理由"
                        value={expense.no_receipt_reason}
                      />
                      <DetailRow
                        label="補足メモ"
                        value={expense.no_receipt_note}
                      />
                    </View>
                  )}
                </ThemedView>
              </>
            ) : null}

            <View style={styles.actions}>
              {resolvedRoomId ? (
                <Link href={`/rooms/${resolvedRoomId}` as any} asChild>
                  <Pressable
                    style={({ pressed }) => [
                      styles.ghostButton,
                      { borderColor: theme.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.primary }}
                    >
                      支出一覧へ
                    </ThemedText>
                  </Pressable>
                </Link>
              ) : null}

              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.ghostButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: theme.textSecondary }}
                >
                  戻る
                </ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    </ThemedView>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: number | string | null;
}) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.detailValue}>
        {value || '-'}
      </ThemedText>
    </View>
  );
}

function formatExpenseType(expense: ExpenseDetailRecord) {
  return expense.expense_type === 'common' ? '共通経費' : '個人間立替';
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('ja-JP')}円`;
}

function formatExpenseStatus(status: ExpenseDetailRecord['status']) {
  const labels: Record<ExpenseDetailRecord['status'], string> = {
    approved: '承認済み',
    pending: '未確認',
    rejected: '差し戻し',
    settled: '精算済み',
  };

  return labels[status] ?? status;
}

function formatSplitType(expense: ExpenseDetailRecord) {
  if (expense.expense_type === 'common') {
    return '-';
  }

  if (expense.split_type === 'custom') {
    return '金額指定';
  }

  return '均等';
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
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
  card: {
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
  inlineFeedback: {
    borderRadius: Radius.control,
    padding: Spacing.two,
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
  reviewActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  reviewButton: {
    minHeight: 48,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  detailValue: {
    flex: 1,
    textAlign: 'right',
  },
  receiptImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.control,
  },
  noReceipt: {
    gap: Spacing.one,
  },
  targetList: {
    gap: Spacing.two,
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.two,
  },
  targetMain: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
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
