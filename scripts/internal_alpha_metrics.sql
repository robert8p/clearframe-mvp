-- Cogni internal-alpha product metrics
-- Read-only. Run against the Cogni Supabase project.
--
-- Measurement principles:
-- 1. Prefer authoritative server-side facts over client-generated page-view telemetry.
-- 2. Activation = first completed core daily training session.
-- 3. Retention = return to a server-observed learning activity after activation.
-- 4. Session effort uses first-to-last answer span, not wall-clock session age, because
--    learners can interrupt and resume a persisted session.
-- 5. Always interpret rates together with their eligible cohort count. Tiny cohorts are
--    directional only; do not present them as validated product performance.

-- -----------------------------------------------------------------------------
-- A. Activation funnel
-- Current starting-check design contains 12 questions. If that definition changes,
-- update the threshold below in the same change that updates the engine.
-- -----------------------------------------------------------------------------
with diagnostic_sessions as (
  select
    ur.user_id,
    ur.session_key,
    count(distinct ur.challenge_id) as answered
  from public.user_responses ur
  join public.challenges c on c.id = ur.challenge_id
  where c.is_diagnostic = true
  group by ur.user_id, ur.session_key
),
per_user as (
  select
    u.id as user_id,
    u.created_at as signup_at,
    (p.audience_segment is not null) as onboarded,
    exists (
      select 1 from diagnostic_sessions d
      where d.user_id = u.id and d.answered > 0
    ) as starting_check_started,
    exists (
      select 1 from diagnostic_sessions d
      where d.user_id = u.id and d.answered >= 12
    ) as starting_check_completed,
    exists (
      select 1 from public.user_lesson_completions l
      where l.user_id = u.id
    ) as lesson_completed,
    exists (
      select 1 from public.training_sessions s
      where s.user_id = u.id
    ) as core_training_started,
    exists (
      select 1 from public.training_sessions s
      where s.user_id = u.id and s.status = 'completed'
    ) as activated
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.deleted_at is null
)
select
  count(*) as signups,
  count(*) filter (where onboarded) as onboarded,
  count(*) filter (where starting_check_started) as starting_check_started,
  count(*) filter (where starting_check_completed) as starting_check_completed,
  count(*) filter (where lesson_completed) as lesson_completed,
  count(*) filter (where core_training_started) as core_training_started,
  count(*) filter (where activated) as activated,
  round(100.0 * count(*) filter (where activated) / nullif(count(*), 0), 1) as signup_to_activation_pct
from per_user;

-- -----------------------------------------------------------------------------
-- B. Core-session completion and effort
-- Wall-clock completion time can be long when a learner resumes later. The answer-span
-- measure is therefore the better approximation of active effort for completed sessions.
-- -----------------------------------------------------------------------------
with sessions as (
  select
    s.id,
    s.user_id,
    s.status,
    s.started_at,
    s.completed_at,
    min(r.created_at) as first_answer_at,
    max(r.created_at) as last_answer_at,
    count(r.id) as answers
  from public.training_sessions s
  left join public.user_responses r
    on r.user_id = s.user_id
   and r.session_key = s.id::text
  group by s.id, s.user_id, s.status, s.started_at, s.completed_at
)
select
  count(*) as sessions_started,
  count(*) filter (where status = 'completed') as sessions_completed,
  round(100.0 * count(*) filter (where status = 'completed') / nullif(count(*), 0), 1) as completion_rate_pct,
  round((
    percentile_cont(0.5) within group (
      order by extract(epoch from (last_answer_at - first_answer_at)) / 60.0
    ) filter (
      where status = 'completed'
        and first_answer_at is not null
        and last_answer_at is not null
    )
  )::numeric, 1) as median_active_answer_span_minutes,
  round(avg(answers) filter (where status = 'completed')::numeric, 1) as avg_answers_per_completed_session,
  count(*) filter (
    where status = 'completed'
      and completed_at - started_at > interval '30 minutes'
  ) as completed_after_long_resume
from sessions;

