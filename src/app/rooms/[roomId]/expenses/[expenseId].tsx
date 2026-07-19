import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppHeader,
  Badge,
  PrimaryButton,
  RoundIcon,
  SecondaryButton,
  SurfaceCard,
} from '@/components/ios-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchExpenseById,
  updateExpenseReviewStatus,
  type ExpenseDetailRecord,
} from '@/lib/expenses';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ExpenseDetailScreen() {
  const params = useLocalSearchParams<{
    expenseId?: string;
    roomId?: string;
  }>();
  const expenseId = Array.isArray(params.expenseId)
    ? undefined
    : params.expenseId;
  const roomId = Array.isArray(params.roomId) ? undefined : params.roomId;
  const router = useRouter();
  const theme = useTheme();
  const [expense, setExpense] = useState<ExpenseDetailRecord | null>(null);
  const [loading, setLoading] = useState(
    Boolean(roomId && expenseId && isSupabaseConfigured),
  );
  const [updating, setUpdating] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [feedback, setFeedback] = useState<string | null>(
    roomId && expenseId ? null : '支出が指定されていません。',
  );

  useEffect(() => {
    let active = true;
    if (!roomId || !expenseId) {
      return;
    }
    if (!isSupabaseConfigured) {
      router.replace('/login');
      return;
    }
    fetchExpenseById(roomId, expenseId)
      .then((data) => {
        if (!active) return;
        setExpense(data);
        setRejectionReason(data.rejection_reason ?? '');
      })
      .catch(
        (error) =>
          active &&
          setFeedback(
            error instanceof Error
              ? error.message
              : '支出を取得できませんでした。',
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [expenseId, roomId, router]);

  const updateStatus = async (status: 'approved' | 'rejected') => {
    if (!roomId || !expenseId) return;
    setUpdating(true);
    setFeedback(null);
    try {
      const updated = await updateExpenseReviewStatus({
        expenseId,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
        roomId,
        status,
      });
      setExpense(updated);
      setRejectionOpen(false);
      setFeedback(
        updated.discord_notification_warning
          ? updated.discord_notification_warning
          : status === 'approved'
            ? '支出を承認しました。'
            : '支出を差し戻しました。',
      );
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'ステータスを更新できませんでした。',
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerWrap}>
          <AppHeader title="支出詳細" />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.container}>
            {loading ? (
              <SurfaceCard>
                <ThemedText type="small" themeColor="textSecondary">
                  支出を読み込んでいます。
                </ThemedText>
              </SurfaceCard>
            ) : null}
            {expense ? (
              <>
                <View style={styles.hero}>
                  <Badge
                    label={formatStatus(expense.status)}
                    tone={statusTone(expense.status)}
                  />
                  <ThemedText type="title" style={styles.amount}>
                    {formatCurrency(expense.amount)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {expense.paid_at.replaceAll('-', '.')}
                  </ThemedText>
                </View>

                <SurfaceCard
                  style={[
                    styles.infoCard,
                    { backgroundColor: theme.overBackground },
                  ]}
                >
                  <View style={styles.typeRow}>
                    <RoundIcon
                      symbol={{
                        ios:
                          expense.expense_type === 'common'
                            ? 'person.2.fill'
                            : 'person.badge.plus',
                        android:
                          expense.expense_type === 'common'
                            ? 'groups'
                            : 'person_add',
                        web:
                          expense.expense_type === 'common'
                            ? 'groups'
                            : 'person_add',
                      }}
                    />
                    <View style={styles.typeText}>
                      <ThemedText type="default" style={styles.bold}>
                        {expense.expense_type === 'common'
                          ? '共通経費'
                          : '個人間立替'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {expense.category}
                      </ThemedText>
                    </View>
                  </View>
                  <View
                    style={[styles.divider, { backgroundColor: theme.border }]}
                  />
                  <DetailRow
                    label="支払者"
                    value={
                      expense.payer_display_name ||
                      expense.payer_email ||
                      '未設定'
                    }
                  />
                  <DetailRow label="内容" value={expense.description} />
                  {expense.targets.length > 0 ? (
                    <DetailRow
                      label="対象者"
                      value={expense.targets
                        .map((target) => target.display_name || target.email)
                        .filter(Boolean)
                        .join('、')}
                    />
                  ) : null}
                </SurfaceCard>

                <View style={styles.section}>
                  <ThemedText type="small" themeColor="textSecondary">
                    レシート・領収書
                  </ThemedText>
                  {expense.receipt_image_url ? (
                    <Image
                      source={{ uri: expense.receipt_image_url }}
                      style={styles.receipt}
                      resizeMode="cover"
                    />
                  ) : (
                    <SurfaceCard style={styles.noReceipt}>
                      <SymbolView
                        name={{
                          ios: 'doc.text',
                          android: 'receipt_long',
                          web: 'receipt_long',
                        }}
                        size={26}
                        tintColor={theme.textSecondary}
                        fallback={
                          <Text style={{ color: theme.textSecondary }}>▤</Text>
                        }
                      />
                      <View style={styles.noReceiptText}>
                        <ThemedText type="smallBold">レシートなし</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {expense.no_receipt_reason || '-'} /{' '}
                          {expense.no_receipt_note || '-'}
                        </ThemedText>
                      </View>
                    </SurfaceCard>
                  )}
                </View>

                <SurfaceCard
                  style={[
                    styles.integrationCard,
                    { backgroundColor: theme.overBackground },
                  ]}
                >
                  <ThemedText type="small" themeColor="textSecondary">
                    連携ステータス
                  </ThemedText>
                  <IntegrationRow
                    label="Discord"
                    status="送信済み"
                    symbol={{
                      ios: 'message.fill',
                      android: 'chat',
                      web: 'chat',
                    }}
                  />
                  <IntegrationRow
                    label="Google Sheets"
                    status="反映済み"
                    symbol={{
                      ios: 'tablecells.fill',
                      android: 'table_chart',
                      web: 'table_chart',
                    }}
                  />
                </SurfaceCard>

                {rejectionOpen ? (
                  <SurfaceCard style={styles.rejectCard}>
                    <ThemedText type="smallBold">差し戻し理由</ThemedText>
                    <TextInput
                      autoFocus
                      multiline
                      onChangeText={setRejectionReason}
                      placeholder="修正してほしい内容を入力してください"
                      placeholderTextColor={theme.textDisabled}
                      style={[
                        styles.rejectInput,
                        {
                          backgroundColor: theme.overBackground,
                          color: theme.text,
                        },
                      ]}
                      textAlignVertical="top"
                      value={rejectionReason}
                    />
                  </SurfaceCard>
                ) : null}

                {feedback ? (
                  <ThemedText
                    type="small"
                    themeColor={
                      feedback.includes('しました') ? 'textSecondary' : 'danger'
                    }
                    style={styles.feedback}
                  >
                    {feedback}
                  </ThemedText>
                ) : null}

                {expense.status === 'rejected' &&
                expense.is_current_user_payer ? (
                  <PrimaryButton
                    onPress={() =>
                      router.push(
                        `/rooms/${roomId}/expenses/new?expenseId=${expenseId}` as never,
                      )
                    }
                  >
                    修正して再申請
                  </PrimaryButton>
                ) : null}

                {expense.current_user_role === 'admin' ? (
                  <View style={styles.actions}>
                    <PrimaryButton
                      disabled={updating}
                      onPress={() => updateStatus('approved')}
                    >
                      {updating ? '更新中…' : '承認する'}
                    </PrimaryButton>
                    <SecondaryButton
                      danger
                      onPress={() =>
                        rejectionOpen
                          ? updateStatus('rejected')
                          : setRejectionOpen(true)
                      }
                    >
                      {rejectionOpen ? 'この理由で差し戻す' : '差し戻す'}
                    </SecondaryButton>
                  </View>
                ) : null}
              </>
            ) : null}
            {!expense && feedback ? (
              <SurfaceCard>
                <ThemedText type="small" themeColor="danger">
                  {feedback}
                </ThemedText>
              </SurfaceCard>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default" style={styles.detailValue}>
        {value}
      </ThemedText>
    </View>
  );
}
function IntegrationRow({
  label,
  status,
  symbol,
}: {
  label: string;
  status: string;
  symbol: React.ComponentProps<typeof SymbolView>['name'];
}) {
  const theme = useTheme();
  return (
    <View style={styles.integrationRow}>
      <View
        style={[styles.integrationIcon, { backgroundColor: theme.primarySoft }]}
      >
        <SymbolView
          name={symbol}
          size={18}
          tintColor={theme.primary}
          fallback={<Text style={{ color: theme.primary }}>•</Text>}
        />
      </View>
      <ThemedText type="default" style={styles.integrationLabel}>
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.success}>
        ◎ {status}
      </ThemedText>
    </View>
  );
}
function formatCurrency(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`;
}
function formatStatus(status: ExpenseDetailRecord['status']) {
  return {
    approved: '● 承認済み',
    pending: '● 承認待ち',
    rejected: '● 差し戻し',
    settled: '● 精算済み',
  }[status];
}
function statusTone(
  status: ExpenseDetailRecord['status'],
): 'danger' | 'neutral' | 'success' {
  return status === 'rejected'
    ? 'danger'
    : status === 'pending'
      ? 'neutral'
      : 'success';
}

const styles = StyleSheet.create({
  actions: { gap: 12, marginTop: 6 },
  amount: { fontSize: 36, lineHeight: 44 },
  bold: { fontWeight: '700' },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: 24 },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 34,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
  },
  detailValue: { flex: 1, fontWeight: '600', textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  feedback: { textAlign: 'center' },
  headerWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 18,
  },
  hero: { alignItems: 'center', gap: 6, paddingVertical: 8 },
  infoCard: { gap: 14 },
  integrationCard: { gap: 12 },
  integrationIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
  },
  integrationLabel: { flex: 1, fontWeight: '600' },
  integrationRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noReceipt: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  noReceiptText: { flex: 1 },
  receipt: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.control },
  rejectCard: { gap: 10 },
  rejectInput: {
    minHeight: 90,
    borderRadius: Radius.control,
    padding: 12,
    fontFamily: Fonts.sans,
    fontSize: 16,
  },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  section: { gap: 8 },
  success: { color: '#22b657' },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  typeText: { flex: 1 },
});
