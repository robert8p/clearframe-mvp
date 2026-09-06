begin;

update public.challenges
set
  prompt = case content_key
    when 'diag_casual_ai' then E'An AI assistant says you can cancel a holiday booking for free and quotes a policy clause. The provider’s current terms use different wording.\n\nWhat is the strongest next step?'
    when 'diag_casual_assumption' then E'A new subscription has a lower monthly price, so a friend says switching will definitely save money.\n\nWhich assumption most needs checking?'
    when 'diag_casual_cause' then E'You start taking a vitamin and feel more energetic that week. You also sleep an extra hour each night and drink less alcohol.\n\nWhat is the strongest conclusion?'
    when 'diag_casual_evidence' then E'A video claims that a home air-quality device removes “99% of harmful particles”. The manufacturer commissioned the test, which used a sealed laboratory room.\n\nWhat is the strongest next step before relying on the claim?'
    when 'diag_casual_uncertainty' then E'You are planning an outdoor gathering. Rain is possible, the forecast keeps changing and cancelling today would forfeit a deposit.\n\nWhat is the strongest response?'
    when 'v020_casual_capstone_safe_verification' then E'A family group chat shares an AI-written message describing an expensive investment as “guaranteed”. The linked regulator page does not support the claim, and the message pressures everyone to act today.\n\nWhat would you do next?'
    else prompt
  end,
  scenario_context = case content_key
    when 'v020_casual_capstone_safe_verification' then 'Everyday learner • money and AI claims'
    else scenario_context
  end,
  updated_at = now()
where content_key in (
  'diag_casual_ai',
  'diag_casual_assumption',
  'diag_casual_cause',
  'diag_casual_evidence',
  'diag_casual_uncertainty',
  'v020_casual_capstone_safe_verification'
);

do $$
declare
  affected_count integer;
begin
  select count(*)
  into affected_count
  from public.challenges
  where content_key in (
    'diag_casual_ai',
    'diag_casual_assumption',
    'diag_casual_cause',
    'diag_casual_evidence',
    'diag_casual_uncertainty',
    'v020_casual_capstone_safe_verification'
  );

  if affected_count <> 6 then
    raise exception 'Expected six curated casual challenges, found %', affected_count;
  end if;

  if exists (
    select 1
    from public.challenges
    where strpos(coalesce(title, ''), chr(92) || 'n') > 0
       or strpos(coalesce(title, ''), chr(92) || 'r') > 0
       or strpos(coalesce(title, ''), chr(92) || 't') > 0
       or strpos(coalesce(prompt, ''), chr(92) || 'n') > 0
       or strpos(coalesce(prompt, ''), chr(92) || 'r') > 0
       or strpos(coalesce(prompt, ''), chr(92) || 't') > 0
       or strpos(coalesce(scenario_context, ''), chr(92) || 'n') > 0
       or strpos(coalesce(scenario_context, ''), chr(92) || 'r') > 0
       or strpos(coalesce(scenario_context, ''), chr(92) || 't') > 0
       or strpos(coalesce(scenario_text, ''), chr(92) || 'n') > 0
       or strpos(coalesce(scenario_text, ''), chr(92) || 'r') > 0
       or strpos(coalesce(scenario_text, ''), chr(92) || 't') > 0
       or strpos(coalesce(question_text, ''), chr(92) || 'n') > 0
       or strpos(coalesce(question_text, ''), chr(92) || 'r') > 0
       or strpos(coalesce(question_text, ''), chr(92) || 't') > 0
  ) then
    raise exception 'Literal escaped control characters remain in challenge display copy';
  end if;
end
$$;

alter table public.challenges
  drop constraint if exists challenges_display_copy_no_literal_control_escapes;

alter table public.challenges
  add constraint challenges_display_copy_no_literal_control_escapes
  check (
    strpos(coalesce(title, ''), chr(92) || 'n') = 0
    and strpos(coalesce(title, ''), chr(92) || 'r') = 0
    and strpos(coalesce(title, ''), chr(92) || 't') = 0
    and strpos(coalesce(prompt, ''), chr(92) || 'n') = 0
    and strpos(coalesce(prompt, ''), chr(92) || 'r') = 0
    and strpos(coalesce(prompt, ''), chr(92) || 't') = 0
    and strpos(coalesce(scenario_context, ''), chr(92) || 'n') = 0
    and strpos(coalesce(scenario_context, ''), chr(92) || 'r') = 0
    and strpos(coalesce(scenario_context, ''), chr(92) || 't') = 0
    and strpos(coalesce(scenario_text, ''), chr(92) || 'n') = 0
    and strpos(coalesce(scenario_text, ''), chr(92) || 'r') = 0
    and strpos(coalesce(scenario_text, ''), chr(92) || 't') = 0
    and strpos(coalesce(question_text, ''), chr(92) || 'n') = 0
    and strpos(coalesce(question_text, ''), chr(92) || 'r') = 0
    and strpos(coalesce(question_text, ''), chr(92) || 't') = 0
  );

commit;
