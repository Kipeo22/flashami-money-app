import { getSupabaseClient } from '@/lib/supabase';

export type RoomMemberRole = 'admin' | 'member';
export type RoomMemberStatus = 'invited' | 'joined';

export type RoomRecord = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  expense_registration_start_date: string | null;
  expense_registration_end_date: string | null;
};

export type RoomMemberRecord = {
  id: string;
  room_id: string;
  email: string;
  user_id: string | null;
  display_name: string | null;
  role: RoomMemberRole;
  status: RoomMemberStatus;
};

export type UserRoomRecord = RoomRecord & {
  approved_expense_total_amount: number;
  expense_count: number;
  expense_total_amount: number;
  member_role: RoomMemberRole;
  member_status: RoomMemberStatus;
  pending_expense_count: number;
  rejected_expense_count: number;
};

type CreateRoomInput = {
  description: string;
  endDate: string;
  expenseRegistrationEndDate: string;
  expenseRegistrationStartDate: string;
  memberEmails: string[];
  name: string;
  startDate: string;
};

const ROOM_SELECT =
  'id, name, description, start_date, end_date, expense_registration_start_date, expense_registration_end_date';
const LEGACY_ROOM_SELECT = 'id, name, description, start_date, end_date';
type LegacyRoomRecord = Omit<
  RoomRecord,
  'expense_registration_end_date' | 'expense_registration_start_date'
>;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function dedupeMemberEmails(emails: string[], currentUserEmail: string) {
  const normalizedCurrentUserEmail = normalizeEmail(currentUserEmail);
  const uniqueEmails = new Set<string>();

  for (const email of emails) {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || normalizedEmail === normalizedCurrentUserEmail) {
      continue;
    }

    uniqueEmails.add(normalizedEmail);
  }

  return Array.from(uniqueEmails);
}

export function validateRoomInput(input: CreateRoomInput) {
  if (!input.name.trim()) {
    return 'イベント名を入力してください。';
  }

  if (input.startDate && !isValidIsoDate(input.startDate)) {
    return '開始日は YYYY-MM-DD 形式で入力してください。';
  }

  if (input.endDate && !isValidIsoDate(input.endDate)) {
    return '終了日は YYYY-MM-DD 形式で入力してください。';
  }

  if (input.startDate && input.endDate && input.startDate > input.endDate) {
    return '終了日は開始日以降にしてください。';
  }

  const registrationError = validateExpenseRegistrationPeriod(
    input.expenseRegistrationStartDate,
    input.expenseRegistrationEndDate,
  );
  if (registrationError) {
    return registrationError;
  }

  const invalidEmail = input.memberEmails.find((email) => !isValidEmail(email));
  if (invalidEmail) {
    return `参加者メールアドレスが不正です: ${invalidEmail}`;
  }

  return null;
}

export async function requireAuthenticatedUser() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(
      'ログイン状態を確認できませんでした。もう一度ログインしてください。',
    );
  }

  const user = data.user;
  const email = user?.email;
  if (!user?.id || !email) {
    throw new Error('ログインが必要です。');
  }

  return { ...user, email };
}

export function formatSupabaseError(error: unknown) {
  const errorRecord =
    error && typeof error === 'object'
      ? (error as Record<string, unknown>)
      : null;
  const message =
    error instanceof Error
      ? error.message
      : typeof errorRecord?.message === 'string'
        ? errorRecord.message
        : null;

  const code = typeof errorRecord?.code === 'string' ? errorRecord.code : null;
  const normalizedMessage = message?.toLowerCase() ?? '';

  if (
    code === '42501' ||
    normalizedMessage.includes('row-level security') ||
    normalizedMessage.includes('permission denied')
  ) {
    return 'この操作を行う権限がありません。';
  }

  if (code === '23505') {
    return '同じ内容がすでに登録されています。';
  }

  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('network') ||
    normalizedMessage.includes('timeout')
  ) {
    return '通信に失敗しました。通信環境を確認して、もう一度お試しください。';
  }

  return '処理に失敗しました。時間をおいてもう一度お試しください。';
}

