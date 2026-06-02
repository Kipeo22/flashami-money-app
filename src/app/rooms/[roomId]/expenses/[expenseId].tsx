import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchExpenseById, type ExpenseRecord } from '@/lib/expenses';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ExpenseDetailScreen() {
  const { expenseId, roomId } = useLocalSearchParams<{
    expenseId?: string;
    roomId?: string;
  }>();
  const router = useRouter();
  const resolvedRoomId = Array.isArray(roomId) ? undefined : roomId;
  const resolvedExpenseId = Array.isArray(expenseId) ? undefined : expenseId;
  const [expense, setExpense] = useState<ExpenseRecord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadExpense() {
      if (!resolvedRoomId || !resolvedExpenseId || !isSupabaseConfigured) {
        setIsLoading(false);
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
          setFeedback(null);
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
  }, [resolvedExpenseId, resolvedRoomId]);

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

            {!isSupabaseConfigured ? (
              <ThemedView type="backgroundElement" style={styles.alert}>
                <ThemedText type="smallBold">Supabase が未設定です</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  `EXPO_PUBLIC_SUPABASE_URL` と
                  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を設定してください。
                </ThemedText>
              </ThemedView>
            ) : null}

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
                <ThemedView type="backgroundElement" style={styles.card}>
                  <DetailRow label="種別" value={formatExpenseType(expense)} />
                  <DetailRow label="金額" value={`${expense.amount}円`} />
                  <DetailRow label="カテゴリ" value={expense.category} />
                  <DetailRow label="内容" value={expense.description} />
                  <DetailRow label="支払日" value={expense.paid_at} />
                  <DetailRow label="ステータス" value={expense.status} />
                </ThemedView>

                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">レシート画像</ThemedText>
                  {expense.receipt_image_url ? (
                    <Image
                      source={{ uri: expense.receipt_image_url }}
                      style={styles.receiptImage}
                    />
                  ) : (
                    <View style={styles.noReceipt}>
                      <ThemedText type="small" themeColor="textSecondary">
                        {expense.no_receipt_reason}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {expense.no_receipt_note}
                      </ThemedText>
                    </View>
                  )}
                </ThemedView>
              </>
            ) : null}

            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.ghostButton,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold">戻る</ThemedText>
            </Pressable>
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value || '-'}</ThemedText>
    </View>
  );
}

function formatExpenseType(expense: ExpenseRecord) {
  return expense.expense_type === 'common' ? '共通経費' : '個人間立替';
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
  card: {
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  detailRow: {
    gap: Spacing.one,
  },
  receiptImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Spacing.two,
  },
  noReceipt: {
    gap: Spacing.one,
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
  pressed: {
    opacity: 0.72,
  },
});
