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

import { DateField } from '@/components/date-field';
import {
  AppHeader,
  Badge,
  PrimaryButton,
  SecondaryButton,
  SurfaceCard,
} from '@/components/ios-ui';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchRoomDiscordWebhookUrl,
  saveRoomDiscordWebhookUrl,
  validateDiscordWebhookUrl,
} from '@/lib/discord';
import {
  fetchRoomById,
  fetchRoomMembers,
  inviteRoomMember,
  updateRoomExpenseRegistrationPeriod,
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
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [registrationStartDate, setRegistrationStartDate] = useState('');
  const [registrationEndDate, setRegistrationEndDate] = useState('');
  const [registrationFeedback, setRegistrationFeedback] = useState<
    string | null
  >(null);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [discordWebhookVisible, setDiscordWebhookVisible] = useState(false);
  const [savingDiscord, setSavingDiscord] = useState(false);
  const [discordFeedback, setDiscordFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!roomId || !isSupabaseConfigured) {
      return;
    }
    Promise.all([
      fetchRoomMembers(roomId),
      fetchRoomById(roomId),
      fetchRoomDiscordWebhookUrl(roomId),
    ])
      .then(([memberData, room, webhookUrl]) => {
        if (!active) return;
        setMembers(memberData);
        setRegistrationStartDate(room.expense_registration_start_date ?? '');
        setRegistrationEndDate(room.expense_registration_end_date ?? '');
        setDiscordWebhookUrl(webhookUrl);
      })
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

  const saveRegistrationPeriod = async () => {
    if (!roomId) return;
    setSavingPeriod(true);
    setRegistrationFeedback(null);
    try {
      await updateRoomExpenseRegistrationPeriod({
        endDate: registrationEndDate,
        roomId,
        startDate: registrationStartDate,
      });
      setRegistrationFeedback('支出登録期間を保存しました。');
    } catch (error) {
      setRegistrationFeedback(
        error instanceof Error
          ? error.message
          : '支出登録期間を保存できませんでした。',
      );
    } finally {
      setSavingPeriod(false);
    }
  };

  const saveDiscordIntegration = async () => {
    if (!roomId) return;
    const validationError = validateDiscordWebhookUrl(discordWebhookUrl);
    if (validationError) {
      setDiscordFeedback(validationError);
      return;
    }

    setSavingDiscord(true);
    setDiscordFeedback(null);
    try {
      const savedUrl = await saveRoomDiscordWebhookUrl(
        roomId,
        discordWebhookUrl,
      );
      setDiscordWebhookUrl(savedUrl);
      setDiscordFeedback(
        savedUrl
          ? 'Discord通知を接続しました。次の支出登録から通知されます。'
          : 'Discord通知の接続を解除しました。',
      );
    } catch (error) {
      setDiscordFeedback(
        error instanceof Error
          ? error.message
          : 'Discord通知設定を保存できませんでした。',
      );
    } finally {
      setSavingDiscord(false);
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
            title="イベント管理"
          />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <SurfaceCard style={styles.discordCard}>
              <View style={styles.registrationHeading}>
                <View style={styles.registrationTitle}>
                  <ThemedText type="default" style={styles.memberName}>
                    Discord通知
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    支出登録を指定チャンネルへ自動投稿
                  </ThemedText>
                </View>
                <Badge
                  label={discordWebhookUrl ? '接続済み' : '未接続'}
                  tone={discordWebhookUrl ? 'primary' : 'neutral'}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Discordのチャンネル設定からウェブフックを作成し、「ウェブフックURLをコピー」で取得したURLを貼り付けてください。
              </ThemedText>
              <View style={[styles.inputShell, { backgroundColor: '#f3f4ff' }]}>
                <SymbolView
                  name={{ ios: 'link', android: 'link', web: 'link' }}
                  size={20}
                  tintColor={theme.primary}
                  fallback={<Text style={{ color: theme.primary }}>⌁</Text>}
                />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  onChangeText={(value) => {
                    setDiscordWebhookUrl(value);
                    setDiscordFeedback(null);
                  }}
                  placeholder="https://discord.com/api/webhooks/..."
                  placeholderTextColor={theme.textDisabled}
                  secureTextEntry={!discordWebhookVisible}
                  style={[styles.input, { color: theme.text }]}
                  value={discordWebhookUrl}
                />
                <Pressable
                  accessibilityLabel={
                    discordWebhookVisible
                      ? 'Webhook URLを隠す'
                      : 'Webhook URLを表示'
                  }
                  hitSlop={8}
                  onPress={() =>
                    setDiscordWebhookVisible((visible) => !visible)
                  }
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <SymbolView
                    name={{
                      ios: discordWebhookVisible ? 'eye.slash' : 'eye',
                      android: discordWebhookVisible
                        ? 'visibility_off'
                        : 'visibility',
                      web: discordWebhookVisible
                        ? 'visibility_off'
                        : 'visibility',
                    }}
                    size={20}
                    tintColor={theme.textSecondary}
                    fallback={
                      <Text style={{ color: theme.textSecondary }}>
                        {discordWebhookVisible ? '隠す' : '表示'}
                      </Text>
                    }
                  />
                </Pressable>
              </View>
              <PrimaryButton
                disabled={loading || savingDiscord}
                onPress={saveDiscordIntegration}
              >
                {savingDiscord ? '保存中…' : 'Discord通知を保存'}
              </PrimaryButton>
              {discordWebhookUrl ? (
                <SecondaryButton
                  onPress={
                    savingDiscord
                      ? null
                      : () => {
                          setDiscordWebhookUrl('');
                          setDiscordFeedback(
                            '「Discord通知を保存」を押すと接続を解除します。',
                          );
                        }
                  }
                >
                  接続を解除
                </SecondaryButton>
              ) : null}
              {discordFeedback ? (
                <ThemedText
                  type="small"
                  themeColor={
                    discordFeedback.includes('しました') ||
                    discordFeedback.includes('解除します')
                      ? 'textSecondary'
                      : 'danger'
                  }
                >
                  {discordFeedback}
                </ThemedText>
              ) : null}
            </SurfaceCard>

            <SurfaceCard style={styles.registrationCard}>
              <View style={styles.registrationHeading}>
                <View style={styles.registrationTitle}>
                  <ThemedText type="default" style={styles.memberName}>
                    支出登録期間
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    参加者が支出を登録・再申請できる期間
                  </ThemedText>
                </View>
                <Badge label="運営設定" tone="primary" />
              </View>
              <View style={styles.periodFields}>
                <DateField
                  allowClear
                  onChange={setRegistrationStartDate}
                  placeholder="登録開始日を選択"
                  value={registrationStartDate}
                />
                <DateField
                  allowClear
                  onChange={setRegistrationEndDate}
                  placeholder="登録終了日を選択"
                  value={registrationEndDate}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                どちらも空欄の場合は、期間を制限しません。
              </ThemedText>
              <PrimaryButton
                disabled={loading || savingPeriod}
                onPress={saveRegistrationPeriod}
              >
                {savingPeriod ? '保存中…' : '登録期間を保存'}
              </PrimaryButton>
              {registrationFeedback ? (
                <ThemedText
                  type="small"
                  themeColor={
                    registrationFeedback.includes('保存しました')
                      ? 'textSecondary'
                      : 'danger'
                  }
                >
                  {registrationFeedback}
                </ThemedText>
              ) : null}
            </SurfaceCard>

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
                メールアドレスを入力して、このイベントへの招待を登録します。
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
  discordCard: { gap: 14 },
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
  periodFields: { gap: 10 },
  pressed: { opacity: 0.55 },
  registrationCard: { gap: 14 },
  registrationHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  registrationTitle: { flex: 1, gap: 2 },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
});