export async function createRoomWithMembers(input: CreateRoomInput) {
  const validationError = validateRoomInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const roomResult = await supabase
    .from('rooms')
    .insert({
      name: input.name.trim(),
      description: input.description.trim() || null,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      expense_registration_start_date:
        input.expenseRegistrationStartDate || null,
      expense_registration_end_date: input.expenseRegistrationEndDate || null,
      created_by: user.id,
    })
    .select(ROOM_SELECT)
    .single<RoomRecord>();

  let room = roomResult.data;
  let roomError = roomResult.error;
  if (roomError && isMissingExpenseRegistrationColumnsError(roomError)) {
    if (
      input.expenseRegistrationStartDate ||
      input.expenseRegistrationEndDate
    ) {
      throw new Error(expenseRegistrationMigrationMessage);
    }

    const legacyResult = await supabase
      .from('rooms')
      .insert({
        name: input.name.trim(),
        description: input.description.trim() || null,
        start_date: input.startDate || null,
        end_date: input.endDate || null,
        created_by: user.id,
      })
      .select(LEGACY_ROOM_SELECT)
      .single<LegacyRoomRecord>();
    room = legacyResult.data
      ? withExpenseRegistrationDefaults(legacyResult.data)
      : null;
    roomError = legacyResult.error;
  }

  if (roomError || !room) {
    throw new Error(formatSupabaseError(roomError));
  }

  const memberEmails = dedupeMemberEmails(input.memberEmails, user.email);
  const adminDisplayName =
    typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name
      : typeof user.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : null;

  const membersToInsert = [
    {
      room_id: room.id,
      email: normalizeEmail(user.email),
      user_id: user.id,
      display_name: adminDisplayName,
      role: 'admin' as const,
      status: 'joined' as const,
    },
    ...memberEmails.map((email) => ({
      room_id: room.id,
      email,
      user_id: null,
      display_name: null,
      role: 'member' as const,
      status: 'invited' as const,
    })),
  ];

  const { error: membersError } = await supabase
    .from('room_members')
    .insert(membersToInsert);

  if (membersError) {
    await supabase.from('rooms').delete().eq('id', room.id);
    throw new Error(formatSupabaseError(membersError));
  }

  return room;
}

export async function ensureCurrentUserRoomMembership(roomId: string) {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();
  const email = normalizeEmail(user.email);

  const { data: memberships, error: membershipsError } = await supabase
    .from('room_members')
    .select('id, room_id, email, user_id, display_name, role, status')
    .eq('room_id', roomId)
    .eq('email', email)
    .returns<RoomMemberRecord[]>();

  if (membershipsError) {
    throw new Error(formatSupabaseError(membershipsError));
  }

  const membership = memberships[0];
  if (!membership) {
    throw new Error('このイベントの参加者として登録されていません。');
  }

  if (membership.user_id === user.id && membership.status === 'joined') {
    return membership;
  }

  const { data: updatedMembership, error: updateError } = await supabase
    .from('room_members')
    .update({
      user_id: user.id,
      status: 'joined',
    })
    .eq('id', membership.id)
    .select('id, room_id, email, user_id, display_name, role, status')
    .single<RoomMemberRecord>();

  if (updateError) {
    throw new Error(formatSupabaseError(updateError));
  }

  return updatedMembership;
}

export async function requireCurrentUserRoomAdmin(roomId: string) {
  const membership = await ensureCurrentUserRoomMembership(roomId);

  if (membership.role !== 'admin') {
    throw new Error('この操作を行えるのは運営権限があるメンバーのみです。');
  }

  return membership;
}

