-- Chat transcripts schema and RLS
-- Run manually in Supabase SQL editor or via migration tooling.

-- Extensions (if not enabled)
create extension if not exists pgcrypto;

-- Sessions
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  space_id uuid, -- nullable: if null, user-scoped session
  user_id uuid,  -- creator/owner; may be null for system-created sessions
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  tags jsonb not null default '{}'::jsonb
);

-- Messages
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Model invocations
create table if not exists model_invocations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references chat_sessions(id) on delete set null,
  message_id uuid references chat_messages(id) on delete set null,
  provider text not null,
  model text not null,
  params jsonb not null default '{}'::jsonb,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  success boolean,
  error jsonb,
  created_at timestamptz not null default now()
);

-- Indices
create index if not exists idx_chat_sessions_started on chat_sessions(started_at desc);
create index if not exists idx_chat_sessions_space on chat_sessions(space_id);
create index if not exists idx_chat_sessions_user on chat_sessions(user_id);
create index if not exists idx_chat_messages_session_created on chat_messages(session_id, created_at asc);
create index if not exists idx_model_invocations_session_created on model_invocations(session_id, created_at asc);

-- RLS
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table model_invocations enable row level security;

-- User-scoped access only (no space membership yet)
create policy chat_sessions_select_user on chat_sessions
  for select using (
    user_id = auth.uid()
  );

create policy chat_sessions_insert_user on chat_sessions
  for insert with check (
    user_id = auth.uid()
  );

create policy chat_messages_select_user on chat_messages
  for select using (
    exists (
      select 1 from chat_sessions s
      where s.id = chat_messages.session_id
        and s.user_id = auth.uid()
    )
  );

create policy chat_messages_insert_user on chat_messages
  for insert with check (
    exists (
      select 1 from chat_sessions s
      where s.id = chat_messages.session_id
        and s.user_id = auth.uid()
    )
  );

create policy model_invocations_select_user on model_invocations
  for select using (
    session_id is null or exists (
      select 1 from chat_sessions s
      where s.id = model_invocations.session_id
        and s.user_id = auth.uid()
    )
  );

create policy model_invocations_insert_user on model_invocations
  for insert with check (
    session_id is null or exists (
      select 1 from chat_sessions s
      where s.id = model_invocations.session_id
        and s.user_id = auth.uid()
    )
  );


