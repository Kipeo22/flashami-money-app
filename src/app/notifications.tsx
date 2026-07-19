import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchRoomExpenses,
  type ExpenseListItem,
  type ExpenseStatus,
} from '@/lib/expenses';
import {
  fetchCurrentUserRooms,
  normalizeEmail,
  requireAuthenticatedUser,
  type UserRoomRecord,
} from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

type NotificationItem = {
  expense: ExpenseListItem;
  kind: 'action' | 'update';
  room: UserRoomRecord;
  tone: 'danger' | 'neutral' | 'primary';
};

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedRoomCount, setFailedRoomCount] = useState(0);
  const requestId = useRef(0);

  const loadNotifications = useCallback(
    async (isRefresh = false) => {
      const currentRequestId = ++requestId.current;
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }

      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);
      setFailedRoomCount(0);

      try {
        const [rooms, currentUser] = await Promise.all([
          fetchCurrentUserRooms(),
          requireAuthenticatedUser(),
        ]);
        const currentUserEmail = normalizeEmail(currentUser.email);
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
              .filter(
                (expense) =>
                  expense.payer_id === currentUser.id ||
                  expense.target_user_ids.includes(currentUser.id) ||
                  expense.target_emails.some(
                    (email) => normalizeEmail(email) === currentUserEmail,
                  ),
              )
              .filter((expense) =>
                ['approved', 'pending', 'rejected'].includes(expense.status),
              )
              .map((expense) => ({
                expense,
                kind:
                  expense.status === 'rejected' &&
                  expense.payer_id === currentUser.id
                    ? ('action' as const)
                    : ('update' as const),
                room,
                tone: getNotificationTone(expense.status),
              })),
          )
          .sort((first, second) =>
            second.expense.created_at.localeCompare(first.expense.created_at),
          );

        setItems(nextItems);
        setFailedRoomCount(failedCount);
        if (failedCount > 0 && roomExpenses.length === 0) {
          setError('通知を取得できませんでした。');
        }
      } catch (caughtError) {
        if (currentRequestId !== requestId.current) return;

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : '通知を取得できませんでした。';

        if (message.includes('ログインが必要')) {
          router.replace('/login');
          return;
        }

        setError(message);
      } finally {
        if (currentRequestId === requestId.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [router],
  );

  useEffect(() => {
    const loadTimer = setTimeout(() => loadNotifications(), 0);
    return () => {
      clearTimeout(loadTimer);
      requestId.current += 1;
    };
  }, [loadNotifications]);

  const actionItems = useMemo(
    () => items.filter((item) => item.kind === 'action'),
    [items],
  );
  const updateItems = useMemo(
    () => items.filter((item) => item.kind === 'update'),
    [items],
  );
  const pendingCount = useMemo(
    () => items.filter((item) => item.expense.status === 'pending').length,
    [items],
  );
  const approvedCount = useMemo(
    () => items.filter((item) => item.expense.status === 'approved').length,
    [items],
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              onRefresh={() => loadNotifications(true)}
              refreshing={isRefreshing}
              tintColor={theme.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.screenTitle}>
                通知
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                支出の確認状況をまとめて確認できます
              </ThemedText>
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[
                styles.summaryCard,
                { borderColor: theme.border },
                Shadows.card,
              ]}
            >
              <View style={styles.summaryTop}>
                <View
                  style={[
                    styles.summaryIcon,
                    { backgroundColor: `${theme.danger}14` },
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: 'bell.badge.fill',
                      android: 'notifications_active',
                      web: 'notifications_active',
                    }}
                    size={24}
                    tintColor={theme.danger}
                    fallback={<Text style={{ color: theme.danger }}>!</Text>}
                  />
                </View>
                <View style={styles.summaryText}>
                  <ThemedText type="small" themeColor="textSecondary">
                    要対応
                  </ThemedText>
                  <View style={styles.summaryCountRow}>
                    <ThemedText style={styles.summaryCount}>
                      {actionItems.length}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      件
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: theme.border },
                ]}
              />

              <View style={styles.summaryStats}>
                <SummaryStat
                  color={theme.warning}
                  count={pendingCount}
                  label="承認待ち"
                />
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: theme.border },
                  ]}
                />
                <SummaryStat
                  color={theme.primary}
                  count={approvedCount}
                  label="承認済み"
                />
              </View>
            </ThemedView>

            {isLoading ? (
              <InfoCard title="読み込み中">通知を取得しています。</InfoCard>
            ) : null}

            {error ? (
              <InfoCard
                onRetry={() => loadNotifications()}
                title="取得に失敗しました"
              >
                {error}
              </InfoCard>
            ) : null}

            {!error && failedRoomCount > 0 ? (
              <InfoCard
                onRetry={() => loadNotifications()}
                title="一部を表示できません"
              >
                {`${failedRoomCount}件のイベントは取得できませんでした。取得できた通知のみ表示しています。`}
              </InfoCard>
            ) : null}

            {!isLoading && !error && items.length === 0 ? (
              <InfoCard title="通知はありません">
                承認や差し戻しがあるとここに表示されます。
              </InfoCard>
            ) : null}

            {!isLoading && !error && actionItems.length > 0 ? (
              <NotificationSection items={actionItems} title="要対応" />
            ) : null}
            {!isLoading && !error && updateItems.length > 0 ? (
              <NotificationSection items={updateItems} title="ステータス更新" />
            ) : null}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </ThemedView>
  );
}