export async function inviteRoomMember(roomId: string, email: string) {
  await requireCurrentUserRoomAdmin(roomId);
  const normalizedEmail = normalizeEmail(email);
  if (!isValidEmail(normalizedEmail)) {
    throw new Error('正しいメールアドレスを入力してください。');
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase.from('room_members').insert({
    room_id: roomId,
    email: normalizedEmail,
    user_id: null,
    display_name: null,
    role: 'member',
    status: 'invited',
  });

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return fetchRoomMembers(roomId);
}

export async function fetchCurrentUserRooms() {
  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();
  const email = normalizeEmail(user.email);

  const { error: joinError } = await supabase
    .from('room_members')
    .update({
      user_id: user.id,
      status: 'joined',
    })
    .eq('email', email)
    .is('user_id', null);

  if (joinError) {
    throw new Error(formatSupabaseError(joinError));
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from('room_members')
    .select('room_id, role, status')
    .eq('email', email)
    .returns<Pick<RoomMemberRecord, 'room_id' | 'role' | 'status'>[]>();

  if (membershipsError) {
    throw new Error(formatSupabaseError(membershipsError));
  }

  if (memberships.length === 0) {
    return [];
  }

  const roomIds = memberships.map((membership) => membership.room_id);
  const membershipByRoomId = new Map(
    memberships.map((membership) => [membership.room_id, membership]),
  );

  const rooms = await fetchRoomsByIds(roomIds);

  const { data: expenses, error: expensesError } = await supabase
    .from('expenses')
    .select('room_id, amount, status')
    .in('room_id', roomIds)
    .returns<
      {
        amount: number;
        room_id: string;
        status: 'approved' | 'pending' | 'rejected' | 'settled';
      }[]
    >();

  if (expensesError) {
    throw new Error(formatSupabaseError(expensesError));
  }

  const expenseCountByRoomId = new Map<string, number>();
  const expenseTotalByRoomId = new Map<string, number>();
  const approvedExpenseTotalByRoomId = new Map<string, number>();
  const pendingExpenseCountByRoomId = new Map<string, number>();
  const rejectedExpenseCountByRoomId = new Map<string, number>();

  for (const expense of expenses) {
    expenseCountByRoomId.set(
      expense.room_id,
      (expenseCountByRoomId.get(expense.room_id) ?? 0) + 1,
    );
    expenseTotalByRoomId.set(
      expense.room_id,
      (expenseTotalByRoomId.get(expense.room_id) ?? 0) + expense.amount,
    );

    if (expense.status === 'approved' || expense.status === 'settled') {
      approvedExpenseTotalByRoomId.set(
        expense.room_id,
        (approvedExpenseTotalByRoomId.get(expense.room_id) ?? 0) +
          expense.amount,
      );
    }

    if (expense.status === 'pending') {
      pendingExpenseCountByRoomId.set(
        expense.room_id,
        (pendingExpenseCountByRoomId.get(expense.room_id) ?? 0) + 1,
      );
    }

    if (expense.status === 'rejected') {
      rejectedExpenseCountByRoomId.set(
        expense.room_id,
        (rejectedExpenseCountByRoomId.get(expense.room_id) ?? 0) + 1,
      );
    }
  }

  return rooms
    .map((room) => {
      const membership = membershipByRoomId.get(room.id);

      return {
        ...room,
        approved_expense_total_amount:
          approvedExpenseTotalByRoomId.get(room.id) ?? 0,
        expense_count: expenseCountByRoomId.get(room.id) ?? 0,
        expense_total_amount: expenseTotalByRoomId.get(room.id) ?? 0,
        member_role: membership?.role ?? 'member',
        member_status: membership?.status ?? 'invited',
        pending_expense_count: pendingExpenseCountByRoomId.get(room.id) ?? 0,
        rejected_expense_count: rejectedExpenseCountByRoomId.get(room.id) ?? 0,
      } satisfies UserRoomRecord;
    })
    .sort((firstRoom, secondRoom) =>
      firstRoom.start_date && secondRoom.start_date
        ? firstRoom.start_date.localeCompare(secondRoom.start_date)
        : firstRoom.name.localeCompare(secondRoom.name),
    );
}

export async function fetchRoomById(roomId: string) {
  const supabase = getSupabaseClient();
  const result = await supabase
    .from('rooms')
    .select(ROOM_SELECT)
    .eq('id', roomId)
    .single<RoomRecord>();

  if (!result.error && result.data) {
    return result.data;
  }

  if (isMissingExpenseRegistrationColumnsError(result.error)) {
    const legacyResult = await supabase
      .from('rooms')
      .select(LEGACY_ROOM_SELECT)
      .eq('id', roomId)
      .single<LegacyRoomRecord>();
    if (legacyResult.error || !legacyResult.data) {
      throw new Error(formatSupabaseError(legacyResult.error));
    }
    return withExpenseRegistrationDefaults(legacyResult.data);
  }

  throw new Error(formatSupabaseError(result.error));
}

export function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isRoomActiveOnDate(room: RoomRecord, date: string) {
  if (!room.start_date && !room.end_date) {
    return false;
  }

  return (
    (!room.start_date || room.start_date <= date) &&
    (!room.end_date || room.end_date >= date)
  );
}

export function isExpenseRegistrationOpen(
  room: RoomRecord,
  date = getLocalIsoDate(),
) {
  return (
    (!room.expense_registration_start_date ||
      room.expense_registration_start_date <= date) &&
    (!room.expense_registration_end_date ||
      room.expense_registration_end_date >= date)
  );
}

export function validateExpenseRegistrationPeriod(
  startDate: string,
  endDate: string,
) {
  if (startDate && !isValidIsoDate(startDate)) {
    return '支出登録の開始日は YYYY-MM-DD 形式で入力してください。';
  }

  if (endDate && !isValidIsoDate(endDate)) {
    return '支出登録の終了日は YYYY-MM-DD 形式で入力してください。';
  }

  if (startDate && endDate && startDate > endDate) {
    return '支出登録の終了日は開始日以降にしてください。';
  }

  return null;
}

export async function updateRoomExpenseRegistrationPeriod({
  endDate,
  roomId,
  startDate,
}: {
  endDate: string;
  roomId: string;
  startDate: string;
}) {
  const validationError = validateExpenseRegistrationPeriod(startDate, endDate);
  if (validationError) {
    throw new Error(validationError);
  }

  await requireCurrentUserRoomAdmin(roomId);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('rooms')
    .update({
      expense_registration_start_date: startDate || null,
      expense_registration_end_date: endDate || null,
    })
    .eq('id', roomId)
    .select(ROOM_SELECT)
    .single<RoomRecord>();

  if (error) {
    if (isMissingExpenseRegistrationColumnsError(error)) {
      throw new Error(expenseRegistrationMigrationMessage);
    }
    throw new Error(formatSupabaseError(error));
  }

  return data;
}

export async function ensureExpenseRegistrationOpen(roomId: string) {
  const room = await fetchRoomById(roomId);
  if (!isExpenseRegistrationOpen(room)) {
    throw new Error('このイベントは現在、支出登録期間外です。');
  }
  return room;
}

const expenseRegistrationMigrationMessage =
  '支出登録期間機能の準備が完了していません。運営者にお問い合わせください。';

function isMissingExpenseRegistrationColumnsError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const message = typeof record.message === 'string' ? record.message : '';
  return (
    (record.code === '42703' || record.code === 'PGRST204') &&
    message.includes('expense_registration_')
  );
}

function withExpenseRegistrationDefaults(room: LegacyRoomRecord): RoomRecord {
  return {
    ...room,
    expense_registration_end_date: null,
    expense_registration_start_date: null,
  };
}

async function fetchRoomsByIds(roomIds: string[]) {
  const supabase = getSupabaseClient();
  const result = await supabase
    .from('rooms')
    .select(ROOM_SELECT)
    .in('id', roomIds)
    .returns<RoomRecord[]>();

  if (!result.error) {
    return result.data;
  }

  if (isMissingExpenseRegistrationColumnsError(result.error)) {
    const legacyResult = await supabase
      .from('rooms')
      .select(LEGACY_ROOM_SELECT)
      .in('id', roomIds)
      .returns<LegacyRoomRecord[]>();
    if (legacyResult.error) {
      throw new Error(formatSupabaseError(legacyResult.error));
    }
    return legacyResult.data.map(withExpenseRegistrationDefaults);
  }

  throw new Error(formatSupabaseError(result.error));
}

export async function fetchRoomMembers(roomId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('room_members')
    .select('id, room_id, email, user_id, display_name, role, status')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .returns<RoomMemberRecord[]>();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return data;
}
