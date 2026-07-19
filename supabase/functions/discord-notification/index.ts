import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};

type NotificationRequest = {
  eventType: 'expense-created' | 'expense-rejected';
  expenseId: string;
  roomId: string;
};

type ExpenseRecord = {
  amount: number;
  category: string;
  description: string;
  expense_type: 'common' | 'personal';
  id: string;
  payer_id: string | null;
  receipt_image_url: string | null;
  rejection_reason: string | null;
  room_id: string;
  status: string;
};

type RoomMemberRecord = {
  display_name: string | null;
  email: string;
  role: 'admin' | 'member';
  status: 'invited' | 'joined';
  user_id: string | null;
};

type ExpenseTargetRecord = {
  display_name: string | null;
  email: string | null;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Authentication required.' }, 401);
    }

    const payload = (await request.json()) as Partial<NotificationRequest>;
    if (
      (payload.eventType !== 'expense-created' &&
        payload.eventType !== 'expense-rejected') ||
      !isUuid(payload.expenseId) ||
      !isUuid(payload.roomId)
    ) {
      return jsonResponse({ error: 'Invalid request.' }, 400);
    }

    const supabaseUrl = requireEnvironmentVariable('SUPABASE_URL');
    const publishableKey = getSupabaseKey(
      'SUPABASE_PUBLISHABLE_KEYS',
      'SUPABASE_ANON_KEY',
    );
    const secretKey = getSupabaseKey(
      'SUPABASE_SECRET_KEYS',
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    const userClient = createClient(supabaseUrl, publishableKey, {
      global: { headers: { Authorization: authorization } },
    });
    const adminClient = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(authorization.slice('Bearer '.length));
    if (userError || !user) {
      return jsonResponse({ error: 'Authentication required.' }, 401);
    }

    const { data: membership, error: membershipError } = await adminClient
      .from('room_members')
      .select('display_name, email, role, status, user_id')
      .eq('room_id', payload.roomId)
      .eq('user_id', user.id)
      .eq('status', 'joined')
      .maybeSingle<RoomMemberRecord>();
    if (membershipError) throw membershipError;
    if (!membership) {
      return jsonResponse({ error: 'Room membership required.' }, 403);
    }

    const { data: expense, error: expenseError } = await adminClient
      .from('expenses')
      .select(
        'id, room_id, payer_id, expense_type, amount, category, description, receipt_image_url, rejection_reason, status',
      )
      .eq('id', payload.expenseId)
      .eq('room_id', payload.roomId)
      .maybeSingle<ExpenseRecord>();
    if (expenseError) throw expenseError;
    if (!expense) {
      return jsonResponse({ error: 'Expense not found.' }, 404);
    }
    if (
      payload.eventType === 'expense-created' &&
      (expense.payer_id !== user.id || expense.status !== 'pending')
    ) {
      return jsonResponse(
        { error: 'Only the payer can send this event.' },
        403,
      );
    }
    if (
      payload.eventType === 'expense-rejected' &&
      (membership.role !== 'admin' || expense.status !== 'rejected')
    ) {
      return jsonResponse({ error: 'Room admin permission required.' }, 403);
    }

    const { data: integration, error: integrationError } = await adminClient
      .from('room_discord_integrations')
      .select('webhook_url')
      .eq('room_id', payload.roomId)
      .maybeSingle<{ webhook_url: string }>();
    if (integrationError) throw integrationError;
    if (!integration?.webhook_url) {
      return jsonResponse({ sent: false, skipped: true });
    }

    const [roomResult, payerResult, targetsResult] = await Promise.all([
      adminClient
        .from('rooms')
        .select('name')
        .eq('id', payload.roomId)
        .single<{ name: string }>(),
      expense.payer_id
        ? adminClient
            .from('room_members')
            .select('display_name, email, role, status, user_id')
            .eq('room_id', payload.roomId)
            .eq('user_id', expense.payer_id)
            .maybeSingle<RoomMemberRecord>()
        : Promise.resolve({ data: null, error: null }),
      adminClient
        .from('expense_targets')
        .select('display_name, email')
        .eq('expense_id', expense.id)
        .returns<ExpenseTargetRecord[]>(),
    ]);
    if (roomResult.error) throw roomResult.error;
    if (payerResult.error) throw payerResult.error;
    if (targetsResult.error) throw targetsResult.error;

    const message =
      payload.eventType === 'expense-rejected'
        ? buildExpenseRejectedMessage({
            expense,
            payer: payerResult.data,
            roomName: roomResult.data.name,
          })
        : buildExpenseCreatedMessage({
            expense,
            payer: payerResult.data,
            targets: targetsResult.data,
          });
    const discordResponse = await postDiscordMessage({
      content: message,
      receiptImageUrl: expense.receipt_image_url,
      webhookUrl: integration.webhook_url,
    });
    if (!discordResponse.ok) {
      const responseText = await discordResponse.text();
      console.error(
        `Discord webhook failed with ${discordResponse.status}: ${responseText.slice(0, 300)}`,
      );
      return jsonResponse({ error: 'Discord notification failed.' }, 502);
    }

    return jsonResponse({ sent: true, skipped: false });
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return jsonResponse({ error: 'Internal server error.' }, 500);
  }
});