function NotificationSection({
  items,
  title,
}: {
  items: NotificationItem[];
  title: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.notificationsSection}>
      <View style={styles.sectionHeader}>
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {items.length}件
        </ThemedText>
      </View>
      <View
        style={[
          styles.list,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
      >
        {items.map((item, index) => (
          <View
            key={`${item.room.id}-${item.expense.id}-${item.expense.status}`}
          >
            {index > 0 ? (
              <View
                style={[styles.rowSeparator, { backgroundColor: theme.border }]}
              />
            ) : null}
            <NotificationRow item={item} />
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryStat({
  color,
  count,
  label,
}: {
  color: string;
  count: number;
  label: string;
}) {
  return (
    <View style={styles.summaryStat}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{count}件</ThemedText>
    </View>
  );
}

function NotificationRow({ item }: { item: NotificationItem }) {
  const router = useRouter();
  const theme = useTheme();
  const statusColor = getToneColor(item.tone, theme);

  return (
    <Pressable
      accessibilityHint="支出詳細を開きます"
      accessibilityLabel={`${item.expense.description}、${formatCurrency(item.expense.amount)}、${formatExpenseStatus(item.expense.status)}`}
      accessibilityRole="button"
      onPress={() =>
        router.push(
          `/rooms/${item.room.id}/expenses/${item.expense.id}` as never,
        )
      }
      style={styles.notificationRow}
    >
      <View
        style={[
          styles.statusIcon,
          { backgroundColor: getToneBackground(item.tone, theme) },
        ]}
      >
        <SymbolView
          name={getStatusSymbol(item.expense.status)}
          size={20}
          tintColor={statusColor}
          fallback={<Text style={{ color: statusColor }}>•</Text>}
        />
      </View>

      <View style={styles.notificationText}>
        <ThemedText
          numberOfLines={1}
          style={[styles.statusLabel, { color: statusColor }]}
        >
          {formatExpenseStatus(item.expense.status)}
        </ThemedText>
        <ThemedText numberOfLines={2} style={styles.expenseTitle}>
          {item.expense.description}
        </ThemedText>
        <ThemedText numberOfLines={1} type="small" themeColor="textSecondary">
          {item.room.name}・{formatExpenseDate(item.expense.paid_at)}
        </ThemedText>
      </View>

      <View style={styles.amountColumn}>
        <ThemedText numberOfLines={1} style={styles.amount}>
          {formatCurrency(item.expense.amount)}
        </ThemedText>
        <SymbolView
          name={{
            ios: 'chevron.right',
            android: 'chevron_right',
            web: 'chevron_right',
          }}
          size={15}
          tintColor={theme.textDisabled}
          fallback={<Text style={{ color: theme.textDisabled }}>›</Text>}
        />
      </View>
    </Pressable>
  );
}

function InfoCard({
  children,
  onRetry,
  title,
}: {
  children: string;
  onRetry?: () => void;
  title: string;
}) {
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.infoCard, { borderColor: theme.border }, Shadows.card]}
    >
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
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
    </ThemedView>
  );
}

function formatCurrency(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

function formatExpenseDate(value: string) {
  const [, month, day] = value.split('-').map(Number);

  if (!month || !day) {
    return value;
  }

  return `${month}月${day}日`;
}

function formatExpenseStatus(status: ExpenseStatus) {
  const labels: Record<ExpenseStatus, string> = {
    approved: '承認済み',
    pending: '承認待ち',
    rejected: '差し戻し',
    settled: '精算済み',
  };

  return labels[status] ?? status;
}

function getNotificationTone(status: ExpenseStatus): NotificationItem['tone'] {
  if (status === 'rejected') {
    return 'danger';
  }

  if (status === 'approved') {
    return 'primary';
  }

  return 'neutral';
}

function getToneColor(
  tone: NotificationItem['tone'],
  theme: ReturnType<typeof useTheme>,
) {
  if (tone === 'danger') {
    return theme.danger;
  }

  if (tone === 'primary') {
    return theme.primary;
  }

  return theme.warning;
}

function getToneBackground(
  tone: NotificationItem['tone'],
  theme: ReturnType<typeof useTheme>,
) {
  if (tone === 'danger') {
    return `${theme.danger}14`;
  }

  if (tone === 'primary') {
    return theme.primarySoft;
  }

  return `${theme.warning}18`;
}

function getStatusSymbol(status: ExpenseStatus): SymbolName {
  if (status === 'rejected') {
    return {
      ios: 'arrow.uturn.backward.circle.fill',
      android: 'assignment_return',
      web: 'assignment_return',
    };
  }

  if (status === 'approved' || status === 'settled') {
    return {
      ios: 'checkmark.circle.fill',
      android: 'check_circle',
      web: 'check_circle',
    };
  }

  return {
    ios: 'clock.fill',
    android: 'schedule',
    web: 'schedule',
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.five,
  },
  header: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  screenTitle: {
    lineHeight: 40,
  },
  infoCard: {
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    padding: Spacing.four,
  },
  list: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
  },
  notificationRow: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: Spacing.three,
  },
  notificationText: {
    minWidth: 0,
    flex: 1,
    gap: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  summaryCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.panel,
    padding: Spacing.four,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  summaryIcon: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
  summaryText: {
    gap: 0,
  },
  summaryCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  summaryCount: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: Spacing.three,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    marginHorizontal: Spacing.three,
  },
  notificationsSection: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 80,
  },
  retryButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.pill,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  statusIcon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  amountColumn: {
    maxWidth: 108,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'right',
  },
});
