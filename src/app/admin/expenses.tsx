import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AdminBackLink,
  AdminExpenseCard,
  AdminInfoCard,
  formatCurrency,
  formatExpenseStatus,
} from '@/components/admin-dashboard';
import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  fetchAdminRoomDashboards,
  flattenAdminExpenses,
  type AdminRoomDashboard,
} from '@/lib/admin';
import { summarizeExpenses, type ExpenseStatus } from '@/lib/expenses';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

const expenseStatuses: ExpenseStatus[] = [
  'pending',
  'approved',
  'rejected',
  'settled',
];

export default function AdminExpensesScreen() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const router = useRouter();
  const resolvedStatus = Array.isArray(status) ? undefined : status;
  const statusFilter = expenseStatuses.includes(resolvedStatus as ExpenseStatus)
    ? (resolvedStatus as ExpenseStatus)
    : undefined;
  const [adminRooms, setAdminRooms] = useState<AdminRoomDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAdminRooms() {
      await Promise.resolve();

      if (!active) {
        return;
      }

      if (!isSupabaseConfigured) {
        setError('支出詳細を表示できませんでした。');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const dashboards = await fetchAdminRoomDashboards();
        if (active) {
          setAdminRooms(dashboards);
        }
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : '支出詳細の取得に失敗しました。';

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

    loadAdminRooms();

    return () => {
      active = false;
    };
  }, [router]);

  const expenses = useMemo(
    () => flattenAdminExpenses(adminRooms, statusFilter),
    [adminRooms, statusFilter],
  );
  const expenseSummary = useMemo(
    () => summarizeExpenses(expenses.map((item) => item.expense)),
    [expenses],
  );
  const title = statusFilter
    ? `${formatExpenseStatus(statusFilter)}支出`
    : '支出合計';

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <AdminBackLink onPress={() => router.replace('/admin')} />

            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">{title}</ThemedText>
              <ThemedText themeColor="textSecondary">
                管理Roomに登録された支出の内訳と詳細を確認します。
              </ThemedText>
            </ThemedView>

            {isLoading ? (
              <AdminInfoCard title="読み込み中">
                支出詳細を取得しています。
              </AdminInfoCard>
            ) : null}

            {error ? (
              <AdminInfoCard title="取得に失敗しました">{error}</AdminInfoCard>
            ) : null}

            {!isLoading && !error ? (
              <>
                <View style={styles.summaryGrid}>
                  <SummaryTile label="件数" value={`${expenses.length}件`} />
                  <SummaryTile
                    label="支出合計"
                    value={formatCurrency(expenseSummary.total)}
                  />
                  <SummaryTile
                    label="共通経費"
                    value={formatCurrency(expenseSummary.common)}
                  />
                  <SummaryTile
                    label="個人間立替"
                    value={formatCurrency(expenseSummary.personal)}
                  />
                </View>

                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">支出一覧</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {expenses.length}件
                  </ThemedText>
                </View>

                {expenses.length === 0 ? (
                  <AdminInfoCard title="表示できる支出がありません">
                    条件に一致する支出はまだ登録されていません。
                  </AdminInfoCard>
                ) : (
                  <View style={styles.list}>
                    {expenses.map((item) => (
                      <AdminExpenseCard
                        item={item}
                        key={`${item.room.id}-${item.expense.id}`}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </ThemedView>
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    </ThemedView>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
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
        {value}
      </ThemedText>
    </ThemedView>
  );
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  summaryTile: {
    minWidth: 144,
    flex: 1,
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  summaryValue: {
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.three,
  },
});