function buildExpenseCreatedMessage({
  expense,
  payer,
  targets,
}: {
  expense: ExpenseRecord;
  payer: RoomMemberRecord | null;
  targets: ExpenseTargetRecord[];
}) {
  const targetNames = targets
    .map((target) => target.display_name || target.email)
    .filter((name): name is string => Boolean(name));
  const beneficiary =
    expense.expense_type === 'common'
      ? '参加者全員'
      : targetNames.length > 0
        ? targetNames.join('、')
        : '未設定';

  return [
    `・誰が？ ${payer?.display_name || payer?.email || '未設定'}`,
    `・誰の分？ ${beneficiary}`,
    `・なにを？ ${expense.description}`,
    `・金額 ${new Intl.NumberFormat('ja-JP').format(expense.amount)}円`,
  ]
    .join('\n')
    .slice(0, 2000);
}

function buildExpenseRejectedMessage({
  expense,
  payer,
  roomName,
}: {
  expense: ExpenseRecord;
  payer: RoomMemberRecord | null;
  roomName: string;
}) {
  return [
    '【支出差し戻し】',
    `room: ${roomName}`,
    `支払者: ${payer?.display_name || payer?.email || '未設定'}`,
    `金額: ${new Intl.NumberFormat('ja-JP').format(expense.amount)}円`,
    `内容: ${expense.description}`,
    `理由: ${expense.rejection_reason || '理由未設定'}`,
  ]
    .join('\n')
    .slice(0, 2000);
}

async function postDiscordMessage({
  content,
  receiptImageUrl,
  webhookUrl,
}: {
  content: string;
  receiptImageUrl: string | null;
  webhookUrl: string;
}) {
  const payload = {
    allowed_mentions: { parse: [] },
    content,
  };

  if (!receiptImageUrl) {
    return fetch(webhookUrl, {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  }

  if (!isHttpUrl(receiptImageUrl)) {
    throw new Error('Receipt image URL is invalid.');
  }

  const receiptResponse = await fetch(receiptImageUrl);
  if (!receiptResponse.ok) {
    throw new Error(`Receipt download failed with ${receiptResponse.status}.`);
  }

  const receiptBlob = await receiptResponse.blob();
  if (receiptBlob.size > 10 * 1024 * 1024) {
    throw new Error('Receipt image exceeds Discord attachment size limit.');
  }

  const filename = `receipt.${extensionForContentType(receiptBlob.type)}`;
  const formData = new FormData();
  formData.append(
    'payload_json',
    JSON.stringify({
      ...payload,
      attachments: [
        {
          description: '支出に登録されたレシート画像',
          filename,
          id: 0,
        },
      ],
    }),
  );
  formData.append('files[0]', receiptBlob, filename);

  return fetch(webhookUrl, {
    body: formData,
    method: 'POST',
  });
}

function extensionForContentType(contentType: string) {
  switch (contentType.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

function getSupabaseKey(jsonName: string, legacyName: string) {
  const jsonValue = Deno.env.get(jsonName);
  if (jsonValue) {
    const keys = JSON.parse(jsonValue) as Record<string, string>;
    if (keys.default) return keys.default;
  }
  return requireEnvironmentVariable(legacyName);
}

function requireEnvironmentVariable(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}
