import { useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppHeader,
  Badge,
  PrimaryButton,
  SurfaceCard,
} from '@/components/ios-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchRoomMembers,
  inviteRoomMember,
  type RoomMemberRecord,
} from '@/lib/rooms';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function MembersScreen() {
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = Array.isArray(params.roomId) ? undefined : params.roomId;
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [members, setMembers] = useState<RoomMemberRecord[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(
    Boolean(roomId && isSupabaseConfigured),
  );
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!roomId || !isSupabaseConfigured) {
      return;
    }
    fetchRoomMembers(roomId)
      .then((data) => active && setMembers(data))
      .catch(
        (error) =>
          active &&
          setFeedback(
            error instanceof Error
              ? error.message
              : '参加者を取得できませんでした。',
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [roomId]);

  const sendInvite = async () => {
    if (!roomId) return;
    setSending(true);
    setFeedback(null);
    try {
      const data = await inviteRoomMember(roomId, email);
      setMembers(data);
      setEmail('');
      setFeedback('参加者を招待しました。');
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : '招待を送信できませんでした。',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerWrap}>
          <AppHeader
            action={
              <Pressable
                onPress={() => inputRef.current?.focus()}
                style={[
                  styles.addButton,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  ＋追加
                </ThemedText>
              </Pressable>
            }
            title="参加者管理"
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <SurfaceCard style={styles.memberCard}>
              {loading ? (
                <ThemedText type="small" themeColor="textSecondary">
                  参加者を読み込んでいます。
                </ThemedText>
              ) : null}
              {!loading && members.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  参加者はまだいません。
                </ThemedText>
              ) : null}
              {members.map((member, index) => (
                <View
                  key={member.id}
                  style={[
                    styles.memberRow,
                    index < members.length - 1 && {
                      borderBottomColor: theme.border,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.avatar,
                      { backgroundColor: avatarColor(index) },
                    ]}
                  >
                    <ThemedText type="default" style={styles.avatarText}>
                      {initial(member)}
                    </ThemedText>
                  </View>
                  <View style={styles.memberMain}>
                    <View style={styles.nameRow}>
                      <ThemedText type="default" style={styles.memberName}>
                        {member.display_name || member.email.split('@')[0]}
                      </ThemedText>
                      <Badge
                        label={
                          member.role === 'admin'
                            ? '運営者'
                            : member.status === 'invited'
                              ? '招待中'
                              : '参加者'
                        }
                        tone={member.role === 'admin' ? 'primary' : 'neutral'}
                      />
                    </View>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={1}
                    >
                      {member.email}
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityLabel="参加者メニュー"
                    hitSlop={8}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <SymbolView
                      name={{
                        ios: 'ellipsis',
                        android: 'more_vert',
                        web: 'more_vert',
                      }}
                      size={20}
                      tintColor={theme.textSecondary}
                      fallback={
                        <Text style={{ color: theme.textSecondary }}>⋮</Text>
                      }
                    />
                  </Pressable>
                </View>
              ))}
            </SurfaceCard>

            <SurfaceCard style={styles.inviteCard}>
              <View style={styles.inviteTitle}>
                <SymbolView
                  name={{ ios: 'envelope.fill', android: 'mail', web: 'mail' }}
                  size={21}
                  tintColor={theme.primary}
                  fallback={<Text style={{ color: theme.primary }}>✉</Text>}
                />
                <ThemedText type="default" style={styles.memberName}>
                  新しい参加者を招待
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                メールアドレスを入力して、このroomへの招待を登録します。
              </ThemedText>
              <View style={[styles.inputShell, { backgroundColor: '#f3f4ff' }]}>
                <ThemedText style={{ color: theme.textDisabled, fontSize: 25 }}>
                  @
                </ThemedText>
                <TextInput
                  ref={inputRef}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={theme.textDisabled}
                  style={[styles.input, { color: theme.text }]}
                  value={email}
                />
              </View>
              <PrimaryButton
                disabled={!email.trim() || sending}
                onPress={sendInvite}
              >
                {sending ? '送信中…' : '▷  招待を送信'}
              </PrimaryButton>
              {feedback ? (
                <ThemedText
                  type="small"
                  themeColor={
                    feedback.includes('招待しました')
                      ? 'textSecondary'
                      : 'danger'
                  }
                >
                  {feedback}
                </ThemedText>
              ) : null}
            </SurfaceCard>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function initial(member: RoomMemberRecord) {
  return (member.display_name || member.email).slice(0, 1).toUpperCase();
}
function avatarColor(index: number) {
  return ['#dce8ff', '#fde0d2', '#e9e7e3'][index % 3];
}

const styles = StyleSheet.create({
  addButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    paddingHorizontal: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  avatarText: { fontSize: 20 },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: 30 },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
  },
  headerWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 18,
  },
  input: { flex: 1, minHeight: 50, fontFamily: Fonts.sans, fontSize: 16 },
  inputShell: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.control,
    paddingHorizontal: 14,
  },
  inviteCard: { gap: 14, padding: 22 },
  inviteTitle: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  memberCard: { padding: 0, overflow: 'hidden' },
  memberMain: { flex: 1, minWidth: 0, gap: 2 },
  memberName: { fontWeight: '700' },
  memberRow: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pressed: { opacity: 0.55 },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
});
