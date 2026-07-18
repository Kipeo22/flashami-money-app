import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { fetchCurrentUserRooms, type UserRoomRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

type NotificationItem = {
  expense: ExpenseListItem;
  room: UserRoomRecord;
  tone: 'danger' | 'neutral' | 'primary';
};

type SymbolName = ComponentProps<typeof SymbolView>['name'];

export default function NotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const rooms = await fetchCurrentUserRooms();
        const roomExpenses = await Promise.all(
          rooms.map(async (room) => ({
            expenses: await fetchRoomExpenses(room.id),
            room,
          })),
        );

        if (!active) {
          return;
        }

        setItems(
          roomExpenses
            .flatMap(({ expenses, room }) =>
              expenses
                .filter((expense) =>
                  ['approved', 'pending', 'rejected'].includes(expense.status),
                )
                .map((expense) => ({
                  expense,
                  room,
                  tone: getNotificationTone(expense.status),
                })),
            )
            .sort((first, second) =>
              second.expense.created_at.localeCompare(first.expense.created_at),
            ),
        );
      } catch (caughtError) {
        if (!active) {
          return;
        }

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
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadNotifications();

    return () => {
      active = false;
    };
  }, [router]);

  const unreadCount = useMemo(
    () =>
      items.filter((item) =>
        ['pending', 'rejected'].includes(item.expense.status),
      ).length,
    [items],
  );
  const pendingCount = useMemo(
    () => items.filter((item) => item.expense.status === 'pending').length,
    [items],
  );
  const rejectedCount = useMemo(
    () => items.filter((item) => item.expense.status === 'rejected').length,
    [items],
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
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
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: 'bell.badge.fill',
                      android: 'notifications_active',
                      web: 'notifications_active',
                    }}
                    size={24}
                    tintColor={theme.primary}
                    fallback={<Text style={{ color: theme.primary }}>!</Text>}
                  />
                </View>
                <View style={styles.summaryText}>
                  <ThemedText type="small" themeColor="textSecondary">
                    確認が必要
                  </ThemedText>
                  <View style={styles.summaryCountRow}>
                    <ThemedText style={styles.summaryCount}>
                      {unreadCount}
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
                  color={theme.danger}
                  count={rejectedCount}
                  label="差し戻し"
                />
              </View>
            </ThemedView>

            {isLoading ? (
              <InfoCard title="読み込み中">通知を取得しています。</InfoCard>
            ) : null}

            {error ? (
              <InfoCard title="取得に失敗しました">{error}</InfoCard>
            ) : null}

            {!isLoading && !error && items.length === 0 ? (
              <InfoCard title="通知はありません">
                承認や差し戻しがあるとここに表示されます。
              </InfoCard>
            ) : null}

            {!isLoading && !error && items.length > 0 ? (
              <View style={styles.notificationsSection}>
                <View style={styles.sectionHeader}>
                  <ThemedText style={styles.sectionTitle}>
                    最近の通知
                  </ThemedText>
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
                          style={[
                            styles.rowSeparator,
                            { backgroundColor: theme.border },
                          ]}
                        />
                      ) : null}
                      <NotificationRow item={item} />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </ThemedView>
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

function InfoCard({ children, title }: { children: string; title: string }) {
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
