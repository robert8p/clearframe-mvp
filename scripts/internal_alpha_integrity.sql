-- Cogni internal-alpha production integrity audit
-- Read-only. Safe to run against the live Supabase database.

-- 1. Published content must be complete and internally consistent.
with published as (
  select * from public.challenges where is_published = true
), issues as (
  select 'published_without_answer_key' as check_name, count(*)::bigint as issue_count
  from published c
  left join public.challenge_answer_keys k on k.challenge_id = c.id
  where k.challenge_id is null

  union all
  select 'published_without_skill_mapping', count(*)::bigint
  from published c
  left join public.challenge_skill_mapping m on m.challenge_id = c.id
  where m.challenge_id is null

  union all
  select 'empty_prompt_or_title', count(*)::bigint
  from published
  where nullif(trim(prompt), '') is null or nullif(trim(title), '') is null

  union all
  select 'empty_options', count(*)::bigint
  from published
  where jsonb_typeof(options) <> 'array' or jsonb_array_length(options) = 0

  union all
  select 'invalid_single_choice_key', count(*)::bigint
  from published c
  join public.challenge_answer_keys k on k.challenge_id = c.id
  where coalesce(c.interaction_type, 'single_choice') in ('single_choice', 'triage')
    and (
      k.correct_index is null
      or k.correct_index < 0
      or k.correct_index >= case when jsonb_typeof(c.options) = 'array' then jsonb_array_length(c.options) else 0 end
    )

  union all
  select 'duplicate_published_prompt', coalesce(sum(cnt - 1), 0)::bigint
  from (
    select lower(trim(prompt)) as prompt_key, count(*) as cnt
    from published
    group by 1
    having count(*) > 1
  ) duplicates

  union all
  select 'published_missing_audience', count(*)::bigint
  from published
  where coalesce(array_length(audience_segments, 1), 0) = 0

  union all
  select 'published_invalid_complexity', count(*)::bigint
  from published
  where complexity_level is null or complexity_level < 1 or complexity_level > 100
)
select * from issues order by check_name;

-- 2. Every active audience should have meaningful content and format coverage.
with segments as (
  select slug from public.audience_segments where is_active
), expanded as (
  select
    s.slug,
    coalesce(c.interaction_type, 'single_choice') as interaction_type,
    c.difficulty,
    c.complexity_level,
    c.is_diagnostic
  from segments s
  join public.challenges c
    on s.slug = any(c.audience_segments)
   and c.is_published = true
)
select
  slug,
  count(*)::bigint as total,
  count(*) filter (where is_diagnostic)::bigint as diagnostic,
  count(*) filter (where interaction_type = 'single_choice')::bigint as single_choice,
  count(*) filter (where interaction_type = 'multi_select')::bigint as multi_select,
  count(*) filter (where interaction_type = 'ranking')::bigint as ranking,
  count(*) filter (where interaction_type = 'classification')::bigint as classification,
  count(*) filter (where interaction_type = 'triage')::bigint as triage,
  round(avg(difficulty)::numeric, 1) as avg_difficulty,
  round(avg(complexity_level)::numeric, 1) as avg_complexity
from expanded
group by slug
order by slug;

-- 3. Streaks should only be backed by completed core training sessions.
select
  p.id,
  p.current_streak,
  p.last_session_date,
  max(ts.session_date) filter (where ts.status = 'completed') as last_completed_training_date
from public.profiles p
left join public.training_sessions ts on ts.user_id = p.id
group by p.id, p.current_streak, p.last_session_date
having p.last_session_date is not null
   and p.last_session_date is distinct from max(ts.session_date) filter (where ts.status = 'completed')
order by p.last_session_date desc;

-- 4. Diagnostic history should normally have one active/completed UUID session per user,
-- with no more than the 12-question starting-check definition.
with diagnostic_sessions as (
  select
    ur.user_id,
    ur.session_key,
    count(distinct ur.challenge_id)::bigint as answered,
    min(ur.created_at) as first_at,
    max(ur.created_at) as last_at
  from public.user_responses ur
  join public.challenges c on c.id = ur.challenge_id and c.is_diagnostic = true
  where ur.session_key is not null
  group by ur.user_id, ur.session_key
)
select *
from diagnostic_sessions
where answered > 12
   or user_id in (
     select user_id
     from diagnostic_sessions
     group by user_id
     having count(*) > 1
   )
order by user_id, first_at;
