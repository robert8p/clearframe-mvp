create table if not exists public.subscription_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement text not null,
  status text not null,
  product_id text,
  store text,
  original_app_user_id text,
  purchase_date timestamptz,
  expiration_date timestamptz,
  will_renew boolean not null default false,
  billing_issue boolean not null default false,
  environment text not null default 'unknown',
  last_event_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement),
  constraint subscription_entitlements_entitlement_check check (entitlement = 'pro'),
  constraint subscription_entitlements_status_check check (status in ('active','cancelled','grace_period','billing_issue','expired','refunded','revoked','unknown')),
  constraint subscription_entitlements_environment_check check (environment in ('sandbox','production','unknown'))
);

create index if not exists subscription_entitlements_expiration_idx
  on public.subscription_entitlements (expiration_date)
  where entitlement = 'pro';

alter table public.subscription_entitlements enable row level security;
revoke all on table public.subscription_entitlements from anon, authenticated;
grant select on table public.subscription_entitlements to authenticated;
drop policy if exists "own subscription entitlement read" on public.subscription_entitlements;
create policy "own subscription entitlement read"
  on public.subscription_entitlements
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.subscription_webhook_events (
  event_id text primary key,
  event_type text not null,
  app_user_id text,
  environment text not null default 'unknown',
  payload_sha256 text not null,
  processed_user_id uuid references auth.users(id) on delete set null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  outcome text not null default 'received',
  constraint subscription_webhook_events_environment_check check (environment in ('sandbox','production','unknown')),
  constraint subscription_webhook_events_outcome_check check (outcome in ('received','processed','ignored'))
);

alter table public.subscription_webhook_events enable row level security;
revoke all on table public.subscription_webhook_events from anon, authenticated;

create table if not exists public.monetization_config (
  singleton boolean primary key default true,
  monetization_enabled boolean not null default false,
  free_core_sessions_per_day smallint not null default 1,
  focused_practice_is_pro boolean not null default true,
  progress_history_free_days smallint not null default 7,
  proactive_paywall_min_sessions smallint not null default 3,
  paywall_experiment text not null default 'control',
  updated_at timestamptz not null default now(),
  constraint monetization_config_singleton_check check (singleton = true),
  constraint monetization_config_free_core_check check (free_core_sessions_per_day >= 1 and free_core_sessions_per_day <= 10),
  constraint monetization_config_history_check check (progress_history_free_days >= 0 and progress_history_free_days <= 365),
  constraint monetization_config_paywall_check check (proactive_paywall_min_sessions >= 0 and proactive_paywall_min_sessions <= 1000)
);

