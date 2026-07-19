import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AdminBackLink,
  AdminInfoCard,
  AdminReviewItem,
} from '@/components/admin-dashboard';
import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import {
  fetchAdminRoomDashboards,
  flattenAdminExpenses,
  type AdminExpenseItem,
  type AdminRoomDashboard,
} from '@/lib/admin';
import { updateExpenseReviewStatus, type ExpenseStatus } from '@/lib/expenses';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function AdminReviewsScreen() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const resolvedRoomId = Array.isArray(roomId) ? undefined : roomId;
  const [adminRooms, setAdminRooms] = useState<AdminRoomDashboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingExpenseId, setIsUpdatingExpenseId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    let active = true;

    async function loadAdminRooms() {
      await Promise.resolve();

      if (!active) {
        return;
      }

      if (!isSupabaseConfigured) {
        setError('承認待ちを表示できませんでした。');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setFeedback(null);

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
            : '承認待ちの取得に失敗しました。';

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

  const pendingReviews = useMemo(
    () =>
      flattenAdminExpenses(adminRooms, 'pending').filter((item) =>
        resolvedRoomId ? item.room.id === resolvedRoomId : true,
      ),
    [adminRooms, resolvedRoomId],
  );
  const currentRoom = useMemo(
    () =>
      resolvedRoomId
        ? (adminRooms.find((dashboard) => dashboard.room.id === resolvedRoomId)
            ?.room ?? null)
        : null,
    [adminRooms, resolvedRoomId],
  );

  const handleApprove = async (item: AdminExpenseItem) => {
    setIsUpdatingExpenseId(item.expense.id);
    setFeedback(null);

    try {
      await updateExpenseReviewStatus({
        expenseId: item.expense.id,
        roomId: item.room.id,
        status: 'approved',
      });
      updateExpenseStatus(item.room.id, item.expense.id, 'approved');
      setRejectionReasons((currentReasons) => ({
        ...currentReasons,
        [item.expense.id]: '',
      }));
      setFeedback(`${item.expense.description} を承認しました。`);
    } catch (caughtError) {
      setFeedback(
        caughtError instanceof Error
          ? caughtError.message
          : '承認に失敗しました。',
      );
    } finally {
      setIsUpdatingExpenseId(null);
    }
  };

  const handleReject = async (item: AdminExpenseItem) => {
    const rejectionReason = rejectionReasons[item.expense.id]?.trim() ?? '';
    setIsUpdatingExpenseId(item.expense.id);
    setFeedback(null);

    try {
      const updated = await updateExpenseReviewStatus({
        expenseId: item.expense.id,
        rejectionReason,
        roomId: item.room.id,
        status: 'rejected',
      });
      updateExpenseStatus(
        item.room.id,
        item.expense.id,
        'rejected',
        rejectionReason,
      );
      setFeedback(
        updated.discord_notification_warning ??
          `${item.expense.description} を差し戻しました。`,
      );
    } catch (caughtError) {
      setFeedback(
        caughtError instanceof Error
          ? caughtError.message
          : '差し戻しに失敗しました。',
      );
    } finally {
      setIsUpdatingExpenseId(null);
    }
  };

  const updateExpenseStatus = (
    roomId: string,
    expenseId: string,
    status: Extract<ExpenseStatus, 'approved' | 'rejected'>,
    rejectionReason: string | null = null,
  ) => {
    setAdminRooms((currentDashboards) =>
      currentDashboards.map((dashboard) =>
        dashboard.room.id === roomId
          ? {
              ...dashboard,
              expenses: dashboard.expenses.map((expense) =>
                expense.id === expenseId
                  ? {
                      ...expense,
                      rejection_reason: rejectionReason,
                      status,
                    }
                  : expense,
              ),
            }
          : dashboard,
      ),
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <ThemedView style={styles.container}>
            <AdminBackLink onPress={() => router.replace('/admin')} />

            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">
                {currentRoom ? `${currentRoom.name}の承認待ち` : '承認待ち'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {currentRoom
                  ? 'このRoomの支出を承認または差し戻します。'
                  : '管理権限があるRoomの支出を承認または差し戻します。'}
              </ThemedText>
            </ThemedView>

            {isLoading ? (
              <AdminInfoCard title="読み込み中">
                未確認支出を取得しています。
              </AdminInfoCard>
            ) : null}

            {error ? (
              <AdminInfoCard title="取得に失敗しました">{error}</AdminInfoCard>
            ) : null}

            {feedback ? (
              <AdminInfoCard title="更新状況">{feedback}</AdminInfoCard>
            ) : null}

            {!isLoading && !error ? (
              <>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">承認待ち</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {pendingReviews.length}件
                  </ThemedText>
                </View>

                {pendingReviews.length === 0 ? (
                  <AdminInfoCard title="未確認の支出はありません">
                    新しい支出が登録されると、ここから承認できます。
                  </AdminInfoCard>
                ) : (
                  <View style={styles.list}>
                    {pendingReviews.map((item) => (
                      <AdminReviewItem
                        item={item}
                        isUpdating={isUpdatingExpenseId === item.expense.id}
                        key={item.expense.id}
                        rejectionReason={
                          rejectionReasons[item.expense.id] ?? ''
                        }
                        onApprove={() => handleApprove(item)}
                        onOpenDetail={() =>
                          router.push(
                            `/rooms/${item.room.id}/expenses/${item.expense.id}` as never,
                          )
                        }
                        onReject={() => handleReject(item)}
                        onRejectionReasonChange={(value) =>
                          setRejectionReasons((currentReasons) => ({
                            ...currentReasons,
                            [item.expense.id]: value,
                          }))
                        }
                      />
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </ThemedView>
  );
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
