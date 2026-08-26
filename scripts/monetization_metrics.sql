-- Cogni 0.4.0 monetisation metrics
-- Read-only. Always display numerators and denominators; apply METRICS.md sample-size guardrails.

with events as (
  select user_id, event_name, properties, created_at
  from public.analytics_events
  where event_name in (
    'paywall_viewed','paywall_dismissed','premium_feature_selected',
    'purchase_started','purchase_completed','purchase_failed',
    'restore_started','restore_completed',
    'entitlement_activated','entitlement_expired','entitlement_revoked'
  )
), users as (
  select
    count(distinct user_id) filter (where event_name='paywall_viewed') as paywall_users,
    count(distinct user_id) filter (where event_name='purchase_started') as purchase_started_users,
    count(distinct user_id) filter (where event_name='purchase_completed') as purchase_completed_client_users,
    count(distinct user_id) filter (where event_name='entitlement_activated') as verified_pro_users
  from events
)
select
  paywall_users,
  purchase_started_users,
  verified_pro_users,
  round(100.0 * purchase_started_users / nullif(paywall_users,0), 1) as paywall_to_purchase_start_pct,
  round(100.0 * verified_pro_users / nullif(paywall_users,0), 1) as paywall_to_verified_pro_pct,
  round(100.0 * verified_pro_users / nullif(purchase_started_users,0), 1) as purchase_start_to_verified_pro_pct,
  purchase_completed_client_users as client_purchase_completed_users_for_reconciliation_only
from users;

-- Current verified entitlement inventory. The future-expiry condition prevents stale active labels
-- from being counted as access after their entitlement period has elapsed.
select
  product_id,
  status,
  count(*) as users,
  count(*) filter (
    where status in ('active','cancelled','grace_period','billing_issue')
      and expiration_date > now()
  ) as currently_granted_users,
  count(*) filter (where will_renew) as will_renew_users,
  count(*) filter (where billing_issue) as billing_issue_users
from public.subscription_entitlements
where entitlement='pro'
group by product_id,status
order by users desc, product_id, status;

-- Restore funnel, using explicit result property written by the mobile client.
with restore as (
  select user_id,event_name,properties,created_at
  from public.analytics_events
  where event_name in ('restore_started','restore_completed')
)
select
  count(*) filter (where event_name='restore_started') as restore_started_events,
  count(*) filter (where event_name='restore_completed') as restore_completed_events,
  count(*) filter (where event_name='restore_completed' and properties->>'outcome'='subscription_restored') as restored_events,
  count(*) filter (where event_name='restore_completed' and properties->>'outcome'='no_subscription') as no_subscription_events,
  count(*) filter (where event_name='restore_completed' and properties->>'outcome'='error') as restore_error_events
from restore;

-- Webhook delivery/idempotency health. Raw payloads are intentionally not stored.
select
  event_type,
  environment,
  outcome,
  count(*) as events,
  min(received_at) as first_received_at,
  max(received_at) as last_received_at
from public.subscription_webhook_events
group by event_type,environment,outcome
order by last_received_at desc;