-- -----------------------------------------------------------------------------
-- C. D1 / D3 / D7 learning retention after activation
-- Activity is deliberately based on server-side learning facts, not app-open/page-view
-- events. Exact-day retention is used so D1/D3/D7 remain comparable over time.
-- -----------------------------------------------------------------------------
with activity as (
  select distinct
    r.user_id,
    (r.created_at at time zone coalesce(p.time_zone, 'UTC'))::date as activity_date
  from public.user_responses r
  join public.profiles p on p.id = r.user_id

  union

  select distinct
    l.user_id,
    l.lesson_date as activity_date
  from public.user_lesson_completions l

  union

  select distinct
    s.user_id,
    s.session_date as activity_date
  from public.training_sessions s
),
activation as (
  select
    user_id,
    min(session_date) as activation_date
  from public.training_sessions
  where status = 'completed'
  group by user_id
),
cohort as (
  select
    a.user_id,
    a.activation_date,
    exists (
      select 1 from activity x
      where x.user_id = a.user_id
        and x.activity_date = a.activation_date + 1
    ) as d1,
    exists (
      select 1 from activity x
      where x.user_id = a.user_id
        and x.activity_date = a.activation_date + 3
    ) as d3,
    exists (
      select 1 from activity x
      where x.user_id = a.user_id
        and x.activity_date = a.activation_date + 7
    ) as d7
  from activation a
)
select
  count(*) as activated_users,
  count(*) filter (where activation_date <= current_date - 1) as d1_eligible,
  count(*) filter (where activation_date <= current_date - 1 and d1) as d1_returned,
  round(
    100.0 * count(*) filter (where activation_date <= current_date - 1 and d1)
    / nullif(count(*) filter (where activation_date <= current_date - 1), 0),
    1
  ) as d1_retention_pct,
  count(*) filter (where activation_date <= current_date - 3) as d3_eligible,
  count(*) filter (where activation_date <= current_date - 3 and d3) as d3_returned,
  round(
    100.0 * count(*) filter (where activation_date <= current_date - 3 and d3)
    / nullif(count(*) filter (where activation_date <= current_date - 3), 0),
    1
  ) as d3_retention_pct,
  count(*) filter (where activation_date <= current_date - 7) as d7_eligible,
  count(*) filter (where activation_date <= current_date - 7 and d7) as d7_returned,
  round(
    100.0 * count(*) filter (where activation_date <= current_date - 7 and d7)
    / nullif(count(*) filter (where activation_date <= current_date - 7), 0),
    1
  ) as d7_retention_pct
from cohort;

-- -----------------------------------------------------------------------------
-- D. Daily learning activity trend
-- Useful for spotting pilot growth, dead days and changes in completion behaviour.
-- -----------------------------------------------------------------------------
with activity as (
  select
    r.user_id,
    (r.created_at at time zone coalesce(p.time_zone, 'UTC'))::date as activity_date
  from public.user_responses r
  join public.profiles p on p.id = r.user_id

  union

  select l.user_id, l.lesson_date
  from public.user_lesson_completions l

  union

  select s.user_id, s.session_date
  from public.training_sessions s
),
days as (
  select generate_series(
    least(
      coalesce((select min(activity_date) from activity), current_date),
      current_date - 13
    ),
    current_date,
    interval '1 day'
  )::date as day
)
select
  d.day,
  (select count(distinct a.user_id) from activity a where a.activity_date = d.day) as active_learners,
  (select count(*) from public.user_lesson_completions l where l.lesson_date = d.day) as lessons_completed,
  (select count(*) from public.training_sessions s where s.session_date = d.day) as core_sessions_started,
  (select count(*) from public.training_sessions s where s.session_date = d.day and s.status = 'completed') as core_sessions_completed,
  (select count(*)
   from public.user_responses r
   join public.profiles p on p.id = r.user_id
   where (r.created_at at time zone coalesce(p.time_zone, 'UTC'))::date = d.day) as answers_submitted
from days d
order by d.day;

-- -----------------------------------------------------------------------------
-- E. Supporting analytics-event coverage
-- This is a reconciliation aid, not the source of truth for the funnel above.
-- -----------------------------------------------------------------------------
select
  event_name,
  count(*) as events,
  count(distinct user_id) as users,
  min(created_at) as first_seen,
  max(created_at) as last_seen
from public.analytics_events
where event_name like 'mobile_%'
group by event_name
order by events desc, event_name;
