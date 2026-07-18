import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppHeader,
  Badge,
  IconButton,
  RoundIcon,
  SecondaryButton,
  SurfaceCard,
} from '@/components/ios-ui';
import { BottomNav } from '@/components/bottom-nav';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchAdminRoomDashboards,
  flattenAdminExpenses,
  summarizeAdminDashboards,
  type AdminRoomDashboard,
} from '@/lib/admin';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function AdminActivityScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [dashboards, setDashboards] = useState<AdminRoomDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) {
      router.replace('/login');
      return;
    }
    fetchAdminRoomDashboards()
      .then((data) => active && setDashboards(data))
      .catch((caught) => {
        if (!active) return;
        const message =
          caught instanceof Error
            ? caught.message
            : '確認状況を取得できませんでした。';
        if (message.includes('ログインが必要')) router.replace('/login');
        else setError(message);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [router]);

  const totals = useMemo(
    () => summarizeAdminDashboards(dashboards),
    [dashboards],
  );
  const pending = useMemo(
    () => flattenAdminExpenses(dashboards, 'pending'),
    [dashboards],
  );
  const rejected = useMemo(
    () => flattenAdminExpenses(dashboards, 'rejected'),
    [dashboards],
  );
  const pendingAmount = pending.reduce(
    (sum, item) => sum + item.expense.amount,
    0,
  );
  const progress = totals.expenses
    ? Math.round(
        ((totals.approved +
          (totals.expenses - totals.pending - totals.rejected)) /
          totals.expenses) *
          100,
      )
    : 100;

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        <View style={styles.headerWrap}>
          <AppHeader
            action={
              <IconButton
                accessibilityLabel="設定"
                onPress={() => router.push('/account')}
                symbol={{
                  ios: 'gearshape',
                  android: 'settings',
                  web: 'settings',
                }}
              />
            }
            onBack={() => router.replace('/rooms')}
            title="精算状況の確認"
          />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.container}>
            {loading ? (
              <SurfaceCard>
                <ThemedText type="small" themeColor="textSecondary">
                  確認が必要な支出を読み込んでいます。
                </ThemedText>
              </SurfaceCard>
            ) : null}
            {error ? (
              <SurfaceCard>
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              </SurfaceCard>
            ) : null}

            {!loading && !error ? (
              <>
                <View style={styles.summaryCards}>
                  <SurfaceCard style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <ThemedText
                        type="default"
                        style={{ color: theme.danger, fontWeight: '700' }}
                      >
                        未確認
                      </ThemedText>
                      <View
                        style={[
                          styles.alertIcon,
                          { backgroundColor: theme.danger },
                        ]}
                      >
                        <ThemedText style={styles.white}>!</ThemedText>
                      </View>
                    </View>
                    <ThemedText type="title" style={styles.summaryNumber}>
                      {pending.length}
                      <ThemedText type="small" themeColor="textSecondary">
                        {' '}
                        件
                      </ThemedText>
                    </ThemedText>
                    <ThemedText type="subtitle">
                      {formatCurrency(pendingAmount)}
                    </ThemedText>
                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: '#f4cfd1' },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(100, pending.length ? 76 : 0)}%`,
                            backgroundColor: theme.danger,
                          },
                        ]}
                      />
                    </View>
                  </SurfaceCard>

                  <SurfaceCard style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <ThemedText type="default" style={styles.bold}>
                        差し戻し中
                      </ThemedText>
                      <SymbolView
                        name={{
                          ios: 'clipboard.fill',
                          android: 'assignment_late',
                          web: 'assignment_late',
                        }}
                        size={22}
                        tintColor={theme.warning}
                        fallback={
                          <Text style={{ color: theme.warning }}>▤</Text>
                        }
                      />
                    </View>
                    <ThemedText type="title" style={styles.summaryNumber}>
                      {rejected.length}
                      <ThemedText type="small" themeColor="textSecondary">
                        {' '}
                        件
                      </ThemedText>
                    </ThemedText>
                    <View style={styles.progressLabel}>
                      <ThemedText type="small" themeColor="textSecondary">
                        全体進捗
                      </ThemedText>
                      <ThemedText
                        type="subtitle"
                        style={{ color: theme.primary }}
                      >
                        {progress}%
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: theme.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress}%`,
                            backgroundColor: theme.primary,
                          },
                        ]}
                      />
                    </View>
                  </SurfaceCard>
                </View>

                <SectionTitle title="未確認の支出" />
                <SurfaceCard style={styles.listCard}>
                  {pending.length === 0 ? (
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.emptyText}
                    >
                      未確認の支出はありません。
                    </ThemedText>
                  ) : null}
                  {pending.slice(0, 3).map((item, index) => (
                    <Pressable
                      key={item.expense.id}
                      onPress={() =>
                        router.push(
                          `/rooms/${item.expense.room_id}/expenses/${item.expense.id}` as never,
                        )
                      }
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <View
                        style={[
                          styles.expenseRow,
                          index < Math.min(3, pending.length) - 1
                            ? {
                                borderBottomWidth: StyleSheet.hairlineWidth,
                                borderBottomColor: theme.border,
                              }
                            : undefined,
                        ]}
                      >
                        <RoundIcon
                          color={index === 0 ? 'red' : 'blue'}
                          symbol={{
                            ios:
                              index === 0 ? 'exclamationmark' : 'doc.text.fill',
                            android:
                              index === 0 ? 'priority_high' : 'receipt_long',
                            web: index === 0 ? 'priority_high' : 'receipt_long',
                          }}
                        />
                        <View style={styles.expenseMain}>
                          <ThemedText
                            type="default"
                            style={styles.bold}
                            numberOfLines={2}
                          >
                            {item.expense.description}
                          </ThemedText>
                          <ThemedText
                            type="small"
                            themeColor="textSecondary"
                            numberOfLines={1}
                          >
                            {item.expense.payer_display_name ||
                              item.expense.payer_email ||
                              item.room.name}
                            ・{item.expense.paid_at}
                          </ThemedText>
                        </View>
                        <View style={styles.expenseAmountWrap}>
                          <ThemedText type="default" style={styles.bold}>
                            {formatCurrency(item.expense.amount)}
                          </ThemedText>
                          {index === 0 ? (
                            <Badge label="至急" tone="danger" />
                          ) : null}
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </SurfaceCard>
                {pending.length > 3 ? (
                  <SecondaryButton
                    onPress={() => router.push('/admin/reviews')}
                  >
                    すべて見る
                  </SecondaryButton>
                ) : null}

                <SectionTitle title="システム連携ステータス" />
                <View style={styles.integrationList}>
                  <SurfaceCard style={styles.integrationRow}>
                    <RoundIcon
                      symbol={{
                        ios: 'message.fill',
                        android: 'chat',
                        web: 'chat',
                      }}
                    />
                    <View style={styles.integrationText}>
                      <ThemedText type="default" style={styles.bold}>
                        Discord通知
                      </ThemedText>
                      <ThemedText type="small" style={styles.success}>
                        ◎ 正常動作中
                      </ThemedText>
                    </View>
                  </SurfaceCard>
                  <SurfaceCard
                    style={[styles.integrationRow, styles.integrationWarning]}
                  >
                    <RoundIcon
                      symbol={{
                        ios: 'tablecells.fill',
                        android: 'table_chart',
                        web: 'table_chart',
                      }}
                    />
                    <View style={styles.integrationText}>
                      <ThemedText type="default" style={styles.bold}>
                        Google Sheets
                      </ThemedText>
                      <ThemedText type="small" themeColor="danger">
                        △ {pending.length}件未同期
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() =>
                        setSyncFeedback('同期リクエストを受け付けました。')
                      }
                      style={[
                        styles.syncButton,
                        { backgroundColor: theme.danger },
                      ]}
                    >
                      <ThemedText type="smallBold" style={styles.white}>
                        再同期
                      </ThemedText>
                    </Pressable>
                  </SurfaceCard>
                </View>
                {syncFeedback ? (
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.feedback}
                  >
                    {syncFeedback}
                  </ThemedText>
                ) : null}
              </>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
      <BottomNav />
    </ThemedView>
  );
}

