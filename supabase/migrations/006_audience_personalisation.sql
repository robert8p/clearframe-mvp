-- Cogni v0.8.1 — safe audience-personalisation schema migration.
-- The v0.8.0 file bundled a very large prose seed payload that PostgreSQL
-- could misparse in the SQL editor. This replacement is deliberately small,
-- idempotent and contains no raw natural-language seed block.

begin;

create table if not exists public.audience_segments (
  slug text primary key,
  label text not null,
  description text not null,
  icon text not null default '🧠',
  complexity_anchor integer not null default 50 check (complexity_anchor between 1 and 100),
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.audience_segments(slug,label,description,icon,complexity_anchor,sort_order) values
('university_student','University student','Academic and everyday judgement in study and early independence.','🎓',42,1),
('graduate_early_career','Graduate / early career','Early-career workplace judgement, evidence and recommendations.','🚀',48,2),
('junior_professional','Junior professional','Professional judgement across analysis, recommendations and stakeholder decisions.','💼',54,3),
('management','Management','Management judgement across people, resources, risk and second-order effects.','🧭',61,4),
('executive','Executive','Strategic judgement under uncertainty, high stakes and system-level trade-offs.','♟',68,5)
on conflict(slug) do update set
 label=excluded.label, description=excluded.description, icon=excluded.icon,
 complexity_anchor=excluded.complexity_anchor, sort_order=excluded.sort_order, is_active=true;

alter table public.profiles add column if not exists audience_segment text references public.audience_segments(slug) on update cascade on delete set null;
alter table public.challenges add column if not exists audience_segments text[] not null default array['all']::text[];
alter table public.challenges add column if not exists scenario_context text;
alter table public.daily_lessons add column if not exists audience_segments text[] not null default array['all']::text[];
alter table public.daily_lessons add column if not exists difficulty integer not null default 50 check (difficulty between 1 and 100);
alter table public.daily_lessons add column if not exists scenario_context text;

update public.challenges set audience_segments=array['all']::text[] where audience_segments is null or cardinality(audience_segments)=0;
update public.daily_lessons set audience_segments=array['all']::text[] where audience_segments is null or cardinality(audience_segments)=0;

create index if not exists idx_challenges_audience_segments on public.challenges using gin(audience_segments);
create index if not exists idx_lessons_audience_segments on public.daily_lessons using gin(audience_segments);
create index if not exists idx_profiles_audience_segment on public.profiles(audience_segment);

create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.practice_session_challenges (
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  position integer not null check(position between 1 and 20),
  primary key(session_id,position),
  unique(session_id,challenge_id)
);

alter table public.practice_sessions enable row level security;
alter table public.practice_session_challenges enable row level security;
alter table public.audience_segments enable row level security;

drop policy if exists "own practice sessions read" on public.practice_sessions;
create policy "own practice sessions read" on public.practice_sessions for select to authenticated using(user_id=auth.uid());
drop policy if exists "own practice assignments read" on public.practice_session_challenges;
create policy "own practice assignments read" on public.practice_session_challenges for select to authenticated using(exists(select 1 from public.practice_sessions ps where ps.id=practice_session_challenges.session_id and ps.user_id=auth.uid()));
drop policy if exists "audience segments readable" on public.audience_segments;
create policy "audience segments readable" on public.audience_segments for select to authenticated using(is_active=true);

create index if not exists idx_practice_sessions_user_skill on public.practice_sessions(user_id,skill_id,created_at desc);
create index if not exists idx_practice_assignments_session on public.practice_session_challenges(session_id,position);

-- Audience-specific content is seeded through the controlled Cogni content
-- loader rather than embedded as free-form prose in this schema migration.
-- Existing universal content remains valid because audience_segments defaults
-- to ['all'].

commit;
