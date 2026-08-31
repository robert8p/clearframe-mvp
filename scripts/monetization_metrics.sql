-- Cogni 0.4.0 monetisation metrics
-- Read-only. Run against the Cogni Supabase project.
-- Always display the numerator and denominator. Apply METRICS.md sample-size guardrails:
-- <20 directional only; 20-49 early pilot; 50+ useful operating signal, not causality.

-- -----------------------------------------------------------------------------
-- A. Activated learner -> intentional premium selection -> paywall -> verified Pro
-- Activation is the first completed core training session (training_sessions; focused
-- practice is stored separately in practice_sessions).
-- -----------------------------------------------------------------------------
with activation as (
  select user_id, min(completed_at) as activated_at
  from public.training_sessions
  where status = 'completed' and completed_at is not null
  group by user_id
), event_firsts as (
  select
    a.user_id,
    a.activated_at,
    min(e.created_at) filter (where e.event_name = 'premium_feature_selected' and e.created_at >= a.activated_at) as selected_at,
    min(e.created_at) filter (where e.event_name = 'paywall_viewed' and e.created_at >= a.activated_at) as paywall_at,
    min(e.created_at) filter (where e.event_name = 'purchase_started' and e.created_at >= a.activated_at) as purchase_started_at,
    min(e.created_at) filter (where e.event_name = 'entitlement_activated' and e.created_at >= a.activated_at) as verified_pro_at
  from activation a
  left join public.analytics_events e on e.user_id = a.user_id
  group by a.user_id, a.activated_at
)
select
  count(*) as activated_learners,
  count(*) filter (where selected_at is not null) as premium_feature_selectors,
  count(*) filter (where paywall_at is not null) as paywall_viewers,
  round(100.0 * count(*) filter (where paywall_at is not null) / nullif(count(*), 0), 1) as activated_to_paywall_pct,
  count(*) filter (where purchase_started_at is not null) as purchase_starters,
  count(*) filter (where verified_pro_at is not null) as verified_pro_learners,
  round(100.0 * count(*) filter (where verified_pro_at is not null) / nullif(count(*), 0), 1) as activated_to_verified_pro_pct
from event_firsts;

-- -----------------------------------------------------------------------------
-- B. Paywall conversion. Client purchase_completed is reconciliation-only; the server
-- entitlement_activated event is the authority for verified access.
-- -----------------------------------------------------------------------------
with users as (
  select
    count(distinct user_id) filter (where event_name = 'paywall_viewed') as paywall_users,
    count(distinct user_id) filter (where event_name = 'purchase_started') as purchase_started_users,
    count(distinct user_id) filter (where event_name = 'purchase_completed') as client_purchase_completed_users,
    count(distinct user_id) filter (where event_name = 'entitlement_activated') as verified_pro_users
  from public.analytics_events
  where event_name in ('paywall_viewed','purchase_started','purchase_completed','entitlement_activated')
)
select
  paywall_users,
  purchase_started_users,
  verified_pro_users,
  round(100.0 * purchase_started_users / nullif(paywall_users, 0), 1) as paywall_to_purchase_start_pct,
  round(100.0 * verified_pro_users / nullif(paywall_users, 0), 1) as paywall_to_verified_pro_pct,
  round(100.0 * verified_pro_users / nullif(purchase_started_users, 0), 1) as purchase_start_to_verified_pro_pct,
  client_purchase_completed_users as client_purchase_completed_users_for_reconciliation_only
from users;

-- -----------------------------------------------------------------------------
-- C. Monthly versus annual verified mix and current access inventory.
-- Future expiry is required even when the stored status still reads active.
-- -----------------------------------------------------------------------------
select
  product_id,
  store,
  environment,
  count(*) as entitlement_rows,
  count(*) filter (
    where status in ('active','cancelled','grace_period','billing_issue')
      and expiration_date > now()
  ) as currently_granted_users,
  count(*) filter (
    where status in ('active','cancelled','grace_period','billing_issue')
      and expiration_date > now()
      and will_renew
  ) as currently_granted_and_will_renew,
  count(*) filter (where billing_issue) as billing_issue_rows,
  count(*) filter (where status in ('expired','refunded','revoked')) as ended_or_revoked_rows
from public.subscription_entitlements
where entitlement = 'pro'
group by product_id, store, environment
order by currently_granted_users desc, product_id, store, environment;

-- -----------------------------------------------------------------------------
-- D. Restore outcomes. The client writes an explicit outcome; verified access should
-- still be reconciled with subscription_entitlements.
-- -----------------------------------------------------------------------------
select
  count(*) filter (where event_name = 'restore_started') as restore_started_events,
  count(*) filter (where event_name = 'restore_completed') as restore_completed_events,
  count(*) filter (where event_name = 'restore_completed' and properties->>'outcome' = 'subscription_restored') as restored_events,
  count(*) filter (where event_name = 'restore_completed' and properties->>'outcome' = 'no_subscription') as no_subscription_events,
  count(*) filter (where event_name = 'restore_completed' and properties->>'outcome' = 'error') as restore_error_events,
  round(
    100.0 * count(*) filter (where event_name = 'restore_completed' and properties->>'outcome' = 'subscription_restored')
    / nullif(count(*) filter (where event_name = 'restore_started'), 0),
    1
  ) as restore_success_pct
from public.analytics_events
where event_name in ('restore_started','restore_completed');

