import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { QuickExpenseModal } from '@/components/quick-expense-modal';
import { TaskSheetModal } from '@/components/task-sheet-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCurrentUserRooms, type UserRoomRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [rooms, setRooms] = useState<UserRoomRecord[]>([]);
  const [isQuickExpenseVisible, setIsQuickExpenseVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskSheetVisible, setIsTaskSheetVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const todayIso = useMemo(() => getTodayIsoDate(), []);
  const activeRooms = useMemo(
    () => rooms.filter((room) => isRoomActive(room, todayIso)),
    [rooms, todayIso],
  );
  const activeAdminRooms = useMemo(
    () => activeRooms.filter((room) => room.member_role === 'admin'),
    [activeRooms],
  );

  useEffect(() => {
    let active = true;

    async function loadRooms() {
      if (!isSupabaseConfigured) {
        router.replace('/login');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const roomData = await fetchCurrentUserRooms();
        if (active) {
          setRooms(roomData);
        }
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : 'イベントの取得に失敗しました。';

        if (message.includes('ログインが必要')) {
          router.replace('/login');
          return;
        }

        setError(
          'イベントを表示できませんでした。時間をおいて再度お試しください。',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadRooms();

    return () => {
      active = false;
    };
  }, [router]);

  const primaryRoom = activeRooms[0] ?? null;

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Flashami Money
              </ThemedText>
              <ThemedText type="title" style={styles.screenTitle}>
                ホーム
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                開催中のイベントだけを表示します。
              </ThemedText>
            </ThemedView>

            {primaryRoom ? (
              <Pressable
                onPress={() => router.push(`/rooms/${primaryRoom.id}` as never)}
                style={({ pressed }) => [
                  styles.featureCard,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                  Shadows.card,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.featureHeader}>
                  <View style={styles.eventIdentity}>
                    <View
                      style={[
                        styles.eventIcon,
                        { backgroundColor: theme.primary },
                      ]}
                    >
                      <SymbolView
                        name={{
                          ios: 'calendar',
                          android: 'event',
                          web: 'event',
                        }}
                        size={20}
                        tintColor="#ffffff"
                        fallback={
                          <Text style={styles.eventIconFallback}>•</Text>
                        }
                      />
                    </View>
                    <View style={styles.featureTitleGroup}>
                      <ThemedText type="small" themeColor="textSecondary">
                        開催中
                      </ThemedText>
                      <ThemedText type="subtitle" style={styles.featureTitle}>
                        {primaryRoom.name}
                      </ThemedText>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.primary }}
                    >
                      開催中
                    </ThemedText>
                  </View>
                </View>

                <View
                  style={[
                    styles.metaRow,
                    { backgroundColor: theme.overBackground },
                  ]}
                >
                  <Meta label="期間" value={formatRoomPeriod(primaryRoom)} />
                  <Meta
                    label="登録済み"
                    value={`${primaryRoom.expense_count}件`}
                  />
                </View>

                <View
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: theme.primary,
                    },
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: 'chevron.right.circle.fill',
                      android: 'chevron_right',
                      web: 'chevron_right',
                    }}
                    size={22}
                    tintColor="#ffffff"
                    fallback={<Text style={styles.primaryIconFallback}>+</Text>}
                  />
                  <ThemedText type="default" style={styles.primaryButtonText}>
                    イベントを開く
                  </ThemedText>
                </View>
              </Pressable>
            ) : null}

            {activeRooms.length > 1 ? (
              <ThemedView style={styles.section}>
                <ThemedText type="smallBold">ほかの開催中イベント</ThemedText>
                <View style={styles.roomList}>
                  {activeRooms.slice(1).map((room) => (
                    <RoomRow key={room.id} room={room} />
                  ))}
                </View>
              </ThemedView>
            ) : null}

            {isLoading ? (
              <ThemedView
                type="backgroundElement"
                style={[
                  styles.card,
                  { borderColor: theme.border },
                  Shadows.card,
                ]}
              >
                <ThemedText type="smallBold">読み込み中</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  参加中のイベントを確認しています。
                </ThemedText>
              </ThemedView>
            ) : null}

            {error ? (
              <ThemedView
                type="backgroundElement"
                style={[
                  styles.card,
                  { borderColor: theme.border },
                  Shadows.card,
                ]}
              >
                <ThemedText type="smallBold">表示できませんでした</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {error}
                </ThemedText>
              </ThemedView>
            ) : null}

            {!isLoading && !error && activeRooms.length === 0 ? (
              <>
                <ThemedView
                  type="backgroundElement"
                  style={[
                    styles.emptyCard,
                    { borderColor: theme.border },
                    Shadows.card,
                  ]}
                >
                  <ThemedText type="default" style={styles.emptyTitle}>
                    開催中のイベントはありません
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.emptyDescription}
                  >
                    イベントが始まると、ここから支出入力と確認タスクを開けます。
                  </ThemedText>
                  <Pressable
                    onPress={() => router.push('/rooms')}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      { borderColor: theme.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.primary }}
                    >
                      参加イベント一覧を見る
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              </>
            ) : null}
          </ThemedView>
        </ScrollView>
        <View pointerEvents="box-none" style={styles.floatingActions}>
          {activeAdminRooms.length > 0 ? (
            <Pressable
              accessibilityLabel="タスク"
              onPress={() => setIsTaskSheetVisible(true)}
              style={({ pressed }) => [
                styles.taskFab,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
                Shadows.card,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  ios: 'checklist',
                  android: 'assignment_turned_in',
                  web: 'assignment_turned_in',
                }}
                size={22}
                tintColor={theme.primary}
                fallback={<Text style={{ color: theme.primary }}>□</Text>}
              />
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                タスク
              </ThemedText>
            </Pressable>
          ) : null}

          {primaryRoom ? (
            <Pressable
              accessibilityLabel="支出入力"
              onPress={() => setIsQuickExpenseVisible(true)}
              style={({ pressed }) => [
                styles.addFab,
                { backgroundColor: theme.primary },
                Shadows.card,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  ios: 'plus',
                  android: 'add',
                  web: 'add',
                }}
                size={30}
                tintColor="#ffffff"
                fallback={<Text style={styles.addFabFallback}>+</Text>}
              />
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
      <BottomNav />
      <QuickExpenseModal
        initialRoomId={primaryRoom?.id}
        onClose={() => setIsQuickExpenseVisible(false)}
        visible={isQuickExpenseVisible}
      />
      <TaskSheetModal
        activeRoomIds={activeAdminRooms.map((room) => room.id)}
        onClose={() => setIsTaskSheetVisible(false)}
        visible={isTaskSheetVisible}
      />
    </ThemedView>
  );
}

