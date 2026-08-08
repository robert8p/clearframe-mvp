create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  reaction text not null check (reaction in ('not_for_me','good','great')),
  comment text check (comment is null or char_length(comment) <= 1000),
  audience_segment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, session_id)
);

alter table public.session_feedback enable row level security;

drop policy if exists "own session feedback read" on public.session_feedback;
create policy "own session feedback read" on public.session_feedback
for select to authenticated using (user_id = auth.uid());

drop policy if exists "own session feedback insert" on public.session_feedback;
create policy "own session feedback insert" on public.session_feedback
for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "own session feedback update" on public.session_feedback;
create policy "own session feedback update" on public.session_feedback
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists idx_session_feedback_created_at on public.session_feedback(created_at desc);
create index if not exists idx_session_feedback_reaction on public.session_feedback(reaction, created_at desc);
create index if not exists idx_analytics_events_event_created on public.analytics_events(event_name, created_at desc);
create index if not exists idx_analytics_events_user_created on public.analytics_events(user_id, created_at desc);
