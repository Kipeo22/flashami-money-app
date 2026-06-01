create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  start_date date,
  end_date date,
  created_by uuid references auth.users(id),
  discord_webhook_url text,
  spreadsheet_id text,
  created_at timestamp with time zone not null default now(),
  constraint rooms_date_order check (
    start_date is null
    or end_date is null
    or start_date <= end_date
  )
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id),
  display_name text,
  role text not null default 'member',
  status text not null default 'invited',
  created_at timestamp with time zone not null default now(),
  constraint room_members_role_check check (role in ('admin', 'member')),
  constraint room_members_status_check check (status in ('invited', 'joined'))
);

create unique index if not exists room_members_room_lower_email_key
  on public.room_members (room_id, lower(email));

create index if not exists room_members_user_id_idx
  on public.room_members (user_id);

create index if not exists room_members_lower_email_idx
  on public.room_members (lower(email));

create index if not exists rooms_created_by_idx
  on public.rooms (created_by);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  payer_id uuid references auth.users(id),
  expense_type text not null,
  amount integer not null,
  category text not null,
  description text not null,
  paid_at date not null,
  receipt_image_url text,
  no_receipt_reason text,
  no_receipt_note text,
  split_type text,
  status text not null default 'pending',
  created_by uuid references auth.users(id),
  created_at timestamp with time zone not null default now(),
  constraint expenses_amount_positive check (amount > 0),
  constraint expenses_type_check check (expense_type in ('common', 'personal')),
  constraint expenses_split_type_check check (
    split_type is null
    or split_type in ('equal', 'custom')
  ),
  constraint expenses_status_check check (
    status in ('pending', 'approved', 'rejected', 'settled')
  ),
  constraint expenses_receipt_or_reason_check check (
    receipt_image_url is not null
    or (no_receipt_reason is not null and no_receipt_note is not null)
  )
);

create index if not exists expenses_room_id_idx
  on public.expenses (room_id);

create index if not exists expenses_created_by_idx
  on public.expenses (created_by);

create table if not exists public.expense_targets (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid references auth.users(id),
  email text,
  display_name text,
  amount_share integer,
  constraint expense_targets_identity_check check (
    user_id is not null
    or email is not null
  ),
  constraint expense_targets_amount_share_check check (
    amount_share is null
    or amount_share >= 0
  )
);

create index if not exists expense_targets_expense_id_idx
  on public.expense_targets (expense_id);

create or replace function public.set_updated_room_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is not null and new.status = 'invited' then
    new.status = 'joined';
  end if;

  return new;
end;
$$;

drop trigger if exists room_members_mark_joined on public.room_members;
create trigger room_members_mark_joined
before update on public.room_members
for each row
execute function public.set_updated_room_membership();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    nullif(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.claim_my_room_memberships(
  profile_display_name text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.room_members
  set user_id = auth.uid(),
      status = 'joined',
      display_name = coalesce(nullif(profile_display_name, ''), display_name)
  where user_id is null
    and lower(email) = lower(auth.jwt() ->> 'email');
end;
$$;

grant execute on function public.claim_my_room_memberships(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_targets enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid() and lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "rooms_select_member_rooms" on public.rooms;
create policy "rooms_select_member_rooms"
on public.rooms
for select
to authenticated
using (
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = rooms.id
      and (
        rm.user_id = auth.uid()
        or lower(rm.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

drop policy if exists "room_members_select_self" on public.room_members;
create policy "room_members_select_self"
on public.room_members
for select
to authenticated
using (
  user_id = auth.uid()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "room_members_claim_invite" on public.room_members;
create policy "room_members_claim_invite"
on public.room_members
for update
to authenticated
using (
  user_id is null
  and lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  user_id = auth.uid()
  and lower(email) = lower(auth.jwt() ->> 'email')
  and status = 'joined'
);

drop policy if exists "expenses_select_member_room" on public.expenses;
create policy "expenses_select_member_room"
on public.expenses
for select
to authenticated
using (
  exists (
    select 1
    from public.room_members rm
    where rm.room_id = expenses.room_id
      and (
        rm.user_id = auth.uid()
        or lower(rm.email) = lower(auth.jwt() ->> 'email')
      )
  )
);

drop policy if exists "expense_targets_select_member_room" on public.expense_targets;
create policy "expense_targets_select_member_room"
on public.expense_targets
for select
to authenticated
using (
  exists (
    select 1
    from public.expenses e
    join public.room_members rm on rm.room_id = e.room_id
    where e.id = expense_targets.expense_id
      and (
        rm.user_id = auth.uid()
        or lower(rm.email) = lower(auth.jwt() ->> 'email')
      )
  )
);
