-- SoulSpace relational schema for invite-only two-member private spaces.
create extension if not exists pgcrypto;

create type public.space_status as enum ('active', 'disabled');
create type public.message_kind as enum ('text', 'image', 'video', 'document', 'pdf', 'voice', 'gif', 'sticker');
create type public.message_status as enum ('sent', 'delivered', 'read');
create type public.call_type as enum ('voice', 'video');
create type public.call_status as enum ('ringing', 'accepted', 'rejected', 'ended', 'missed', 'reconnecting');
create type public.notification_kind as enum ('message', 'voice_call', 'video_call', 'missed_call', 'media');

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_email text not null,
  status public.space_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  storage_usage_bytes bigint not null default 0,
  constraint spaces_name_not_blank check (length(trim(name)) > 0)
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  display_name text not null,
  secret_code_hash text not null,
  profile_photo_path text,
  bio text not null default '',
  online boolean not null default false,
  presence_state text not null default 'offline',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  unique (space_id, display_name),
  constraint members_name_not_blank check (length(trim(display_name)) > 0)
);

create unique index exactly_two_member_slot_one on public.members(space_id, id);

create or replace function public.enforce_two_members_per_space()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.members where space_id = new.space_id) >= 2 then
    raise exception 'SoulSpace spaces can contain exactly two members only';
  end if;
  return new;
end;
$$;

create trigger members_two_member_limit
before insert on public.members
for each row execute function public.enforce_two_members_per_space();

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  device_label text,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  sender_id uuid not null references public.members(id) on delete cascade,
  kind public.message_kind not null default 'text',
  body text not null default '',
  status public.message_status not null default 'sent',
  reply_to uuid references public.messages(id) on delete set null,
  pinned boolean not null default false,
  starred boolean not null default false,
  deleted_for_everyone boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  uploader_id uuid not null references public.members(id) on delete cascade,
  kind public.message_kind not null,
  bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  byte_size bigint not null default 0,
  created_at timestamptz not null default now()
);

create table public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  storage_path text not null,
  duration_seconds integer not null default 0,
  waveform jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  caller_id uuid not null references public.members(id) on delete cascade,
  receiver_id uuid not null references public.members(id) on delete cascade,
  type public.call_type not null,
  status public.call_status not null default 'ringing',
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  reconnect_count integer not null default 0
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  member_id uuid references public.members(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  theme jsonb not null default '{"mode":"premium-dark","accent":"deep-purple"}'::jsonb,
  notifications jsonb not null default '{"messages":true,"calls":true,"media":true}'::jsonb,
  storage jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(space_id, member_id)
);

create table public.backups (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces(id) on delete cascade,
  created_by text not null,
  storage_path text not null,
  byte_size bigint not null default 0,
  checksum text,
  created_at timestamptz not null default now(),
  restored_at timestamptz,
  deleted_at timestamptz
);

create index messages_space_created_at_idx on public.messages(space_id, created_at desc);
create index media_space_created_at_idx on public.media(space_id, created_at desc);
create index calls_space_started_at_idx on public.calls(space_id, started_at desc);
create index notifications_member_created_at_idx on public.notifications(member_id, created_at desc);

alter table public.spaces enable row level security;
alter table public.members enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.media enable row level security;
alter table public.voice_notes enable row level security;
alter table public.calls enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;
alter table public.backups enable row level security;

-- Production deployments should add policies that map authenticated application sessions
-- to exactly one member and one space. Admin-only service-role access is required for
-- creating spaces, resetting secret codes, reading backups, and deleting space data.
