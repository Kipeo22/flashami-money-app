import { getSupabaseClient } from '@/lib/supabase';

export type RoomMemberRole = 'admin' | 'member';
export type RoomMemberStatus = 'invited' | 'joined';

export type RoomRecord = {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
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

type CreateRoomInput = {
  description: string;
  endDate: string;
  memberEmails: string[];
  name: string;
  startDate: string;
};

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
    return 'room名を入力してください。';
  }

  if (!isValidIsoDate(input.startDate)) {
    return '開始日は YYYY-MM-DD 形式で入力してください。';
  }

  if (!isValidIsoDate(input.endDate)) {
    return '終了日は YYYY-MM-DD 形式で入力してください。';
  }

  if (input.startDate > input.endDate) {
    return '終了日は開始日以降にしてください。';
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
    throw error;
  }

  const user = data.user;
  const email = user?.email;
  if (!user?.id || !email) {
    throw new Error('roomを作成するにはログインが必要です。');
  }

  return { ...user, email };
}

export async function createRoomWithMembers(input: CreateRoomInput) {
  const validationError = validateRoomInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = getSupabaseClient();
  const user = await requireAuthenticatedUser();

  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .insert({
      name: input.name.trim(),
      description: input.description.trim() || null,
      start_date: input.startDate,
      end_date: input.endDate,
      created_by: user.id,
    })
    .select('id, name, description, start_date, end_date')
    .single<RoomRecord>();

  if (roomError) {
    throw roomError;
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
    throw membersError;
  }

  return room;
}

export async function fetchRoomById(roomId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('rooms')
    .select('id, name, description, start_date, end_date')
    .eq('id', roomId)
    .single<RoomRecord>();

  if (error) {
    throw error;
  }

  return data;
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
    throw error;
  }

  return data;
}
