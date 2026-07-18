import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, IconButton, SurfaceCard } from '@/components/ios-ui';
import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchCurrentUserRooms, type UserRoomRecord } from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function RoomsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [rooms, setRooms] = useState<UserRoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) {
      router.replace('/login');
      return;
    }
    fetchCurrentUserRooms()
      .then((data) => active && setRooms(data))
      .catch((caught) => {
        if (!active) return;
        const message =
          caught instanceof Error
            ? caught.message
            : 'room一覧を取得できませんでした。';
        if (message.includes('ログインが必要')) router.replace('/login');
        else setError(message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [router]);

  const visibleRooms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ja');
    return normalized
      ? rooms.filter((room) =>
          room.name.toLocaleLowerCase('ja').includes(normalized),
        )
      : rooms;
  }, [query, rooms]);

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.topBar}>
          <View style={[styles.avatar, { backgroundColor: '#f2dfd5' }]}>
            <ThemedText type="smallBold">ME</ThemedText>
          </View>
          <View style={styles.topActions}>
            <IconButton
              accessibilityLabel="roomを検索"
              onPress={() => setSearchOpen((value) => !value)}
              symbol={{
                ios: 'magnifyingglass',
                android: 'search',
                web: 'search',
              }}
            />
            <IconButton
              accessibilityLabel="roomを作成"
              filled
              onPress={() => router.push('/rooms/new')}
              symbol={{ ios: 'plus', android: 'add', web: 'add' }}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <ThemedText type="title" style={styles.title}>
              参加中のroom
            </ThemedText>

            {searchOpen ? (
              <View
                style={[
                  styles.search,
                  { backgroundColor: theme.overBackground },
                ]}
              >
                <SymbolView
                  name={{
                    ios: 'magnifyingglass',
                    android: 'search',
                    web: 'search',
                  }}
                  size={18}
                  tintColor={theme.textSecondary}
                  fallback={
                    <Text style={{ color: theme.textSecondary }}>⌕</Text>
                  }
                />
                <TextInput
                  autoFocus
                  onChangeText={setQuery}
                  placeholder="room名で検索"
                  placeholderTextColor={theme.textDisabled}
                  style={[styles.searchInput, { color: theme.text }]}
                  value={query}
                />
              </View>
            ) : null}

            {loading ? (
              <MessageCard
                title="読み込み中"
                message="参加中のroomを確認しています。"
              />
            ) : null}
            {error ? (
              <MessageCard title="表示できませんでした" message={error} />
            ) : null}

            {!loading && !error && visibleRooms.length === 0 ? (
              <SurfaceCard style={styles.emptyCard}>
                <ThemedText type="default" style={styles.emptyTitle}>
                  {query
                    ? '一致するroomがありません'
                    : '参加中のroomがありません'}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.emptyText}
                >
                  {query
                    ? '別のキーワードを試してください。'
                    : '右上の＋から最初のroomを作成できます。'}
                </ThemedText>
              </SurfaceCard>
            ) : null}

            <View style={styles.roomList}>
              {visibleRooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </ThemedView>
  );
}

function RoomCard({ room }: { room: UserRoomRecord }) {
  const router = useRouter();
  const theme = useTheme();
  return (
    <Pressable onPress={() => router.push(`/rooms/${room.id}` as never)}>
      {({ pressed }) => (
        <SurfaceCard style={[styles.roomCard, pressed && styles.pressed]}>
          <View style={styles.cardHeader}>
            <ThemedText
              type="default"
              style={styles.roomName}
              numberOfLines={1}
            >
              {room.name}
            </ThemedText>
            <Badge
              label={room.member_role === 'admin' ? '運営者' : '参加者'}
              tone={room.member_role === 'admin' ? 'primary' : 'neutral'}
            />
          </View>
          <View style={styles.dateRow}>
            <SymbolView
              name={{
                ios: 'calendar',
                android: 'calendar_today',
                web: 'calendar_today',
              }}
              size={15}
              tintColor={theme.textSecondary}
              fallback={<Text style={{ color: theme.textSecondary }}>□</Text>}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {formatPeriod(room)}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.cardFooter}>
            <View style={styles.stats}>
              <Stat label="支出" value={`${room.expense_count}件`} />
              <Stat
                danger={room.pending_expense_count > 0}
                label="未確認"
                value={`${room.pending_expense_count}件`}
              />
            </View>
            <View style={styles.people}>
              {[0, 1, 2].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.person,
                    {
                      backgroundColor: ['#f3d9cc', '#dbe8f5', '#e6e1d7'][index],
                      borderColor: theme.backgroundElement,
                    },
                    index > 0 && styles.personOverlap,
                  ]}
                >
                  <ThemedText style={styles.personText}>
                    {['山', '佐', '田'][index]}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </SurfaceCard>
      )}
    </Pressable>
  );
}

function Stat({
  danger,
  label,
  value,
}: {
  danger?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View>
      <ThemedText
        type="small"
        themeColor="textSecondary"
        style={styles.statLabel}
      >
        {label}
      </ThemedText>
      <ThemedText type="default" style={danger ? styles.dangerText : undefined}>
        {value}
        {danger ? ' ●' : ''}
      </ThemedText>
    </View>
  );
}

function MessageCard({ message, title }: { message: string; title: string }) {
  return (
    <SurfaceCard style={styles.messageCard}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
    </SurfaceCard>
  );
}

function formatPeriod(room: UserRoomRecord) {
  const start = room.start_date?.replaceAll('-', '.') ?? '未定';
  const end = room.end_date?.replaceAll('-', '.') ?? '未定';
  return `${start} - ${end}`;
}

const styles = StyleSheet.create({
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: 18 },
  dangerText: { color: '#d9272e' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { height: StyleSheet.hairlineWidth },
  emptyCard: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyText: { textAlign: 'center' },
  emptyTitle: { fontWeight: '700' },
  messageCard: { gap: 4 },
  people: { flexDirection: 'row', paddingRight: 2 },
  person: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 14,
  },
  personOverlap: { marginLeft: -8 },
  personText: { fontSize: 10, fontWeight: '700' },
  pressed: { opacity: 0.64, transform: [{ scale: 0.99 }] },
  roomCard: { gap: 12, padding: 18 },
  roomList: { gap: Spacing.three },
  roomName: { flex: 1, fontWeight: '700', fontSize: 18 },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  search: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.control,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, minHeight: 48, fontFamily: Fonts.sans, fontSize: 16 },
  statLabel: { fontSize: 12, lineHeight: 16 },
  stats: { flexDirection: 'row', gap: 28 },
  title: { marginTop: 6, marginBottom: 10, fontSize: 30, lineHeight: 38 },
  topActions: { flexDirection: 'row', gap: 10 },
  topBar: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
});
