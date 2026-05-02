-- TrustPitch — initial schema (2026-05-02)

create extension if not exists "pgcrypto";

-- profiles ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- sessions ---------------------------------------------------------------
create table if not exists public.pitch_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '제목 없는 피칭',
  status text not null default 'in_progress'
    check (status in ('in_progress','completed','aborted')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,

  trust_score numeric(5,2),
  visual_score numeric(5,2),
  audio_score numeric(5,2),
  content_score numeric(5,2),

  filler_count integer default 0,
  pace_cpm numeric(6,2),
  eye_contact_avg numeric(5,2),

  transcript text,
  metrics jsonb default '{}'::jsonb,
  llm_feedback jsonb default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_pitch_sessions_user
  on public.pitch_sessions(user_id, created_at desc);

-- timeline ---------------------------------------------------------------
create table if not exists public.pitch_timeline (
  id bigserial primary key,
  session_id uuid not null references public.pitch_sessions(id) on delete cascade,
  ts_ms integer not null,
  trust_score numeric(5,2),
  visual_score numeric(5,2),
  audio_score numeric(5,2),
  metrics jsonb default '{}'::jsonb
);
create index if not exists idx_pitch_timeline_session
  on public.pitch_timeline(session_id, ts_ms);

-- judge reactions --------------------------------------------------------
create table if not exists public.judge_reactions (
  id bigserial primary key,
  session_id uuid not null references public.pitch_sessions(id) on delete cascade,
  ts_ms integer not null,
  judge_id text not null
    check (judge_id in ('judge-fact','judge-connect','judge-critical')),
  expression text not null,
  comment text,
  trigger_metric text,
  trigger_value numeric
);
create index if not exists idx_judge_reactions_session
  on public.judge_reactions(session_id, ts_ms);

-- events (filler/empty/eye-drop/pitch-drop) ------------------------------
create table if not exists public.pitch_events (
  id bigserial primary key,
  session_id uuid not null references public.pitch_sessions(id) on delete cascade,
  ts_ms integer not null,
  event_type text not null,
  payload jsonb default '{}'::jsonb
);
create index if not exists idx_pitch_events_session
  on public.pitch_events(session_id, ts_ms);

-- RLS --------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.pitch_sessions enable row level security;
alter table public.pitch_timeline enable row level security;
alter table public.judge_reactions enable row level security;
alter table public.pitch_events enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "sessions_owner_all" on public.pitch_sessions;
create policy "sessions_owner_all" on public.pitch_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "timeline_owner" on public.pitch_timeline;
create policy "timeline_owner" on public.pitch_timeline
  for all using (
    exists (
      select 1 from public.pitch_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "judge_reactions_owner" on public.judge_reactions;
create policy "judge_reactions_owner" on public.judge_reactions
  for all using (
    exists (
      select 1 from public.pitch_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "pitch_events_owner" on public.pitch_events;
create policy "pitch_events_owner" on public.pitch_events
  for all using (
    exists (
      select 1 from public.pitch_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

-- profile auto-create on auth signup -------------------------------------
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
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'name', split_part(coalesce(new.email,'user'), '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
