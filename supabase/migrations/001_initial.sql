create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  industry text,
  job_role text,
  is_admin boolean not null default false,
  xp integer not null default 0 check (xp >= 0),
  current_streak integer not null default 0 check (current_streak >= 0),
  last_session_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organisations (
 id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now()
);
create table if not exists public.organisation_members (
 organisation_id uuid references public.organisations(id) on delete cascade,
 user_id uuid references auth.users(id) on delete cascade,
 role text not null default 'member' check (role in ('member','admin','owner')),
 consent_individual_reporting boolean not null default false,
 created_at timestamptz not null default now(), primary key (organisation_id,user_id)
);
create table if not exists public.skills (
 id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, description text not null, category text not null default 'judgement', created_at timestamptz not null default now()
);
create table if not exists public.challenges (
 id uuid primary key default gen_random_uuid(), title text not null, prompt text not null, options jsonb not null check (jsonb_typeof(options)='array'), challenge_type text not null,
 difficulty integer not null check (difficulty between 1 and 100), is_diagnostic boolean not null default false, confidence_required boolean not null default true,
 industry text, is_published boolean not null default false, sort_order integer not null default 1000, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.challenge_answer_keys (
 challenge_id uuid primary key references public.challenges(id) on delete cascade, correct_index integer not null check(correct_index between 0 and 10),
 explanation text not null, thinking_principle text not null, application text not null, error_patterns jsonb not null default '{}'::jsonb
);
create table if not exists public.challenge_skill_mapping (
 challenge_id uuid references public.challenges(id) on delete cascade, skill_id uuid references public.skills(id) on delete cascade,
 weight numeric(4,2) not null default 1 check(weight>0 and weight<=2), primary key(challenge_id,skill_id)
);
create table if not exists public.user_responses (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, challenge_id uuid not null references public.challenges(id) on delete cascade,
 selected_index integer, is_correct boolean not null, confidence integer check(confidence between 0 and 100), response_time_ms integer check(response_time_ms>=0), error_pattern text,
 session_key text not null default 'training', created_at timestamptz not null default now(), unique(user_id,challenge_id,session_key)
);
create table if not exists public.user_skill_scores (
 user_id uuid references auth.users(id) on delete cascade, skill_id uuid references public.skills(id) on delete cascade,
 score numeric(5,1) not null default 50 check(score between 0 and 100), reliability numeric(4,2) not null default 0 check(reliability between 0 and 1), attempts integer not null default 0,
 last_seen_at timestamptz, updated_at timestamptz not null default now(), primary key(user_id,skill_id)
);
create table if not exists public.user_error_patterns (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade, pattern text not null, count integer not null default 1,
 last_seen_at timestamptz not null default now(), unique(user_id,pattern)
);
create table if not exists public.analytics_events (
 id bigint generated always as identity primary key, user_id uuid references auth.users(id) on delete set null, event_name text not null, properties jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.achievements (id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, description text not null, criteria jsonb not null default '{}'::jsonb);
create table if not exists public.user_achievements (user_id uuid references auth.users(id) on delete cascade, achievement_id uuid references public.achievements(id) on delete cascade, earned_at timestamptz not null default now(), primary key(user_id,achievement_id));
create table if not exists public.experiment_assignments (user_id uuid references auth.users(id) on delete cascade, experiment_key text not null, variant text not null, assigned_at timestamptz not null default now(), primary key(user_id,experiment_key));
create table if not exists public.ai_evaluations (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null, challenge_id uuid references public.challenges(id) on delete set null, model text, rubric jsonb, result jsonb, created_at timestamptz not null default now());

create index if not exists idx_responses_user_created on public.user_responses(user_id,created_at desc);
create index if not exists idx_events_name_created on public.analytics_events(event_name,created_at desc);
create index if not exists idx_challenges_published on public.challenges(is_published,is_diagnostic,sort_order);
create index if not exists idx_skill_scores_user on public.user_skill_scores(user_id,score);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict(id) do nothing;
 insert into public.user_skill_scores(user_id,skill_id,score,reliability,attempts) select new.id,id,50,0,0 from public.skills on conflict do nothing;
 insert into public.analytics_events(user_id,event_name) values(new.id,'account_created');
 return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
alter table public.skills enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_answer_keys enable row level security;
alter table public.challenge_skill_mapping enable row level security;
alter table public.user_responses enable row level security;
alter table public.user_skill_scores enable row level security;
alter table public.user_error_patterns enable row level security;
alter table public.analytics_events enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.experiment_assignments enable row level security;
alter table public.ai_evaluations enable row level security;

create policy "own profile read" on public.profiles for select to authenticated using(id=auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "skills readable" on public.skills for select to authenticated using(true);
create policy "published challenges readable" on public.challenges for select to authenticated using(is_published=true);
create policy "challenge mappings readable" on public.challenge_skill_mapping for select to authenticated using(true);
create policy "own responses readable" on public.user_responses for select to authenticated using(user_id=auth.uid());
create policy "own scores readable" on public.user_skill_scores for select to authenticated using(user_id=auth.uid());
create policy "own error patterns readable" on public.user_error_patterns for select to authenticated using(user_id=auth.uid());
create policy "own events insert" on public.analytics_events for insert to authenticated with check(user_id=auth.uid());
create policy "own events read" on public.analytics_events for select to authenticated using(user_id=auth.uid());
create policy "achievements readable" on public.achievements for select to authenticated using(true);
create policy "own achievements readable" on public.user_achievements for select to authenticated using(user_id=auth.uid());

-- Deliberately NO browser policy for challenge_answer_keys.
-- Service-role access is used only in server routes after authentication/admin checks.
