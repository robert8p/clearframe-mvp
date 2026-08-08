-- Cogni MVP migration 004
-- Preserve the exact skill movement caused by each response so session summaries
-- can report evidence-backed changes rather than reconstructing them later.

alter table public.user_responses
  add column if not exists xp_awarded integer check (xp_awarded is null or xp_awarded >= 0);

-- Backfill historical responses using the scoring rule in force before this migration.
update public.user_responses
set xp_awarded = case when is_correct then 12 else 7 end
where xp_awarded is null;

create table if not exists public.user_response_skill_updates (
  response_id uuid not null references public.user_responses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  score_before numeric(5,1) not null check (score_before between 0 and 100),
  score_after numeric(5,1) not null check (score_after between 0 and 100),
  reliability_before numeric(4,2) not null check (reliability_before between 0 and 1),
  reliability_after numeric(4,2) not null check (reliability_after between 0 and 1),
  attempts_before integer not null check (attempts_before >= 0),
  attempts_after integer not null check (attempts_after >= 0),
  weight numeric(4,2) not null default 1 check (weight > 0 and weight <= 2),
  created_at timestamptz not null default now(),
  primary key (response_id, skill_id)
);

create index if not exists idx_response_skill_updates_user_created
  on public.user_response_skill_updates(user_id, created_at desc);

create index if not exists idx_response_skill_updates_skill
  on public.user_response_skill_updates(user_id, skill_id, created_at desc);

alter table public.user_response_skill_updates enable row level security;

drop policy if exists "own response skill updates readable" on public.user_response_skill_updates;
create policy "own response skill updates readable"
  on public.user_response_skill_updates
  for select
  to authenticated
  using (user_id = auth.uid());

-- Writes remain server-side only via the service role.
