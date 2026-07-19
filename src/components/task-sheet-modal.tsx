import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminInfoCard, AdminReviewItem } from '@/components/admin-dashboard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchAdminRoomDashboards,
  flattenAdminExpenses,
  type AdminExpenseItem,
  type AdminRoomDashboard,
} from '@/lib/admin';
import { updateExpenseReviewStatus, type ExpenseStatus } from '@/lib/expenses';

export function TaskSheetModal({
  activeRoomIds,
  onClose,
  visible,
}: {
  activeRoomIds: string[];
  onClose: () => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const [adminRooms, setAdminRooms] = useState<AdminRoomDashboard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingExpenseId, setIsUpdatingExpenseId] = useState<string | null>(
    null,
  );
  const [rejectionReasons, setRejectionReasons] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    let active = true;

    async function loadTasks() {
      if (!visible) {
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
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'タスクを取得できませんでした。',
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      active = false;
    };
  }, [visible]);

  const pendingTasks = useMemo(
    () =>
      flattenAdminExpenses(adminRooms, 'pending').filter((item) =>
        activeRoomIds.length > 0 ? activeRoomIds.includes(item.room.id) : true,
      ),
    [activeRoomIds, adminRooms],
  );

  const handleClose = () => {
    setFeedback(null);
    onClose();
  };

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
    <Modal
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <SafeAreaView style={styles.safeArea}>
            <ThemedView
              type="backgroundElement"
              style={[
                styles.sheet,
                { borderColor: theme.border },
                Shadows.card,
              ]}
            >
              <View style={styles.handle} />

              <View style={styles.header}>
                <View style={styles.headerText}>
                  <ThemedText type="subtitle">タスク</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    承認待ち {pendingTasks.length}件
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityLabel="閉じる"
                  onPress={handleClose}
                  style={({ pressed }) => [
                    styles.closeButton,
                    { backgroundColor: theme.backgroundSelected },
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={{ ios: 'xmark', android: 'close', web: 'close' }}
                    size={18}
                    tintColor={theme.textSecondary}
                    fallback={
                      <Text style={{ color: theme.textSecondary }}>x</Text>
                    }
                  />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
              >
                {isLoading ? (
                  <AdminInfoCard title="読み込み中">
                    承認待ちの支出を確認しています。
                  </AdminInfoCard>
                ) : null}

                {error ? (
                  <AdminInfoCard title="取得に失敗しました">
                    {error}
                  </AdminInfoCard>
                ) : null}

                {feedback ? (
                  <AdminInfoCard title="更新状況">{feedback}</AdminInfoCard>
                ) : null}

                {!isLoading && !error && pendingTasks.length === 0 ? (
                  <AdminInfoCard title="承認待ちはありません">
                    新しい支出が登録されるとここに表示されます。
                  </AdminInfoCard>
                ) : null}

                {!isLoading && !error
                  ? pendingTasks.map((item) => (
                      <AdminReviewItem
                        isUpdating={isUpdatingExpenseId === item.expense.id}
                        item={item}
                        key={item.expense.id}
                        onApprove={() => handleApprove(item)}
                        onReject={() => handleReject(item)}
                        onRejectionReasonChange={(value) =>
                          setRejectionReasons((currentReasons) => ({
                            ...currentReasons,
                            [item.expense.id]: value,
                          }))
                        }
                        rejectionReason={
                          rejectionReasons[item.expense.id] ?? ''
                        }
                      />
                    ))
                  : null}
              </ScrollView>
            </ThemedView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  content: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(120, 120, 128, 0.28)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  headerText: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pressed: {
    opacity: 0.72,
  },
  safeArea: {
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.three,
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.panel,
    borderTopRightRadius: Radius.panel,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
});
