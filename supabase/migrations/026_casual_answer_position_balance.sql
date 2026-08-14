-- Cogni v0.20g — Balance answer positions for the Casual / personal-growth bank.
-- Deterministically rotates every four-option challenge and remaps all grading metadata.

with ranked as (
  select c.id,c.options,c.interaction_type,
    ((row_number() over (
      partition by case when c.interaction_type in ('single_choice','triage') then 'choice' else c.interaction_type end
      order by c.sort_order,c.id
    )-1) % 4)::integer as shift
  from public.challenges c
  where c.is_published and c.audience_segments=array['casual']::text[] and jsonb_array_length(c.options)=4
), rotated as (
  select id,interaction_type,shift,
    case shift
      when 0 then options
      when 1 then jsonb_build_array(options->1,options->2,options->3,options->0)
      when 2 then jsonb_build_array(options->2,options->3,options->0,options->1)
      else jsonb_build_array(options->3,options->0,options->1,options->2)
    end as options
  from ranked
)
update public.challenges c set options=r.options,updated_at=now() from rotated r where c.id=r.id;

with ranked as (
  select c.id,c.interaction_type,
    ((row_number() over (
      partition by case when c.interaction_type in ('single_choice','triage') then 'choice' else c.interaction_type end
      order by c.sort_order,c.id
    )-1) % 4)::integer as shift
  from public.challenges c
  where c.is_published and c.audience_segments=array['casual']::text[] and jsonb_array_length(c.options)=4
), remapped as (
  select r.id,
    case when r.interaction_type in ('single_choice','triage') then ((4-r.shift)%4) else null end as correct_index,
    case r.interaction_type
      when 'single_choice' then to_jsonb(((4-r.shift)%4))
      when 'triage' then to_jsonb(((4-r.shift)%4))
      when 'multi_select' then case r.shift when 0 then '[0,1]'::jsonb when 1 then '[0,3]'::jsonb when 2 then '[2,3]'::jsonb else '[1,2]'::jsonb end
      when 'ranking' then case r.shift when 0 then '[0,1,2,3]'::jsonb when 1 then '[3,0,1,2]'::jsonb when 2 then '[2,3,0,1]'::jsonb else '[1,2,3,0]'::jsonb end
      when 'classification' then case r.shift
        when 0 then '{"0":"strong","1":"strong","2":"weak","3":"weak"}'::jsonb
        when 1 then '{"0":"strong","1":"weak","2":"weak","3":"strong"}'::jsonb
        when 2 then '{"0":"weak","1":"weak","2":"strong","3":"strong"}'::jsonb
        else '{"0":"weak","1":"strong","2":"strong","3":"weak"}'::jsonb end
      else k.correct_answer end as correct_answer,
    coalesce((
      select jsonb_object_agg(g.new_index::text,k.error_patterns->x.old_index::text)
      from generate_series(0,3) as g(new_index)
      cross join lateral (select ((g.new_index+r.shift)%4) as old_index) x
      where k.error_patterns ? x.old_index::text
    ),'{}'::jsonb) as error_patterns
  from ranked r join public.challenge_answer_keys k on k.challenge_id=r.id
)
update public.challenge_answer_keys k
set correct_index=m.correct_index,correct_answer=m.correct_answer,error_patterns=m.error_patterns
from remapped m where k.challenge_id=m.id;

do $$
declare min_n integer; max_n integer; spread integer; malformed integer;
begin
  select min(n),max(n),max(n)-min(n) into min_n,max_n,spread from (
    select k.correct_index,count(*)::integer as n
    from public.challenges c join public.challenge_answer_keys k on k.challenge_id=c.id
    where c.is_published and c.audience_segments=array['casual']::text[] and c.interaction_type in ('single_choice','triage')
    group by k.correct_index
  ) positions;
  if min_n is null or spread>1 then raise exception 'Casual answer-position distribution is not balanced: min %, max %',min_n,max_n; end if;

  select count(*) into malformed
  from public.challenges c join public.challenge_answer_keys k on k.challenge_id=c.id
  where c.is_published and c.audience_segments=array['casual']::text[] and (
    (c.interaction_type in ('single_choice','triage') and (k.correct_index is null or k.correct_answer<>to_jsonb(k.correct_index)))
    or (c.interaction_type='multi_select' and jsonb_array_length(k.correct_answer)<>2)
    or (c.interaction_type='ranking' and jsonb_array_length(k.correct_answer)<>4)
    or (c.interaction_type='classification' and (select count(*) from jsonb_object_keys(k.correct_answer))<>4)
  );
  if malformed<>0 then raise exception 'Casual answer remapping produced % malformed answer keys',malformed; end if;
end $$;
