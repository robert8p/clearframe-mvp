-- Repair visible escaped control characters in Cogni content and prevent them
-- from returning through later content imports.

create schema if not exists private;

create or replace function private.clean_display_text(p_value text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $function$
  with escaped as (
    select replace(
      replace(
        replace(
          replace(
            replace(
              replace(p_value, E'\r\n', E'\n'),
              E'\r', E'\n'
            ),
            E'\\r\\n', E'\n'
          ),
          E'\\n', E'\n'
        ),
        E'\\r', E'\n'
      ),
      E'\\t', ' '
    ) as value
  ), no_nbsp as (
    select replace(value, U&'\00A0', ' ') as value from escaped
  ), tidy_lines as (
    select regexp_replace(
      regexp_replace(value, E'[ \t]+\n', E'\n', 'g'),
      E'\n[ \t]+', E'\n', 'g'
    ) as value
    from no_nbsp
  )
  select btrim(
    regexp_replace(value, E'\n{3,}', E'\n\n', 'g'),
    E' \t\n'
  )
  from tidy_lines;
$function$;

create or replace function private.clean_display_jsonb(p_value jsonb)
returns jsonb
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $function$
declare
  v_result jsonb;
begin
  case jsonb_typeof(p_value)
    when 'string' then
      return to_jsonb(private.clean_display_text(p_value #>> '{}'));
    when 'array' then
      select coalesce(
        jsonb_agg(private.clean_display_jsonb(item.value) order by item.ordinality),
        '[]'::jsonb
      )
      into v_result
      from jsonb_array_elements(p_value) with ordinality as item(value, ordinality);
      return v_result;
    when 'object' then
      select coalesce(
        jsonb_object_agg(item.key, private.clean_display_jsonb(item.value)),
        '{}'::jsonb
      )
      into v_result
      from jsonb_each(p_value) as item(key, value);
      return v_result;
    else
      return p_value;
  end case;
end;
$function$;

alter function private.clean_display_text(text) owner to postgres;
alter function private.clean_display_jsonb(jsonb) owner to postgres;
revoke all on function private.clean_display_text(text) from public, anon, authenticated, service_role;
revoke all on function private.clean_display_jsonb(jsonb) from public, anon, authenticated, service_role;

-- Improve the reported question as well as replacing the visible `\n\n` import
-- artefact with intentional paragraph spacing.
update public.challenges
set prompt = 'A family group chat shares an AI-written message claiming that an expensive investment is “guaranteed”. The linked regulator page does not support that claim, and the message pressures everyone to act today.'
  || E'\n\n'
  || 'What would you do next?'
where content_key = 'v020_casual_capstone_safe_verification';

update public.challenges
set
  title = private.clean_display_text(title),
  prompt = private.clean_display_text(prompt),
  scenario_context = private.clean_display_text(scenario_context),
  scenario_text = private.clean_display_text(scenario_text),
  question_text = private.clean_display_text(question_text),
  options = private.clean_display_jsonb(options),
  interaction_config = private.clean_display_jsonb(interaction_config)
where row(title, prompt, scenario_context, scenario_text, question_text, options, interaction_config)
  is distinct from row(
    private.clean_display_text(title),
    private.clean_display_text(prompt),
    private.clean_display_text(scenario_context),
    private.clean_display_text(scenario_text),
    private.clean_display_text(question_text),
    private.clean_display_jsonb(options),
    private.clean_display_jsonb(interaction_config)
  );

update public.challenge_answer_keys
set
  explanation = private.clean_display_text(explanation),
  thinking_principle = private.clean_display_text(thinking_principle),
  application = private.clean_display_text(application),
  error_patterns = private.clean_display_jsonb(error_patterns),
  correct_answer = private.clean_display_jsonb(correct_answer)
where row(explanation, thinking_principle, application, error_patterns, correct_answer)
  is distinct from row(
    private.clean_display_text(explanation),
    private.clean_display_text(thinking_principle),
    private.clean_display_text(application),
    private.clean_display_jsonb(error_patterns),
    private.clean_display_jsonb(correct_answer)
  );

update public.daily_lessons
set
  title = private.clean_display_text(title),
  subtitle = private.clean_display_text(subtitle),
  scenario_context = private.clean_display_text(scenario_context),
  content = private.clean_display_jsonb(content)
where row(title, subtitle, scenario_context, content)
  is distinct from row(
    private.clean_display_text(title),
    private.clean_display_text(subtitle),
    private.clean_display_text(scenario_context),
    private.clean_display_jsonb(content)
  );

update public.skills
set
  name = private.clean_display_text(name),
  description = private.clean_display_text(description)
where row(name, description)
  is distinct from row(
    private.clean_display_text(name),
    private.clean_display_text(description)
  );

create or replace function private.normalize_challenge_display_copy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  new.title := private.clean_display_text(new.title);
  new.prompt := private.clean_display_text(new.prompt);
  new.scenario_context := private.clean_display_text(new.scenario_context);
  new.scenario_text := private.clean_display_text(new.scenario_text);
  new.question_text := private.clean_display_text(new.question_text);
  new.options := private.clean_display_jsonb(new.options);
  new.interaction_config := private.clean_display_jsonb(new.interaction_config);
  return new;
end;
$function$;

create or replace function private.normalize_answer_key_display_copy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  new.explanation := private.clean_display_text(new.explanation);
  new.thinking_principle := private.clean_display_text(new.thinking_principle);
  new.application := private.clean_display_text(new.application);
  new.error_patterns := private.clean_display_jsonb(new.error_patterns);
  new.correct_answer := private.clean_display_jsonb(new.correct_answer);
  return new;
end;
$function$;

create or replace function private.normalize_lesson_display_copy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  new.title := private.clean_display_text(new.title);
  new.subtitle := private.clean_display_text(new.subtitle);
  new.scenario_context := private.clean_display_text(new.scenario_context);
  new.content := private.clean_display_jsonb(new.content);
  return new;
end;
$function$;

create or replace function private.normalize_skill_display_copy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  new.name := private.clean_display_text(new.name);
  new.description := private.clean_display_text(new.description);
  return new;
end;
$function$;

alter function private.normalize_challenge_display_copy() owner to postgres;
alter function private.normalize_answer_key_display_copy() owner to postgres;
alter function private.normalize_lesson_display_copy() owner to postgres;
alter function private.normalize_skill_display_copy() owner to postgres;
revoke all on function private.normalize_challenge_display_copy() from public, anon, authenticated, service_role;
revoke all on function private.normalize_answer_key_display_copy() from public, anon, authenticated, service_role;
revoke all on function private.normalize_lesson_display_copy() from public, anon, authenticated, service_role;
revoke all on function private.normalize_skill_display_copy() from public, anon, authenticated, service_role;

drop trigger if exists normalize_challenge_display_copy on public.challenges;
create trigger normalize_challenge_display_copy
before insert or update of title, prompt, scenario_context, scenario_text, question_text, options, interaction_config
on public.challenges
for each row execute function private.normalize_challenge_display_copy();

drop trigger if exists normalize_answer_key_display_copy on public.challenge_answer_keys;
create trigger normalize_answer_key_display_copy
before insert or update of explanation, thinking_principle, application, error_patterns, correct_answer
on public.challenge_answer_keys
for each row execute function private.normalize_answer_key_display_copy();

drop trigger if exists normalize_lesson_display_copy on public.daily_lessons;
create trigger normalize_lesson_display_copy
before insert or update of title, subtitle, scenario_context, content
on public.daily_lessons
for each row execute function private.normalize_lesson_display_copy();

drop trigger if exists normalize_skill_display_copy on public.skills;
create trigger normalize_skill_display_copy
before insert or update of name, description
on public.skills
for each row execute function private.normalize_skill_display_copy();

comment on function private.clean_display_text(text) is
  'Normalises line endings, escaped control characters and excess blank space in Cogni display copy.';
comment on function private.clean_display_jsonb(jsonb) is
  'Recursively applies clean_display_text to JSON string values used by Cogni content.';

-- Fail the migration if cleaning is not idempotent across the full catalogue.
do $assertions$
begin
  if exists (
    select 1 from public.challenges
    where row(title, prompt, scenario_context, scenario_text, question_text, options, interaction_config)
      is distinct from row(
        private.clean_display_text(title),
        private.clean_display_text(prompt),
        private.clean_display_text(scenario_context),
        private.clean_display_text(scenario_text),
        private.clean_display_text(question_text),
        private.clean_display_jsonb(options),
        private.clean_display_jsonb(interaction_config)
      )
  ) then
    raise exception 'Challenge display-copy normalisation did not converge.';
  end if;

  if exists (
    select 1 from public.challenge_answer_keys
    where row(explanation, thinking_principle, application, error_patterns, correct_answer)
      is distinct from row(
        private.clean_display_text(explanation),
        private.clean_display_text(thinking_principle),
        private.clean_display_text(application),
        private.clean_display_jsonb(error_patterns),
        private.clean_display_jsonb(correct_answer)
      )
  ) then
    raise exception 'Answer-key display-copy normalisation did not converge.';
  end if;

  if exists (
    select 1 from public.daily_lessons
    where row(title, subtitle, scenario_context, content)
      is distinct from row(
        private.clean_display_text(title),
        private.clean_display_text(subtitle),
        private.clean_display_text(scenario_context),
        private.clean_display_jsonb(content)
      )
  ) then
    raise exception 'Lesson display-copy normalisation did not converge.';
  end if;

  if exists (
    select 1 from public.skills
    where row(name, description)
      is distinct from row(
        private.clean_display_text(name),
        private.clean_display_text(description)
      )
  ) then
    raise exception 'Skill display-copy normalisation did not converge.';
  end if;
end;
$assertions$;
