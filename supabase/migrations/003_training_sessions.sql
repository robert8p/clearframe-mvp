-- Cogni MVP migration 003
-- Persist daily training selections so sessions survive refreshes and can be audited.

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, session_date)
);

create table if not exists public.training_session_challenges (
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  position smallint not null check (position between 1 and 20),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  selection_reason text not null check (
    selection_reason in (
      'weakest_measured',
      'second_weakest_measured',
      'ai_verification',
      'spaced_reinforcement',
      'unassessed_exploration',
      'adaptive_variety',
      'fallback'
    )
  ),
  target_skill_id uuid references public.skills(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (session_id, position),
  unique (session_id, challenge_id)
);

create index if not exists idx_training_sessions_user_date
  on public.training_sessions(user_id, session_date desc);

create index if not exists idx_training_session_challenges_session
  on public.training_session_challenges(session_id, position);

alter table public.training_sessions enable row level security;
alter table public.training_session_challenges enable row level security;

-- Users may read their own assigned sessions, but session composition is written
-- only by trusted server-side code using the service role.
drop policy if exists "own training sessions readable" on public.training_sessions;
create policy "own training sessions readable"
  on public.training_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "own training session challenges readable" on public.training_session_challenges;
create policy "own training session challenges readable"
  on public.training_session_challenges
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.training_sessions s
      where s.id = training_session_challenges.session_id
        and s.user_id = auth.uid()
    )
  );
