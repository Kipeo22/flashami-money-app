import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AdminBackLink,
  AdminInfoCard,
  AdminRoomManagementItem,
} from '@/components/admin-dashboard';
import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { fetchAdminRoomDashboards, type AdminRoomDashboard } from '@/lib/admin';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function AdminRoomsScreen() {
  const router = useRouter();
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
        setError('Room別タスクを表示できませんでした。');
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
            : 'Room別タスクの取得に失敗しました。';

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
              <ThemedText type="subtitle">Room別タスク</ThemedText>
              <ThemedText themeColor="textSecondary">
                管理権限があるRoomごとに、メンバー、支出状況、必要な操作を確認します。
              </ThemedText>
            </ThemedView>

            {isLoading ? (
              <AdminInfoCard title="読み込み中">
                確認できるRoomを取得しています。
              </AdminInfoCard>
            ) : null}

            {error ? (
              <AdminInfoCard title="取得に失敗しました">{error}</AdminInfoCard>
            ) : null}

            {!isLoading && !error ? (
              <>
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">Room一覧</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {adminRooms.length}件
                  </ThemedText>
                </View>

                {adminRooms.length === 0 ? (
                  <AdminInfoCard title="表示できるRoomがありません">
                    Room作成者または管理権限があるメンバーになると表示されます。
                  </AdminInfoCard>
                ) : (
                  <View style={styles.list}>
                    {adminRooms.map((dashboard) => (
                      <AdminRoomManagementItem
                        dashboard={dashboard}
                        key={dashboard.room.id}
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
