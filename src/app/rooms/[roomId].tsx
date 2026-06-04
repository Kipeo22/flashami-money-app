import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchRoomExpenses,
  summarizeExpenses,
  type ExpenseListItem,
  type ExpenseStatus,
  type ExpenseType,
} from '@/lib/expenses';
import { fetchRoomById, type RoomRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

type ExpenseTypeFilter = 'all' | ExpenseType;
type ExpenseStatusFilter = 'all' | ExpenseStatus;

const expenseTypeFilters: { label: string; value: ExpenseTypeFilter }[] = [
  { label: 'すべて', value: 'all' },
  { label: '共通経費', value: 'common' },
  { label: '個人間立替', value: 'personal' },
];

const statusFilters: { label: string; value: ExpenseStatusFilter }[] = [
  { label: 'すべて', value: 'all' },
  { label: '未確認', value: 'pending' },
  { label: '承認済み', value: 'approved' },
  { label: '差し戻し', value: 'rejected' },
  { label: '精算済み', value: 'settled' },
];

export default function RoomExpenseListScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const resolvedRoomId = Array.isArray(roomId) ? undefined : roomId;
  const router = useRouter();
  const theme = useTheme();
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [expenseTypeFilter, setExpenseTypeFilter] =
    useState<ExpenseTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatusFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRoomExpenses() {
      if (!resolvedRoomId) {
        setError('roomId が指定されていません。');
        setIsLoading(false);
        return;
      }

      if (!isSupabaseConfigured) {
        setError('支出一覧を表示できませんでした。');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [roomData, expenseData] = await Promise.all([
          fetchRoomById(resolvedRoomId),
          fetchRoomExpenses(resolvedRoomId),
        ]);

        if (!active) {
          return;
        }

        setRoom(roomData);
        setExpenses(expenseData);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : '支出一覧の取得に失敗しました。';

        if (message.includes('ログインが必要')) {
          router.replace('/login');
          return;
        }

        setError(message);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadRoomExpenses();

    return () => {
      active = false;
    };
  }, [resolvedRoomId, router]);

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        const matchesExpenseType =
          expenseTypeFilter === 'all' ||
          expense.expense_type === expenseTypeFilter;
        const matchesStatus =
          statusFilter === 'all' || expense.status === statusFilter;

        return matchesExpenseType && matchesStatus;
      }),
    [expenseTypeFilter, expenses, statusFilter],
  );
  const summary = useMemo(() => summarizeExpenses(expenses), [expenses]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">
                {room?.name ?? '支出一覧'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {room?.description || 'room内の支出を一覧で確認します。'}
              </ThemedText>
            </ThemedView>

            <View style={styles.actions}>
              <Link href="/rooms" asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    room一覧へ
                  </ThemedText>
                </Pressable>
              </Link>

              {resolvedRoomId ? (
                <>
                  <Link
                    href={`/rooms/${resolvedRoomId}/members` as any}
                    asChild
                  >
                    <Pressable
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
                        参加者を見る
                      </ThemedText>
                    </Pressable>
                  </Link>
                  <Link
                    href={`/rooms/${resolvedRoomId}/expenses/new` as any}
                    asChild
                  >
                    <Pressable
                      style={({ pressed }) => [
                        styles.primaryButton,
                        {
                          backgroundColor: theme.primarySoft,
                          borderColor: theme.primary,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ color: theme.primary }}
                      >
                        支出を登録する
                      </ThemedText>
                    </Pressable>
                  </Link>
                </>
              ) : null}
            </View>

            {isLoading ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">読み込み中</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  room内の支出を取得しています。
                </ThemedText>
              </ThemedView>
            ) : null}

            {error ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">取得に失敗しました</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {error}
                </ThemedText>
              </ThemedView>
            ) : null}

            {!isLoading && !error ? (
              <>
                <View style={styles.summaryGrid}>
                  <SummaryTile label="支出合計" value={summary.total} />
                  <SummaryTile label="共通経費" value={summary.common} />
                  <SummaryTile label="個人間立替" value={summary.personal} />
                </View>

                <ThemedView
                  type="backgroundElement"
                  style={[styles.card, { borderColor: theme.border }]}
                >
                  <View style={styles.sectionHeader}>
                    <ThemedText type="smallBold">絞り込み</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {filteredExpenses.length} / {expenses.length}件
                    </ThemedText>
                  </View>

                  <FilterGroup label="支出タイプ">
                    {expenseTypeFilters.map((filter) => (
                      <FilterButton
                        key={filter.value}
                        isSelected={expenseTypeFilter === filter.value}
                        label={filter.label}
                        onPress={() => setExpenseTypeFilter(filter.value)}
                      />
                    ))}
                  </FilterGroup>

                  <FilterGroup label="ステータス">
                    {statusFilters.map((filter) => (
                      <FilterButton
                        key={filter.value}
                        isSelected={statusFilter === filter.value}
                        label={filter.label}
                        onPress={() => setStatusFilter(filter.value)}
                      />
                    ))}
                  </FilterGroup>
                </ThemedView>

                {filteredExpenses.length === 0 ? (
                  <ThemedView
                    type="backgroundElement"
                    style={[styles.emptyCard, { borderColor: theme.border }]}
                  >
                    <ThemedText type="default" style={styles.emptyTitle}>
                      表示できる支出がありません
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.emptyDescription}
                    >
                      条件を変更するか、新しく支出を登録してください。
                    </ThemedText>
                  </ThemedView>
                ) : (
                  <View style={styles.expenseList}>
                    {filteredExpenses.map((expense) => (
                      <Pressable
                        key={expense.id}
                        onPress={() =>
                          router.push(
                            `/rooms/${expense.room_id}/expenses/${expense.id}` as any,
                          )
                        }
                        style={({ pressed }) => [
                          styles.expenseCard,
                          {
                            backgroundColor: theme.backgroundElement,
                            borderColor: theme.border,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.expenseHeader}>
                          <View style={styles.expenseTitleGroup}>
                            <ThemedText
                              type="smallBold"
                              style={styles.expenseTitle}
                            >
                              {expense.description}
                            </ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {expense.paid_at}・{expense.category}
                            </ThemedText>
                          </View>
                          <ThemedText type="default" style={styles.amountText}>
                            {formatCurrency(expense.amount)}
                          </ThemedText>
                        </View>

                        <View style={styles.badgeRow}>
                          <Badge
                            label={formatExpenseType(expense.expense_type)}
                            tone={
                              expense.expense_type === 'common'
                                ? 'primary'
                                : 'neutral'
                            }
                          />
                          <Badge
                            label={formatExpenseStatus(expense.status)}
                            tone={getStatusBadgeTone(expense.status)}
                          />
                          {expense.receipt_image_url ? (
                            <Badge label="レシートあり" tone="primary" />
                          ) : (
                            <Badge label="レシートなし" tone="neutral" />
                          )}
                        </View>

                        <View style={styles.metaRow}>
                          <Meta
                            label="支払者"
                            value={
                              expense.payer_display_name ||
                              expense.payer_email ||
                              '未設定'
                            }
                          />
                          <Meta label="対象者" value={formatTargets(expense)} />
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.summaryTile, { borderColor: theme.border }]}
    >
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="default" style={styles.summaryValue}>
        {formatCurrency(value)}
      </ThemedText>
    </ThemedView>
  );
}

function FilterGroup({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <View style={styles.filterGroup}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.filterRow}>{children}</View>
    </View>
  );
}

function FilterButton({
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
        styles.filterButton,
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: 'danger' | 'neutral' | 'primary';
}) {
  const theme = useTheme();
  const backgroundColor =
    tone === 'primary'
      ? theme.primarySoft
      : tone === 'danger'
        ? theme.backgroundSelected
        : theme.backgroundSelected;
  const color =
    tone === 'primary'
      ? theme.primary
      : tone === 'danger'
        ? theme.danger
        : theme.textSecondary;

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <ThemedText type="smallBold" style={[styles.badgeText, { color }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function formatCurrency(value: number) {
  return `${value.toLocaleString('ja-JP')}円`;
}

function formatExpenseType(expenseType: ExpenseType) {
  return expenseType === 'common' ? '共通経費' : '個人間立替';
}

function formatExpenseStatus(status: ExpenseStatus) {
  const labels: Record<ExpenseStatus, string> = {
    approved: '承認済み',
    pending: '未確認',
    rejected: '差し戻し',
    settled: '精算済み',
  };

  return labels[status] ?? status;
}

function getStatusBadgeTone(status: ExpenseStatus) {
  if (status === 'approved') {
    return 'primary';
  }

  if (status === 'rejected') {
    return 'danger';
  }

  return 'neutral';
}

function formatTargets(expense: ExpenseListItem) {
  if (expense.expense_type === 'common') {
    return '全体';
  }

  if (expense.target_labels.length === 0) {
    return '未設定';
  }

  if (expense.target_labels.length <= 2) {
    return expense.target_labels.join('、');
  }

  return `${expense.target_labels.slice(0, 2).join('、')}ほか${
    expense.target_labels.length - 2
  }名`;
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
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryTile: {
    minWidth: 160,
    flex: 1,
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  summaryValue: {
    fontWeight: 'bold',
  },
  filterGroup: {
    gap: Spacing.one,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filterButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  expenseList: {
    gap: Spacing.two,
  },
  expenseCard: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  expenseTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  expenseTitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  amountText: {
    fontWeight: 'bold',
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metaItem: {
    minWidth: 160,
    flex: 1,
    gap: Spacing.one,
  },
  emptyCard: {
    padding: Spacing.five,
    borderRadius: Radius.panel,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  emptyTitle: {
    fontWeight: 'bold',
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
