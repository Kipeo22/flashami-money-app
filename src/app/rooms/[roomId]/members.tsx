import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import {
  fetchRoomById,
  fetchRoomMembers,
  type RoomMemberRecord,
  type RoomRecord,
} from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

export default function RoomMembersScreen() {
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const theme = useTheme();
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [members, setMembers] = useState<RoomMemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!roomId || Array.isArray(roomId)) {
        setError('roomId が指定されていません。');
        setIsLoading(false);
        return;
      }

      if (!isSupabaseConfigured) {
        setError('メンバー一覧を表示できませんでした。');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [roomData, memberData] = await Promise.all([
          fetchRoomById(roomId),
          fetchRoomMembers(roomId),
        ]);

        if (!active) {
          return;
        }

        setRoom(roomData);
        setMembers(memberData);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'room情報の取得に失敗しました。',
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [roomId]);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedView style={styles.container}>
            <ThemedView style={styles.header}>
              <ThemedText type="subtitle">メンバー</ThemedText>
              <ThemedText themeColor="textSecondary">
                roomに登録されたメンバーのメールアドレス、権限、参加状態を表示します。
              </ThemedText>
            </ThemedView>

            <View style={styles.actions}>
              <Link href="/rooms" asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    room一覧へ
                  </ThemedText>
                </Pressable>
              </Link>
              <Link href={'/rooms/new' as any} asChild>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    { borderColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    roomを作成する
                  </ThemedText>
                </Pressable>
              </Link>
              {roomId && !Array.isArray(roomId) ? (
                <>
                  <Link href={`/rooms/${roomId}` as any} asChild>
                    <Pressable
                      style={({ pressed }) => [
                        styles.button,
                        {
                          backgroundColor: theme.primarySoft,
                          borderColor: theme.primary,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ color: theme.primary }}
                      >
                        支出一覧を見る
                      </ThemedText>
                    </Pressable>
                  </Link>
                  <Link href={`/rooms/${roomId}/expenses/new` as any} asChild>
                    <Pressable
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
                        支出を登録する
                      </ThemedText>
                    </Pressable>
                  </Link>
                </>
              ) : null}
            </View>

            {isLoading ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">読み込み中</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  roomの詳細とメンバーを取得しています。
                </ThemedText>
              </ThemedView>
            ) : null}

            {error ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">取得に失敗しました</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {error}
                </ThemedText>
              </ThemedView>
            ) : null}

            {room ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <ThemedText type="smallBold">{room.name}</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {room.description || '説明はまだ登録されていません。'}
                </ThemedText>
                <View style={styles.metaRow}>
                  <Meta label="開始日" value={room.start_date ?? '-'} />
                  <Meta label="終了日" value={room.end_date ?? '-'} />
                </View>
              </ThemedView>
            ) : null}

            {!isLoading && !error ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.card, { borderColor: theme.border }]}
              >
                <View style={styles.sectionHeader}>
                  <ThemedText type="smallBold">メンバー</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {members.length}名
                  </ThemedText>
                </View>

                {members.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    メンバーはまだ登録されていません。
                  </ThemedText>
                ) : (
                  <View style={styles.memberList}>
                    {members.map((member) => (
                      <View
                        key={member.id}
                        style={[
                          styles.memberRow,
                          {
                            backgroundColor: theme.background,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <View style={styles.memberMain}>
                          <ThemedText type="smallBold">
                            {member.display_name || member.email}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {member.email}
                          </ThemedText>
                        </View>
                        <View style={styles.badges}>
                          <Badge
                            backgroundColor={
                              member.role === 'admin'
                                ? theme.primarySoft
                                : theme.backgroundSelected
                            }
                            label={formatMemberRole(member.role)}
                            textColor={
                              member.role === 'admin'
                                ? theme.primary
                                : theme.textSecondary
                            }
                          />
                          <Badge
                            backgroundColor={theme.backgroundSelected}
                            label={formatMemberStatus(member.status)}
                            textColor={theme.textSecondary}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ThemedView>
            ) : null}
          </ThemedView>
        </ScrollView>
        <BottomNav />
      </SafeAreaView>
    </ThemedView>
  );
}

function formatMemberRole(role: RoomMemberRecord['role']) {
  return role === 'admin' ? '管理権限' : 'メンバー';
}

function formatMemberStatus(status: RoomMemberRecord['status']) {
  return status === 'joined' ? '参加中' : '招待中';
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

function Badge({
  backgroundColor,
  label,
  textColor,
}: {
  backgroundColor: string;
  label: string;
  textColor: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <ThemedText type="small" style={[styles.badgeText, { color: textColor }]}>
        {label}
      </ThemedText>
    </View>
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  card: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.three,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  metaItem: {
    minWidth: 120,
    flex: 1,
    gap: Spacing.one,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  memberList: {
    gap: Spacing.two,
  },
  memberRow: {
    gap: Spacing.two,
    borderRadius: Radius.control,
    padding: Spacing.two,
    borderWidth: 1,
  },
  memberMain: {
    gap: 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
  },
  badgeText: {
    fontWeight: '700',
  },
});