function RoomRow({ room }: { room: UserRoomRecord }) {
  const router = useRouter();
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push(`/rooms/${room.id}` as never)}
      style={({ pressed }) => [
        styles.roomRow,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        Shadows.card,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.roomRowMain}>
        <ThemedText type="smallBold">{room.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatRoomPeriod(room)}
        </ThemedText>
      </View>
      <View style={[styles.inputPill, { backgroundColor: theme.primarySoft }]}>
        <SymbolView
          name={{
            ios: 'chevron.right',
            android: 'chevron_right',
            web: 'chevron_right',
          }}
          size={16}
          tintColor={theme.primary}
          fallback={<Text style={{ color: theme.primary }}>›</Text>}
        />
        <ThemedText type="smallBold" style={{ color: theme.primary }}>
          開く
        </ThemedText>
      </View>
    </Pressable>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isRoomActive(room: UserRoomRecord, todayIso: string) {
  if (!room.start_date || !room.end_date) {
    return false;
  }

  return room.start_date <= todayIso && room.end_date >= todayIso;
}

function formatRoomPeriod(room: UserRoomRecord) {
  if (!room.start_date && !room.end_date) {
    return '期間未設定';
  }

  return `${room.start_date ?? '-'} - ${room.end_date ?? '-'}`;
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
  screenTitle: {
    lineHeight: 40,
  },
  featureCard: {
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.panel,
    padding: Spacing.four,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  eventIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  eventIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  eventIconFallback: {
    color: '#ffffff',
    fontSize: 20,
  },
  featureTitleGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  featureTitle: {
    lineHeight: 32,
  },
  badge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    borderRadius: Radius.control,
    padding: Spacing.two,
  },
  metaItem: {
    minWidth: 120,
    flex: 1,
    gap: Spacing.one,
  },
  primaryButton: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  primaryIconFallback: {
    color: '#ffffff',
    fontSize: 20,
    lineHeight: 22,
  },
  addFab: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
  },
  addFabFallback: {
    color: '#ffffff',
    fontSize: 30,
    lineHeight: 32,
  },
  floatingActions: {
    position: 'absolute',
    right: Spacing.three,
    bottom: 96,
    left: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskFab: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
  },
  section: {
    gap: Spacing.two,
  },
  roomList: {
    gap: Spacing.two,
  },
  roomRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  roomRowMain: {
    flex: 1,
    gap: Spacing.one,
  },
  inputPill: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
  },
  card: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  emptyCard: {
    padding: Spacing.four,
    borderRadius: Radius.panel,
    borderWidth: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  emptyTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