function SectionTitle({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.sectionTitle, { borderBottomColor: theme.border }]}>
      <ThemedText type="subtitle" style={styles.sectionTitleText}>
        {title}
      </ThemedText>
    </View>
  );
}
function formatCurrency(value: number) {
  return `¥${value.toLocaleString('ja-JP')}`;
}

const styles = StyleSheet.create({
  alertIcon: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  bold: { fontWeight: '700' },
  container: { width: '100%', maxWidth: MaxContentWidth, gap: 16 },
  content: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 34,
  },
  emptyText: { padding: 20, textAlign: 'center' },
  expenseAmountWrap: { alignItems: 'flex-end', gap: 4 },
  expenseMain: { flex: 1, minWidth: 0 },
  expenseRow: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  feedback: { textAlign: 'center' },
  headerWrap: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: 18,
  },
  integrationList: { gap: 12 },
  integrationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  integrationText: { flex: 1 },
  integrationWarning: { borderColor: '#f0b6b9' },
  listCard: { padding: 0, overflow: 'hidden' },
  pressed: { opacity: 0.6 },
  progressFill: { height: 5, borderRadius: 3 },
  progressLabel: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  progressTrack: { height: 5, overflow: 'hidden', borderRadius: 3 },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
  sectionTitle: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
    paddingBottom: 9,
  },
  sectionTitleText: { fontSize: 23 },
  success: { color: '#22b657' },
  summaryCard: { gap: 8, padding: 18 },
  summaryCards: { gap: 14 },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryNumber: { fontSize: 34, lineHeight: 42 },
  syncButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
  },
  white: { color: '#ffffff' },
});
