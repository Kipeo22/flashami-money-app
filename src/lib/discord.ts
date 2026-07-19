import { formatSupabaseError, requireCurrentUserRoomAdmin } from '@/lib/rooms';
import { getSupabaseClient } from '@/lib/supabase';

type DiscordIntegrationRecord = {
  room_id: string;
  webhook_url: string;
};

export type DiscordNotificationResult = {
  sent: boolean;
  skipped: boolean;
};

export function validateDiscordWebhookUrl(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;

  try {
    const url = new URL(normalizedValue);
    const allowedHosts = new Set([
      'discord.com',
      'discordapp.com',
      'canary.discord.com',
      'canary.discordapp.com',
      'ptb.discord.com',
      'ptb.discordapp.com',
    ]);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const webhookIndex = pathSegments.findIndex(
      (segment) => segment === 'webhooks',
    );
    const validPrefix =
      webhookIndex === 1 ||
      (webhookIndex === 2 && /^v\d+$/.test(pathSegments[1] ?? ''));

    if (
      url.protocol !== 'https:' ||
      !allowedHosts.has(url.hostname) ||
      Boolean(url.search || url.hash) ||
      pathSegments[0] !== 'api' ||
      !validPrefix ||
      pathSegments.length !== webhookIndex + 3 ||
      !/^\d+$/.test(pathSegments[webhookIndex + 1] ?? '') ||
      !(pathSegments[webhookIndex + 2] ?? '')
    ) {
      return 'DiscordからコピーしたWebhook URLを入力してください。';
    }
  } catch {
    return 'DiscordからコピーしたWebhook URLを入力してください。';
  }

  return null;
}

export async function fetchRoomDiscordWebhookUrl(roomId: string) {
  await requireCurrentUserRoomAdmin(roomId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('room_discord_integrations')
    .select('room_id, webhook_url')
    .eq('room_id', roomId)
    .maybeSingle<DiscordIntegrationRecord>();

  if (error) {
    if (isMissingDiscordIntegrationTableError(error)) {
      throw new Error(discordIntegrationMigrationMessage);
    }
    throw new Error(formatSupabaseError(error));
  }

  return data?.webhook_url ?? '';
}

export async function saveRoomDiscordWebhookUrl(
  roomId: string,
  webhookUrl: string,
) {
  const normalizedUrl = webhookUrl.trim();
  const validationError = validateDiscordWebhookUrl(normalizedUrl);
  if (validationError) {
    throw new Error(validationError);
  }

  const user = await requireCurrentUserRoomAdmin(roomId);
  if (!user.user_id) {
    throw new Error('ログイン状態を確認できませんでした。');
  }
  const supabase = getSupabaseClient();

  if (!normalizedUrl) {
    const { error } = await supabase
      .from('room_discord_integrations')
      .delete()
      .eq('room_id', roomId);
    if (error) {
      if (isMissingDiscordIntegrationTableError(error)) {
        throw new Error(discordIntegrationMigrationMessage);
      }
      throw new Error(formatSupabaseError(error));
    }
    return '';
  }

  const { error } = await supabase.from('room_discord_integrations').upsert({
    created_by: user.user_id,
    room_id: roomId,
    updated_at: new Date().toISOString(),
    webhook_url: normalizedUrl,
  });
  if (error) {
    if (isMissingDiscordIntegrationTableError(error)) {
      throw new Error(discordIntegrationMigrationMessage);
    }
    throw new Error(formatSupabaseError(error));
  }

  return normalizedUrl;
}

export async function notifyDiscordExpenseCreated(
  roomId: string,
  expenseId: string,
): Promise<DiscordNotificationResult> {
  return notifyDiscordExpenseEvent('expense-created', roomId, expenseId);
}

export async function notifyDiscordExpenseRejected(
  roomId: string,
  expenseId: string,
): Promise<DiscordNotificationResult> {
  return notifyDiscordExpenseEvent('expense-rejected', roomId, expenseId);
}

async function notifyDiscordExpenseEvent(
  eventType: 'expense-created' | 'expense-rejected',
  roomId: string,
  expenseId: string,
): Promise<DiscordNotificationResult> {
  const supabase = getSupabaseClient();
  const { data, error } =
    await supabase.functions.invoke<DiscordNotificationResult>(
      'discord-notification',
      {
        body: {
          eventType,
          expenseId,
          roomId,
        },
      },
    );

  if (error || !data) {
    throw new Error(
      eventType === 'expense-created'
        ? '支出は登録されましたが、Discordへ通知できませんでした。'
        : '支出は差し戻されましたが、Discordへ通知できませんでした。',
    );
  }

  return data;
}

const discordIntegrationMigrationMessage =
  'Discord連携の準備が完了していません。データベース更新を適用してください。';

function isMissingDiscordIntegrationTableError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message : '';
  return (
    (record.code === '42P01' || record.code === 'PGRST205') &&
    message.includes('room_discord_integrations')
  );
}
