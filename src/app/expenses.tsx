import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { Badge, SurfaceCard } from '@/components/ios-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchRoomExpenses,
  type ExpenseListItem,
  type ExpenseStatus,
} from '@/lib/expenses';
import {
  fetchCurrentUserRooms,
  requireAuthenticatedUser,
  type UserRoomRecord,
} from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

type HistoryItem = {
  expense: ExpenseListItem;
  room: UserRoomRecord;
};

export default function ExpensesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedRoomCount, setFailedRoomCount] = useState(0);
  const requestId = useRef(0);

  const loadHistory = useCallback(
    async (isRefresh = false) => {
      const currentRequestId = ++requestId.current;
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setFailedRoomCount(0);

      try {
        const [rooms, user] = await Promise.all([
          fetchCurrentUserRooms(),
          requireAuthenticatedUser(),
        ]);
        const roomResults = await Promise.allSettled(
          rooms.map(async (room) => ({
            expenses: await fetchRoomExpenses(room.id),
            room,
          })),
        );
        if (currentRequestId !== requestId.current) return;

        const roomExpenses = roomResults.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        );
        const failedCount = roomResults.length - roomExpenses.length;
        const nextItems = roomExpenses
          .flatMap(({ expenses, room }) =>
            expenses
              .filter((expense) => expense.payer_id === user.id)
              .map((expense) => ({ expense, room })),
          )
          .sort((first, second) =>
            second.expense.created_at.localeCompare(first.expense.created_at),
          );

        setItems(nextItems);
        setFailedRoomCount(failedCount);
        if (failedCount > 0 && roomExpenses.length === 0) {
          setError('支出履歴を取得できませんでした。');
        }
      } catch (caught) {
        if (currentRequestId !== requestId.current) return;
        const message =
          caught instanceof Error
            ? caught.message
            : '支出履歴を取得できませんでした。';
        if (message.includes('ログインが必要')) {
          router.replace('/login');
          return;
        }
        setError(message);
      } finally {
        if (currentRequestId === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    const loadTimer = setTimeout(() => loadHistory(), 0);
    return () => {
      clearTimeout(loadTimer);
      requestId.current += 1;
    };
  }, [loadHistory]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.expense.amount, 0),
    [items],
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              onRefresh={() => loadHistory(true)}
              refreshing={refreshing}
              tintColor={theme.primary}
            />
          }
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <ThemedText type="title">自分の支出</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                自分が登録した支出と確認状況
              </ThemedText>
            </View>

            <SurfaceCard style={styles.summaryCard}>
              <View>
                <ThemedText type="small" themeColor="textSecondary">
                  登録件数
                </ThemedText>
                <ThemedText type="subtitle">{items.length}件</ThemedText>
              </View>
              <View style={styles.summaryAmount}>
                <ThemedText type="small" themeColor="textSecondary">
                  登録総額
                </ThemedText>
                <ThemedText type="subtitle" style={{ color: theme.primary }}>
                  {formatCurrency(total)}
                </ThemedText>
              </View>
            </SurfaceCard>

            {loading ? <InfoCard>支出履歴を読み込んでいます。</InfoCard> : null}
            {error ? (
              <InfoCard danger onRetry={() => loadHistory()}>
                {error}
              </InfoCard>
            ) : null}
            {!error && failedRoomCount > 0 ? (
              <InfoCard onRetry={() => loadHistory()}>
                {`${failedRoomCount}件のイベントは取得できませんでした。取得できた履歴のみ表示しています。`}
              </InfoCard>
            ) : null}
            {!loading && !error && items.length === 0 ? (
              <InfoCard>登録した支出はまだありません。</InfoCard>
            ) : null}

            {!loading && !error && items.length > 0 ? (
              <SurfaceCard style={styles.list}>
                {items.map((item, index) => (
                  <View key={item.expense.id}>
                    {index > 0 ? (
                      <View
                        style={[
                          styles.separator,
                          { backgroundColor: theme.border },
                        ]}
                      />
                    ) : null}
                    <HistoryRow item={item} />
                  </View>
                ))}
              </SurfaceCard>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </ThemedView>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={`${item.expense.description}、${formatCurrency(item.expense.amount)}`}
      accessibilityRole="button"
      onPress={() =>
        router.push(
          `/rooms/${item.room.id}/expenses/${item.expense.id}` as never,
        )
      }
      style={styles.row}
    >
      <View style={styles.rowMain}>
        <View style={styles.rowTitle}>
          <ThemedText numberOfLines={1} style={styles.description}>
            {item.expense.description}
          </ThemedText>
          <Badge
            label={statusLabel(item.expense.status)}
            tone={statusTone(item.expense.status)}
          />
        </View>
        <ThemedText numberOfLines={1} type="small" themeColor="textSecondary">
          {item.room.name}・{formatDate(item.expense.paid_at)}
        </ThemedText>
      </View>
      <View style={styles.rowAmount}>
        <ThemedText type="smallBold">
          {formatCurrency(item.expense.amount)}
        </ThemedText>
        <SymbolView
          name={{
            ios: 'chevron.right',
            android: 'chevron_right',
            web: 'chevron_right',
          }}
          size={14}
          tintColor={theme.textDisabled}
          fallback={<Text style={{ color: theme.textDisabled }}>›</Text>}
        />
      </View>
    </Pressable>
  );
}

function InfoCard({
  children,
  danger = false,
  onRetry,
}: {
  children: string;
  danger?: boolean;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  return (
    <SurfaceCard>
      <ThemedText type="small" themeColor={danger ? 'danger' : 'textSecondary'}>
        {children}
      </ThemedText>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={[styles.retryButton, { borderColor: theme.primary }]}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            再読み込み
          </ThemedText>
        </Pressable>
      ) : null}
    </SurfaceCard>
  );
}

function statusLabel(status: ExpenseStatus) {
  return {
    approved: '承認済み',
    pending: '承認待ち',
    rejected: '差し戻し',
    settled: '精算済み',
  }[status];
}

function statusTone(status: ExpenseStatus) {
  return status === 'approved' || status === 'settled'
    ? ('success' as const)
    : status === 'rejected'
      ? ('danger' as const)
      : ('neutral' as const);
}

function formatCurrency(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function formatDate(value: string) {
  const [, month, day] = value.split('-').map(Number);
  return month && day ? `${month}月${day}日` : value;
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: MaxContentWidth, gap: 22 },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  description: { flex: 1, fontWeight: '700' },
  header: { gap: 4 },
  list: { padding: 0, overflow: 'hidden' },
  row: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowAmount: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowMain: { flex: 1, minWidth: 0, gap: 5 },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  retryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 22,
    marginTop: 12,
    paddingHorizontal: 18,
  },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  summaryAmount: { alignItems: 'flex-end' },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.card,
  },
});
