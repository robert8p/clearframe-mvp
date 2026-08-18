-- Harden the mobile data boundary and make scoring updates transactional.

alter table public.profiles
  add column if not exists time_zone text;

alter table public.training_sessions
  add column if not exists context_mode text;

alter table public.training_sessions
  drop constraint if exists training_sessions_context_mode_check;
alter table public.training_sessions
  add constraint training_sessions_context_mode_check
  check (context_mode is null or context_mode in ('work','mixed','personal'));

alter table public.user_skill_scores
  add column if not exists evidence_points numeric not null default 0;

update public.user_skill_scores
set evidence_points = greatest(evidence_points, attempts::numeric)
where attempts > 0 and evidence_points = 0;

create unique index if not exists idx_practice_sessions_one_in_progress
  on public.practice_sessions(user_id, skill_id)
  where status = 'in_progress';

-- Authenticated clients may read their own profile, but all profile writes now go through
-- trusted server/Edge code. This prevents self-promotion to admin and XP/streak tampering.
revoke insert, update, delete on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.mobile_api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, bucket, window_start)
);

create or replace function public.consume_mobile_api_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_limit integer default 120,
  p_window_seconds integer default 60
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit configuration';
  end if;

  v_window := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  insert into private.mobile_api_rate_limits(user_id, bucket, window_start, request_count)
  values (p_user_id, left(coalesce(p_bucket, 'default'), 80), v_window, 1)
  on conflict (user_id, bucket, window_start)
  do update set request_count = private.mobile_api_rate_limits.request_count + 1
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.consume_mobile_api_rate_limit(uuid,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_mobile_api_rate_limit(uuid,text,integer,integer) to service_role;

create or replace function public.record_scored_answer(
  p_user_id uuid,
  p_challenge_id uuid,
  p_session_id text,
  p_mode text,
  p_selected_index integer,
  p_response_payload jsonb,
  p_score_fraction numeric,
  p_is_correct boolean,
  p_confidence integer,
  p_response_time_ms integer,
  p_error_pattern text,
  p_xp integer,
  p_today date,
  p_yesterday date
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_response_id uuid;
  v_difficulty numeric;
  v_is_diagnostic boolean;
  v_seen_before boolean;
  v_evidence_increment numeric;
  v_session_completed boolean := false;
  v_assigned integer;
  v_answered integer;
  v_before_score numeric;
  v_before_reliability numeric;
  v_before_attempts integer;
  v_before_evidence numeric;
  v_after_score numeric;
  v_after_reliability numeric;
  v_after_attempts integer;
  v_after_evidence numeric;
  v_expected numeric;
  v_weight numeric;
  v_skill_updates jsonb := '[]'::jsonb;
  r record;
begin
  if p_mode not in ('diagnostic','training','practice') then
    raise exception 'Unsupported answer mode';
  end if;
  if p_score_fraction < 0 or p_score_fraction > 1 then
    raise exception 'Invalid score fraction';
  end if;
  if p_xp < 0 or p_xp > 50 then
    raise exception 'Invalid XP award';
  end if;
  if p_response_time_ms < 0 or p_response_time_ms > 3600000 then
    raise exception 'Invalid response time';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  select difficulty::numeric, is_diagnostic
    into v_difficulty, v_is_diagnostic
  from public.challenges
  where id = p_challenge_id and is_published = true;

  if not found then raise exception 'Challenge not found'; end if;
  if p_mode = 'diagnostic' and not v_is_diagnostic then raise exception 'Not a diagnostic challenge'; end if;
  if p_mode in ('training','practice') and v_is_diagnostic then raise exception 'Diagnostic challenge cannot be used here'; end if;

  if p_mode = 'training' then
    if not exists (
      select 1 from public.training_sessions s
      where s.id = p_session_id::uuid and s.user_id = p_user_id and s.status = 'in_progress'
    ) then raise exception 'Training session not found or complete'; end if;
    if not exists (
      select 1 from public.training_session_challenges a
      where a.session_id = p_session_id::uuid and a.challenge_id = p_challenge_id
    ) then raise exception 'Challenge is not assigned to this training session'; end if;
  elsif p_mode = 'practice' then
    if not exists (
      select 1 from public.practice_sessions s
      where s.id = p_session_id::uuid and s.user_id = p_user_id and s.status = 'in_progress'
    ) then raise exception 'Practice session not found or complete'; end if;
    if not exists (
      select 1 from public.practice_session_challenges a
      where a.session_id = p_session_id::uuid and a.challenge_id = p_challenge_id
    ) then raise exception 'Challenge is not assigned to this practice session'; end if;
  end if;

  select exists(
    select 1 from public.user_responses
    where user_id = p_user_id and challenge_id = p_challenge_id
  ) into v_seen_before;
  v_evidence_increment := case when v_seen_before then 0.35 else 1.0 end;

  insert into public.user_responses(
    user_id, challenge_id, selected_index, response_payload, score_fraction,
    is_correct, confidence, response_time_ms, error_pattern, session_key, xp_awarded
  ) values (
    p_user_id, p_challenge_id, p_selected_index, p_response_payload, p_score_fraction,
    p_is_correct, p_confidence, p_response_time_ms, p_error_pattern, p_session_id, p_xp
  ) returning id into v_response_id;

  for r in
    select m.skill_id, coalesce(m.weight, 1)::numeric as weight, s.name, s.slug
    from public.challenge_skill_mapping m
    join public.skills s on s.id = m.skill_id
    where m.challenge_id = p_challenge_id
  loop
    insert into public.user_skill_scores(user_id, skill_id, score, reliability, attempts, evidence_points)
    values (p_user_id, r.skill_id, 50, 0, 0, 0)
    on conflict (user_id, skill_id) do nothing;

    select score, reliability, attempts, evidence_points
      into v_before_score, v_before_reliability, v_before_attempts, v_before_evidence
    from public.user_skill_scores
    where user_id = p_user_id and skill_id = r.skill_id
    for update;

    v_after_attempts := v_before_attempts + 1;
    v_after_evidence := v_before_evidence + v_evidence_increment;
    v_expected := 1 / (1 + pg_catalog.exp(((v_difficulty - v_before_score) / 14)::double precision));
    v_weight := greatest(0.4, least(1.4, r.weight));
    v_after_score := greatest(0, least(100,
      round((v_before_score + 7 * (p_score_fraction - v_expected) * v_weight) * 10) / 10
    ));
    v_after_reliability := round((1 - pg_catalog.exp((-v_after_evidence / 8)::double precision))::numeric, 2);

    update public.user_skill_scores
    set score = v_after_score,
        reliability = v_after_reliability,
        attempts = v_after_attempts,
        evidence_points = v_after_evidence,
        last_seen_at = now(),
        updated_at = now()
    where user_id = p_user_id and skill_id = r.skill_id;

    insert into public.user_response_skill_updates(
      response_id, user_id, skill_id,
      score_before, score_after, reliability_before, reliability_after,
      attempts_before, attempts_after, weight
    ) values (
      v_response_id, p_user_id, r.skill_id,
      v_before_score, v_after_score, v_before_reliability, v_after_reliability,
      v_before_attempts, v_after_attempts, r.weight
    );

    v_skill_updates := v_skill_updates || jsonb_build_array(jsonb_build_object(
      'slug', r.slug,
      'name', r.name,
      'score', v_after_score,
      'reliability', v_after_reliability,
      'delta', round((v_after_score - v_before_score) * 10) / 10,
      'evidenceWeight', v_evidence_increment
    ));
  end loop;

  if p_error_pattern is not null and btrim(p_error_pattern) <> '' then
    insert into public.user_error_patterns(user_id, pattern, count, last_seen_at)
    values (p_user_id, p_error_pattern, 1, now())
    on conflict (user_id, pattern)
    do update set count = public.user_error_patterns.count + 1, last_seen_at = now();
  end if;

  if p_mode = 'training' then
    select count(*) into v_assigned from public.training_session_challenges where session_id = p_session_id::uuid;
    select count(*) into v_answered from public.user_responses where user_id = p_user_id and session_key = p_session_id;
    if v_assigned > 0 and v_answered >= v_assigned then
      v_session_completed := true;
      update public.training_sessions
      set status='completed', completed_at=now(), updated_at=now()
      where id=p_session_id::uuid and user_id=p_user_id and status='in_progress';
    end if;
  elsif p_mode = 'practice' then
    select count(*) into v_assigned from public.practice_session_challenges where session_id = p_session_id::uuid;
    select count(*) into v_answered from public.user_responses where user_id = p_user_id and session_key = p_session_id;
    if v_assigned > 0 and v_answered >= v_assigned then
      v_session_completed := true;
      update public.practice_sessions
      set status='completed', completed_at=now()
      where id=p_session_id::uuid and user_id=p_user_id and status='in_progress';
    end if;
  end if;

  update public.profiles
  set xp = xp + p_xp,
      current_streak = case
        when p_mode='training' and v_session_completed and last_session_date is distinct from p_today then
          case when last_session_date = p_yesterday then current_streak + 1 else 1 end
        else current_streak
      end,
      last_session_date = case
        when p_mode='training' and v_session_completed and last_session_date is distinct from p_today then p_today
        else last_session_date
      end,
      updated_at = now()
  where id = p_user_id;

  insert into public.analytics_events(user_id, event_name, properties)
  values (p_user_id, 'mobile_answer_submitted', jsonb_build_object(
    'challenge_id', p_challenge_id,
    'mode', p_mode,
    'session_id', p_session_id,
    'score_fraction', p_score_fraction,
    'xp_awarded', p_xp,
    'session_completed', v_session_completed,
    'repeat_evidence', v_seen_before
  ));

  return jsonb_build_object(
    'responseId', v_response_id,
    'skillUpdates', v_skill_updates,
    'sessionCompleted', v_session_completed,
    'evidenceWeight', v_evidence_increment
  );
end;
$$;

revoke execute on function public.record_scored_answer(uuid,uuid,text,text,integer,jsonb,numeric,boolean,integer,integer,text,integer,date,date) from public, anon, authenticated;
grant execute on function public.record_scored_answer(uuid,uuid,text,text,integer,jsonb,numeric,boolean,integer,integer,text,integer,date,date) to service_role;