insert into public.monetization_config (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.monetization_config enable row level security;
revoke all on table public.monetization_config from anon, authenticated;

create or replace function public.sync_subscription_entitlement(
  p_user_id uuid,
  p_entitlement text,
  p_status text,
  p_product_id text,
  p_store text,
  p_original_app_user_id text,
  p_purchase_date timestamptz,
  p_expiration_date timestamptz,
  p_will_renew boolean,
  p_billing_issue boolean,
  p_environment text,
  p_event_id text,
  p_event_type text,
  p_app_user_id text,
  p_payload_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_status text;
  v_old_expiration timestamptz;
  v_old_grant boolean := false;
  v_new_grant boolean := false;
  v_event_claimed boolean := true;
  v_transition text := null;
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'unknown subscription user' using errcode = '22023';
  end if;
  if p_entitlement <> 'pro' then
    raise exception 'unsupported entitlement' using errcode = '22023';
  end if;
  if p_status not in ('active','cancelled','grace_period','billing_issue','expired','refunded','revoked','unknown') then
    raise exception 'unsupported entitlement status' using errcode = '22023';
  end if;
  if p_environment not in ('sandbox','production','unknown') then
    raise exception 'unsupported subscription environment' using errcode = '22023';
  end if;

  if p_event_id is not null then
    insert into public.subscription_webhook_events (
      event_id, event_type, app_user_id, environment, payload_sha256, processed_user_id
    ) values (
      p_event_id,
      coalesce(nullif(p_event_type, ''), 'UNKNOWN'),
      p_app_user_id,
      p_environment,
      coalesce(p_payload_sha256, ''),
      p_user_id
    )
    on conflict (event_id) do nothing;
    get diagnostics v_event_claimed = row_count;
    if not v_event_claimed then
      return jsonb_build_object('processed', false, 'duplicate', true);
    end if;
  end if;

  select status, expiration_date
    into v_old_status, v_old_expiration
  from public.subscription_entitlements
  where user_id = p_user_id and entitlement = p_entitlement
  for update;

  v_old_grant := coalesce(
    v_old_status in ('active','cancelled','grace_period','billing_issue')
    and v_old_expiration is not null
    and v_old_expiration > now(),
    false
  );

  v_new_grant := coalesce(
    p_status in ('active','cancelled','grace_period','billing_issue')
    and p_expiration_date is not null
    and p_expiration_date > now(),
    false
  );

  insert into public.subscription_entitlements (
    user_id, entitlement, status, product_id, store, original_app_user_id,
    purchase_date, expiration_date, will_renew, billing_issue, environment,
    last_event_id, updated_at
  ) values (
    p_user_id, p_entitlement, p_status, p_product_id, p_store, p_original_app_user_id,
    p_purchase_date, p_expiration_date, coalesce(p_will_renew, false), coalesce(p_billing_issue, false),
    p_environment, p_event_id, now()
  )
  on conflict (user_id, entitlement) do update set
    status = excluded.status,
    product_id = excluded.product_id,
    store = excluded.store,
    original_app_user_id = excluded.original_app_user_id,
    purchase_date = excluded.purchase_date,
    expiration_date = excluded.expiration_date,
    will_renew = excluded.will_renew,
    billing_issue = excluded.billing_issue,
    environment = excluded.environment,
    last_event_id = coalesce(excluded.last_event_id, public.subscription_entitlements.last_event_id),
    updated_at = now();

  if not v_old_grant and v_new_grant then
    v_transition := 'entitlement_activated';
  elsif v_old_grant and not v_new_grant then
    if p_status in ('refunded','revoked') then
      v_transition := 'entitlement_revoked';
    else
      v_transition := 'entitlement_expired';
    end if;
  end if;

  if v_transition is not null then
    insert into public.analytics_events (user_id, event_name, properties)
    values (
      p_user_id,
      v_transition,
      jsonb_strip_nulls(jsonb_build_object(
        'entitlement', p_entitlement,
        'status', p_status,
        'product_id', p_product_id,
        'store', p_store,
        'environment', p_environment,
        'source_event_type', p_event_type
      ))
    );
  end if;

  if p_event_id is not null then
    update public.subscription_webhook_events
      set processed_at = now(), outcome = 'processed'
    where event_id = p_event_id;
  end if;

  return jsonb_build_object(
    'processed', true,
    'duplicate', false,
    'is_pro', v_new_grant,
    'transition', v_transition
  );
end;
$$;

alter function public.sync_subscription_entitlement(uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,boolean,text,text,text,text,text) owner to postgres;
revoke all on function public.sync_subscription_entitlement(uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,boolean,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.sync_subscription_entitlement(uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,boolean,text,text,text,text,text) to service_role;

comment on table public.subscription_entitlements is 'Server-owned RevenueCat entitlement projection. Clients may read only their own row and may never write it.';
comment on table public.subscription_webhook_events is 'Minimal idempotency/audit ledger for RevenueCat webhook delivery; raw payloads are not retained.';
comment on table public.monetization_config is 'Small server-owned monetisation configuration. Defaults preserve the free core and monetisation starts disabled.';
comment on function public.sync_subscription_entitlement(uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,boolean,text,text,text,text,text) is 'Service-role-only atomic entitlement sync plus webhook idempotency and transition analytics.';
