-- Cogni 0.4.0 monetisation hardening.
-- Keeps the free core fail-safe, makes support storage explicitly server-only,
-- exposes a bounded-output daily history projection, and processes transfers atomically.

revoke all on table public.support_requests from anon, authenticated;

create index if not exists subscription_webhook_events_processed_user_idx
  on public.subscription_webhook_events (processed_user_id)
  where processed_user_id is not null;

create or replace function public.get_user_skill_progress_history(
  p_user_id uuid,
  p_since timestamptz default null
)
returns table (
  day date,
  skill_id uuid,
  skill_slug text,
  skill_name text,
  score numeric,
  reliability numeric,
  attempts integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on ((updates.created_at at time zone 'UTC')::date, updates.skill_id)
    (updates.created_at at time zone 'UTC')::date as day,
    updates.skill_id,
    skills.slug as skill_slug,
    skills.name as skill_name,
    updates.score_after as score,
    updates.reliability_after as reliability,
    updates.attempts_after as attempts
  from public.user_response_skill_updates as updates
  join public.skills as skills on skills.id = updates.skill_id
  where updates.user_id = p_user_id
    and (p_since is null or updates.created_at >= p_since)
  order by
    (updates.created_at at time zone 'UTC')::date,
    updates.skill_id,
    updates.created_at desc,
    updates.response_id desc;
$$;

alter function public.get_user_skill_progress_history(uuid,timestamptz) owner to postgres;
revoke all on function public.get_user_skill_progress_history(uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.get_user_skill_progress_history(uuid,timestamptz) to service_role;

create or replace function public.sync_subscription_transfer(
  p_event_id text,
  p_event_type text,
  p_app_user_id text,
  p_environment text,
  p_payload_sha256 text,
  p_processed_user_id uuid,
  p_projections jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_claimed boolean := true;
  v_projection jsonb;
  v_user_id uuid;
  v_result jsonb;
  v_results jsonb := '[]'::jsonb;
begin
  if nullif(p_event_id, '') is null then
    raise exception 'missing transfer event id' using errcode = '22023';
  end if;
  if p_environment not in ('sandbox','production','unknown') then
    raise exception 'unsupported subscription environment' using errcode = '22023';
  end if;
  if jsonb_typeof(p_projections) <> 'array'
     or jsonb_array_length(p_projections) < 1
     or jsonb_array_length(p_projections) > 20 then
    raise exception 'invalid transfer projections' using errcode = '22023';
  end if;
  if p_processed_user_id is not null
     and not exists (select 1 from auth.users where id = p_processed_user_id) then
    raise exception 'unknown processed subscription user' using errcode = '22023';
  end if;

  insert into public.subscription_webhook_events (
    event_id, event_type, app_user_id, environment, payload_sha256, processed_user_id
  ) values (
    p_event_id,
    coalesce(nullif(p_event_type, ''), 'TRANSFER'),
    p_app_user_id,
    p_environment,
    coalesce(p_payload_sha256, ''),
    p_processed_user_id
  )
  on conflict (event_id) do nothing;
  get diagnostics v_event_claimed = row_count;
  if not v_event_claimed then
    return jsonb_build_object('processed', false, 'duplicate', true);
  end if;

  for v_projection in
    select value from jsonb_array_elements(p_projections)
  loop
    begin
      v_user_id := (v_projection->>'user_id')::uuid;
    exception when others then
      raise exception 'invalid transfer user' using errcode = '22023';
    end;

    v_result := public.sync_subscription_entitlement(
      v_user_id,
      'pro',
      coalesce(nullif(v_projection->>'status', ''), 'unknown'),
      nullif(v_projection->>'product_id', ''),
      nullif(v_projection->>'store', ''),
      coalesce(nullif(v_projection->>'original_app_user_id', ''), v_user_id::text),
      nullif(v_projection->>'purchase_date', '')::timestamptz,
      nullif(v_projection->>'expiration_date', '')::timestamptz,
      coalesce((v_projection->>'will_renew')::boolean, false),
      coalesce((v_projection->>'billing_issue')::boolean, false),
      coalesce(nullif(v_projection->>'environment', ''), 'unknown'),
      null,
      coalesce(nullif(p_event_type, ''), 'TRANSFER'),
      p_app_user_id,
      p_payload_sha256
    );

    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'user_id', v_user_id,
      'result', v_result
    ));
  end loop;

  update public.subscription_webhook_events
    set processed_at = now(), outcome = 'processed'
  where event_id = p_event_id;

  return jsonb_build_object(
    'processed', true,
    'duplicate', false,
    'targets', v_results
  );
end;
$$;

alter function public.sync_subscription_transfer(text,text,text,text,text,uuid,jsonb) owner to postgres;
revoke all on function public.sync_subscription_transfer(text,text,text,text,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.sync_subscription_transfer(text,text,text,text,text,uuid,jsonb) to service_role;

comment on function public.get_user_skill_progress_history(uuid,timestamptz) is
  'Service-role-only daily latest skill snapshots for either all available history or a caller-selected free window.';
comment on function public.sync_subscription_transfer(text,text,text,text,text,uuid,jsonb) is
  'Service-role-only atomic RevenueCat transfer reconciliation for every known source and destination plus one idempotency claim.';
