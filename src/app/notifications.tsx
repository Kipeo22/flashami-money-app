import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.screenTitle}>
                通知
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                承認待ち、承認済み、差し戻しを確認できます。
              </ThemedText>
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[styles.summaryCard, { borderColor: theme.border }]}
            >
              <View style={styles.summaryIcon}>
                <SymbolView
                  name={{
                    ios: 'bell.fill',
                    android: 'notifications',
                    web: 'notifications',
                  }}
                  size={22}
                  tintColor={theme.primary}
                  fallback={<Text style={{ color: theme.primary }}>!</Text>}
                />
              </View>
              <View style={styles.summaryText}>
                <ThemedText type="small" themeColor="textSecondary">
                  要確認
                </ThemedText>
                <ThemedText type="subtitle">{unreadCount}件</ThemedText>
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
              <View style={styles.list}>
                {items.map((item) => (
                  <Pressable
                    key={`${item.room.id}-${item.expense.id}-${item.expense.status}`}
                    onPress={() =>
                      router.push(
                        `/rooms/${item.room.id}/expenses/${item.expense.id}` as never,
                      )
                    }
                    style={({ pressed }) => [
                      styles.notificationRow,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.border,
                      },
                      Shadows.card,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: getToneColor(item.tone, theme) },
                      ]}
                    />
                    <View style={styles.notificationText}>
                      <ThemedText type="smallBold">
                        {formatExpenseStatus(item.expense.status)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {item.room.name}・{item.expense.description}
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold">
                      {formatCurrency(item.expense.amount)}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </ThemedView>
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    </ThemedView>
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
  return `${value.toLocaleString('ja-JP')}円`;
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
  screenTitle: {
    lineHeight: 40,
  },
  infoCard: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  notificationRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  notificationText: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  summaryCard: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.panel,
    padding: Spacing.three,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
  },
  summaryText: {
    gap: Spacing.one,
  },
});