-- -----------------------------------------------------------------------------
-- E. Current free-versus-Pro engagement snapshot over 30 days.
-- This uses current entitlement status, not a historical point-in-time subscription
-- ledger. It is observational and must not be presented as causal lift from Pro.
-- -----------------------------------------------------------------------------
with cohort as (
  select
    u.id as user_id,
    case when e.user_id is not null then 'pro' else 'free' end as current_plan
  from auth.users u
  left join public.subscription_entitlements e
    on e.user_id = u.id
   and e.entitlement = 'pro'
   and e.status in ('active','cancelled','grace_period','billing_issue')
   and e.expiration_date > now()
  where u.deleted_at is null
), activity_days as (
  select user_id, count(distinct activity_date) as active_days_30d
  from (
    select user_id, created_at::date as activity_date
    from public.user_responses
    where created_at >= now() - interval '30 days'

    union

    select user_id, lesson_date
    from public.user_lesson_completions
    where lesson_date >= current_date - 30

    union

    select user_id, session_date
    from public.training_sessions
    where session_date >= current_date - 30
  ) activity
  group by user_id
), core_sessions as (
  select user_id, count(*) as completed_core_sessions_30d
  from public.training_sessions
  where status = 'completed'
    and completed_at >= now() - interval '30 days'
  group by user_id
), per_user as (
  select
    c.user_id,
    c.current_plan,
    coalesce(a.active_days_30d, 0) as active_days_30d,
    coalesce(s.completed_core_sessions_30d, 0) as completed_core_sessions_30d
  from cohort c
  left join activity_days a on a.user_id = c.user_id
  left join core_sessions s on s.user_id = c.user_id
)
select
  current_plan,
  count(*) as users,
  count(*) filter (where active_days_30d > 0) as active_users_30d,
  round(100.0 * count(*) filter (where active_days_30d > 0) / nullif(count(*), 0), 1) as active_user_rate_30d_pct,
  round(avg(active_days_30d)::numeric, 2) as avg_active_days_30d,
  round(avg(completed_core_sessions_30d)::numeric, 2) as avg_completed_core_sessions_30d
from per_user
group by current_plan
order by current_plan;

-- -----------------------------------------------------------------------------
-- F. Post-paywall free-core D1/D3/D7 activity: exposed versus not-yet-exposed activated
-- learners. This is a diagnostic signal only; exposure is self-selected and not random.
-- -----------------------------------------------------------------------------
with activity as (
  select distinct user_id, created_at::date as activity_date
  from public.user_responses

  union

  select distinct user_id, lesson_date
  from public.user_lesson_completions

  union

  select distinct user_id, session_date
  from public.training_sessions
), activation as (
  select user_id, min(session_date) as activation_date
  from public.training_sessions
  where status = 'completed'
  group by user_id
), exposure as (
  select user_id, min(created_at::date) as paywall_date
  from public.analytics_events
  where event_name = 'paywall_viewed'
  group by user_id
), cohort as (
  select
    a.user_id,
    a.activation_date,
    e.paywall_date,
    case
      when e.paywall_date is not null and e.paywall_date >= a.activation_date then 'paywall_exposed'
      else 'not_exposed'
    end as exposure_group,
    coalesce(e.paywall_date, a.activation_date) as anchor_date
  from activation a
  left join exposure e on e.user_id = a.user_id
), flags as (
  select
    c.*,
    exists (select 1 from activity x where x.user_id = c.user_id and x.activity_date = c.anchor_date + 1) as d1,
    exists (select 1 from activity x where x.user_id = c.user_id and x.activity_date = c.anchor_date + 3) as d3,
    exists (select 1 from activity x where x.user_id = c.user_id and x.activity_date = c.anchor_date + 7) as d7
  from cohort c
)
select
  exposure_group,
  count(*) as learners,
  count(*) filter (where anchor_date <= current_date - 1) as d1_eligible,
  count(*) filter (where anchor_date <= current_date - 1 and d1) as d1_returned,
  round(100.0 * count(*) filter (where anchor_date <= current_date - 1 and d1) / nullif(count(*) filter (where anchor_date <= current_date - 1), 0), 1) as d1_pct,
  count(*) filter (where anchor_date <= current_date - 3) as d3_eligible,
  count(*) filter (where anchor_date <= current_date - 3 and d3) as d3_returned,
  round(100.0 * count(*) filter (where anchor_date <= current_date - 3 and d3) / nullif(count(*) filter (where anchor_date <= current_date - 3), 0), 1) as d3_pct,
  count(*) filter (where anchor_date <= current_date - 7) as d7_eligible,
  count(*) filter (where anchor_date <= current_date - 7 and d7) as d7_returned,
  round(100.0 * count(*) filter (where anchor_date <= current_date - 7 and d7) / nullif(count(*) filter (where anchor_date <= current_date - 7), 0), 1) as d7_pct
from flags
group by exposure_group
order by exposure_group;

-- -----------------------------------------------------------------------------
-- G. Entitlement lifecycle transitions and webhook delivery/idempotency health.
-- -----------------------------------------------------------------------------
select
  event_name,
  count(*) as events,
  count(distinct user_id) as users,
  min(created_at) as first_seen,
  max(created_at) as last_seen
from public.analytics_events
where event_name in ('entitlement_activated','entitlement_expired','entitlement_revoked')
group by event_name
order by event_name;

select
  event_type,
  environment,
  outcome,
  count(*) as events,
  min(received_at) as first_received_at,
  max(received_at) as last_received_at,
  count(*) filter (where processed_at is null) as not_yet_processed
from public.subscription_webhook_events
group by event_type, environment, outcome
order by last_received_at desc;
