import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AdminInfoCard,
  AdminSummaryActionTile,
  formatCurrency,
} from '@/components/admin-dashboard';
import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchAdminRoomDashboards,
  summarizeAdminDashboards,
  type AdminRoomDashboard,
} from '@/lib/admin';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function AdminScreen() {
  const router = useRouter();
  const theme = useTheme();
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
        setError('管理画面を表示できませんでした。');
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
            : '管理画面の取得に失敗しました。';

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

  const totals = useMemo(
    () => summarizeAdminDashboards(adminRooms),
    [adminRooms],
  );

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="title" style={styles.screenTitle}>
                管理
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                作成・管理しているRoomの状況を確認し、必要な詳細へ移動します。
              </ThemedText>
            </ThemedView>

            {isLoading ? (
              <AdminInfoCard title="読み込み中">
                管理対象のRoomと支出を取得しています。
              </AdminInfoCard>
            ) : null}

            {error ? (
              <AdminInfoCard title="取得に失敗しました">{error}</AdminInfoCard>
            ) : null}

            {!isLoading && !error ? (
              <>
                <View style={styles.summaryGrid}>
                  <AdminSummaryActionTile
                    description="Room別の参加者数、支出状況、管理導線を開く"
                    label="管理Room"
                    onPress={() => router.push('/admin/rooms' as never)}
                    symbol={{
                      ios: 'person.3.fill',
                      android: 'groups',
                      web: 'groups',
                    }}
                    value={`${totals.rooms}件`}
                  />
                  <AdminSummaryActionTile
                    description="承認・差し戻しが必要な支出を確認する"
                    label="未確認"
                    onPress={() => router.push('/admin/reviews' as never)}
                    symbol={{
                      ios: 'checklist',
                      android: 'assignment_turned_in',
                      web: 'assignment_turned_in',
                    }}
                    value={`${totals.pending}件`}
                  />
                  <AdminSummaryActionTile
                    description="承認済み支出だけを確認する"
                    label="承認済み"
                    onPress={() =>
                      router.push('/admin/expenses?status=approved' as never)
                    }
                    symbol={{
                      ios: 'checkmark.circle',
                      android: 'check_circle',
                      web: 'check_circle',
                    }}
                    value={`${totals.approved}件`}
                  />
                  <AdminSummaryActionTile
                    description="全Roomの支出内訳と一覧を確認する"
                    label="支出合計"
                    onPress={() => router.push('/admin/expenses' as never)}
                    symbol={{
                      ios: 'yensign.circle',
                      android: 'payments',
                      web: 'payments',
                    }}
                    value={formatCurrency(totals.totalAmount)}
                  />
                </View>

                {adminRooms.length === 0 ? (
                  <ThemedView
                    type="backgroundElement"
                    style={[
                      styles.emptyCard,
                      { borderColor: theme.border },
                      Shadows.card,
                    ]}
                  >
                    <ThemedText type="default" style={styles.emptyTitle}>
                      管理できるRoomがありません
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.emptyDescription}
                    >
                      Room作成者またはadminとして登録されると、この画面に表示されます。
                    </ThemedText>
                  </ThemedView>
                ) : null}
              </>
            ) : null}
          </ThemedView>
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
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
  screenTitle: {
    lineHeight: 40,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.five,
  },
  emptyTitle: {
    fontWeight: '700',
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
