import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppHeader,
  Badge,
  IconButton,
  PrimaryButton,
  RoundIcon,
  SurfaceCard,
} from '@/components/ios-ui';
import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchRoomExpenses,
  summarizeExpenses,
  type ExpenseListItem,
  type ExpenseStatus,
  type ExpenseType,
} from '@/lib/expenses';
import {
  ensureCurrentUserRoomMembership,
  fetchRoomById,
  isExpenseRegistrationOpen,
  type RoomMemberRecord,
  type RoomRecord,
} from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

type Filter = 'all' | ExpenseType | 'pending';
const filters: { label: string; value: Filter }[] = [
  { label: 'すべて', value: 'all' },
  { label: '共通', value: 'common' },
  { label: '個人', value: 'personal' },
  { label: '未確認', value: 'pending' },
];

export default function RoomDetailScreen() {
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = Array.isArray(params.roomId) ? undefined : params.roomId;
  const router = useRouter();
  const theme = useTheme();
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [membership, setMembership] = useState<RoomMemberRecord | null>(null);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(
    Boolean(roomId && isSupabaseConfigured),
  );
  const [error, setError] = useState<string | null>(
    roomId ? null : 'イベントが指定されていません。',
  );

  useEffect(() => {
    let active = true;
    if (!roomId) {
      return;
    }
    if (!isSupabaseConfigured) {
      router.replace('/login');
      return;
    }
    Promise.all([
      fetchRoomById(roomId),
      ensureCurrentUserRoomMembership(roomId),
      fetchRoomExpenses(roomId),
    ])
      .then(([roomData, membershipData, expenseData]) => {
        if (!active) return;
        setRoom(roomData);
        setMembership(membershipData);
        setExpenses(expenseData);
      })
      .catch((caught) => {
        if (!active) return;
        const message =
          caught instanceof Error
            ? caught.message
            : 'イベントを取得できませんでした。';
        if (message.includes('ログインが必要')) router.replace('/login');
        else setError(message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [roomId, router]);

  const summary = useMemo(() => summarizeExpenses(expenses), [expenses]);
  const visibleExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          filter === 'all' ||
          expense.expense_type === filter ||
          expense.status === filter,
      ),
    [expenses, filter],
  );
  const pendingCount = expenses.filter(
    (expense) => expense.status === 'pending',
  ).length;
  const registrationOpen = room ? isExpenseRegistrationOpen(room) : false;

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.headerWrap}>
          <AppHeader
            action={
              roomId ? (
                <IconButton
                  accessibilityLabel={
                    membership?.role === 'admin' ? 'イベント管理' : '設定'
                  }
                  onPress={() =>
                    router.push(
                      membership?.role === 'admin'
                        ? (`/rooms/${roomId}/members` as never)
                        : '/account',
                    )
                  }
                  symbol={{
                    ios: 'gearshape',
                    android: 'settings',
                    web: 'settings',
                  }}
                />
              ) : undefined
            }
            onBack={() => router.replace('/rooms')}
            title={room?.name ?? 'イベント詳細'}
          />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            {loading ? (
              <SurfaceCard>
                <ThemedText type="small" themeColor="textSecondary">
                  支出を読み込んでいます。
                </ThemedText>
              </SurfaceCard>
            ) : null}
            {error ? (
              <SurfaceCard>
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              </SurfaceCard>
            ) : null}

            {!loading && !error ? (
              <>
                <View style={styles.totalSection}>
                  <ThemedText type="small" themeColor="textSecondary">
                    合計支出
                  </ThemedText>
                  <ThemedText type="title" style={styles.totalAmount}>
                    {formatCurrency(summary.total)}
                  </ThemedText>
                  <View style={styles.summaryRow}>
                    <View
                      style={[
                        styles.summaryTile,
                        { backgroundColor: theme.overBackground },
                      ]}
                    >
                      <ThemedText type="small" themeColor="textSecondary">
                        共通経費
                      </ThemedText>
                      <ThemedText
                        type="subtitle"
                        style={{ color: theme.primary }}
                      >
                        {formatCurrency(summary.common)}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.summaryTile,
                        { backgroundColor: theme.overBackground },
                      ]}
                    >
                      <ThemedText type="small" themeColor="textSecondary">
                        個人間立替
                      </ThemedText>
                      <ThemedText type="subtitle" style={styles.personalAmount}>
                        {formatCurrency(summary.personal)}
                      </ThemedText>
                    </View>
                  </View>
                  {roomId ? (
                    <PrimaryButton
                      disabled={!registrationOpen}
                      onPress={() =>
                        router.push(`/rooms/${roomId}/expenses/new` as never)
                      }
                      style={styles.addButton}
                    >
                      <View style={styles.addLabel}>
                        <SymbolView
                          name={{ ios: 'plus', android: 'add', web: 'add' }}
                          size={19}
                          tintColor={
                            registrationOpen ? '#ffffff' : theme.textSecondary
                          }
                          fallback={
                            <Text
                              style={[
                                styles.whiteText,
                                !registrationOpen && {
                                  color: theme.textSecondary,
                                },
                              ]}
                            >
                              ＋
                            </Text>
                          }
                        />
                        <ThemedText
                          type="default"
                          style={[
                            styles.whiteText,
                            !registrationOpen && {
                              color: theme.textSecondary,
                            },
                          ]}
                        >
                          {registrationOpen ? '支出を追加' : '現在は登録期間外'}
                        </ThemedText>
                      </View>
                    </PrimaryButton>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.segment,
                    { backgroundColor: theme.overBackground },
                  ]}
                >
                  {filters.map((item) => {
                    const active = filter === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        onPress={() => setFilter(item.value)}
                        style={[
                          styles.segmentButton,
                          active && {
                            backgroundColor: theme.backgroundElement,
                          },
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={active ? styles.activeFilter : undefined}
                        >
                          {item.label}
                        </ThemedText>
                        {item.value === 'pending' && pendingCount > 0 ? (
                          <View
                            style={[
                              styles.dot,
                              { backgroundColor: theme.danger },
                            ]}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>

                {visibleExpenses.length === 0 ? (
                  <SurfaceCard style={styles.emptyCard}>
                    <ThemedText type="small" themeColor="textSecondary">
                      この条件に該当する支出はありません。
                    </ThemedText>
                  </SurfaceCard>
                ) : (
                  <View style={styles.expenseList}>
                    {visibleExpenses.map((expense) => (
                      <ExpenseCard expense={expense} key={expense.id} />
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomNav roomId={roomId} />
    </ThemedView>
  );
}

function ExpenseCard({ expense }: { expense: ExpenseListItem }) {
  const router = useRouter();
  const symbol = expense.category.includes('宿泊')
    ? ({ ios: 'bed.double.fill', android: 'hotel', web: 'hotel' } as const)
    : expense.category.includes('食')
      ? ({
          ios: 'fork.knife',
          android: 'restaurant',
          web: 'restaurant',
        } as const)
      : ({
          ios: 'car.fill',
          android: 'directions_car',
          web: 'directions_car',
        } as const);
  return (
    <Pressable
      onPress={() =>
        router.push(`/rooms/${expense.room_id}/expenses/${expense.id}` as never)
      }
    >
      {({ pressed }) => (
        <SurfaceCard style={[styles.expenseCard, pressed && styles.pressed]}>
          <RoundIcon
            color={expense.expense_type === 'personal' ? 'orange' : 'blue'}
            symbol={symbol}
          />
          <View style={styles.expenseMain}>
            <ThemedText
              type="default"
              style={styles.expenseTitle}
              numberOfLines={1}
            >
              {expense.description}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={1}
            >
              {expense.payer_display_name ||
                expense.payer_email ||
                '支払者未設定'}
              ・{expense.expense_type === 'common' ? '共通経費' : '個人間立替'}
            </ThemedText>
            <Badge
              label={formatStatus(expense.status)}
              tone={statusTone(expense.status)}
            />
          </View>
          <ThemedText type="default" style={styles.expenseAmount}>
            {formatCurrency(expense.amount)}
          </ThemedText>
        </SurfaceCard>
      )}
    </Pressable>
  );
}

function formatCurrency(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`;
}
function formatStatus(status: ExpenseStatus) {
  return {
    approved: '承認済み',
    pending: '未確認',
    rejected: '差し戻し',
    settled: '精算済み',
  }[status];
}
function statusTone(
  status: ExpenseStatus,
): 'danger' | 'neutral' | 'success' | 'warning' {
  return status === 'approved' || status === 'settled'
    ? 'success'
    : status === 'rejected'
      ? 'danger'
      : status === 'pending'
        ? 'neutral'
        : 'warning';
}

const styles = StyleSheet.create({
  activeFilter: { fontWeight: '700' },
  addButton: { minWidth: 188, marginTop: 8 },
  addLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: 22 },
  dot: {
    position: 'absolute',
    top: 5,
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  emptyCard: { alignItems: 'center', paddingVertical: 30 },
  expenseAmount: { flexShrink: 0, fontWeight: '700', fontSize: 18 },
  expenseCard: {
    minHeight: 102,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  expenseList: { gap: 12 },
  expenseMain: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 2 },
  expenseTitle: { fontWeight: '700' },
  headerWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 18,
  },
  personalAmount: { color: '#e58a00' },
  pressed: { opacity: 0.62 },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  segment: { flexDirection: 'row', borderRadius: 9, padding: 4 },
  segmentButton: {
    position: 'relative',
    flex: 1,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  summaryRow: { width: '100%', flexDirection: 'row', gap: 14 },
  summaryTile: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    borderRadius: Radius.control,
    padding: 14,
  },
  totalAmount: { fontSize: 36, lineHeight: 44 },
  totalSection: { alignItems: 'center', gap: 3 },
  whiteText: { color: '#ffffff', fontWeight: '700' },
});
