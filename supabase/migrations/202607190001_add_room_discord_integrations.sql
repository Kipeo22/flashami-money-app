create table if not exists public.room_discord_integrations (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  webhook_url text not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint room_discord_integrations_webhook_url_check check (
    webhook_url ~ '^https://(canary\.|ptb\.)?discord(app)?\.com/api/(v[0-9]+/)?webhooks/[0-9]+/[A-Za-z0-9._-]+$'
  )
);

comment on table public.room_discord_integrations is
  'Discord incoming webhook configuration. Kept separate from rooms so members cannot read webhook tokens.';

alter table public.room_discord_integrations enable row level security;

revoke all on table public.room_discord_integrations from anon;
revoke all on table public.room_discord_integrations from authenticated;
grant select, insert, update, delete on table public.room_discord_integrations to authenticated;
grant all on table public.room_discord_integrations to service_role;

drop policy if exists "Room admins can read Discord integration" on public.room_discord_integrations;
create policy "Room admins can read Discord integration"
on public.room_discord_integrations
for select
to authenticated
using (
  exists (
    select 1
    from public.room_members
    where room_members.room_id = room_discord_integrations.room_id
      and room_members.user_id = auth.uid()
      and room_members.role = 'admin'
      and room_members.status = 'joined'
  )
);

drop policy if exists "Room admins can create Discord integration" on public.room_discord_integrations;
create policy "Room admins can create Discord integration"
on public.room_discord_integrations
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.room_members
    where room_members.room_id = room_discord_integrations.room_id
      and room_members.user_id = auth.uid()
      and room_members.role = 'admin'
      and room_members.status = 'joined'
  )
);

drop policy if exists "Room admins can update Discord integration" on public.room_discord_integrations;
create policy "Room admins can update Discord integration"
on public.room_discord_integrations
for update
to authenticated
using (
  exists (
    select 1
    from public.room_members
    where room_members.room_id = room_discord_integrations.room_id
      and room_members.user_id = auth.uid()
      and room_members.role = 'admin'
      and room_members.status = 'joined'
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.room_members
    where room_members.room_id = room_discord_integrations.room_id
      and room_members.user_id = auth.uid()
      and room_members.role = 'admin'
      and room_members.status = 'joined'
  )
);

drop policy if exists "Room admins can delete Discord integration" on public.room_discord_integrations;
create policy "Room admins can delete Discord integration"
on public.room_discord_integrations
for delete
to authenticated
using (
  exists (
    select 1
    from public.room_members
    where room_members.room_id = room_discord_integrations.room_id
      and room_members.user_id = auth.uid()
      and room_members.role = 'admin'
      and room_members.status = 'joined'
  )
);
