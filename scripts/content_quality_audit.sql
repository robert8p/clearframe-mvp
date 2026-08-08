-- Cogni audience/content quality audit. Safe read-only QA.
-- Run after content migrations and before release. Investigate any non-zero integrity issue,
-- any audience with <10 scenario categories, >20% concentration in one category, or relevance <80% once n>=10.
with published as (
  select c.*, lower(regexp_replace(trim(c.prompt),'\s+',' ','g')) norm_prompt
  from public.challenges c where c.is_published=true
), aud as (
  select p.*, a audience from published p
  cross join lateral unnest(case when p.audience_segments=ARRAY['all']::text[] then ARRAY['all']::text[] else p.audience_segments end) a
), scenario as (
  select audience,scenario_category,count(*) n,sum(count(*)) over(partition by audience) total
  from aud where audience<>'all' and not is_diagnostic group by audience,scenario_category
), phrase as (
  select audience,
    count(*) filter(where prompt ilike '%What should you do first to%') first_to,
    count(*) filter(where prompt ilike '%Choose the TWO actions that would best help you%') choose_two_template,
    count(*) filter(where prompt ilike '%Put the responses in order from most to least useful%') ranking_template,
    count(*) filter(where prompt ilike '%Sort each response by whether it helps or hurts%') sort_template,
    count(*) total
  from aud where audience<>'all' and not is_diagnostic group by audience
)
select jsonb_pretty(jsonb_build_object(
  'published_challenges',(select count(*) from published),
  'published_lessons',(select count(*) from public.daily_lessons where is_published=true),
  'duplicate_prompt_groups',(select count(*) from (select norm_prompt from published group by norm_prompt having count(*)>1)x),
  'missing_answer_keys',(select count(*) from published p left join public.challenge_answer_keys k on k.challenge_id=p.id where k.challenge_id is null),
  'missing_skill_mappings',(select count(*) from published p where not exists(select 1 from public.challenge_skill_mapping m where m.challenge_id=p.id)),
  'duplicate_option_questions',(select count(*) from published p where jsonb_typeof(p.options)='array' and (select count(*) from jsonb_array_elements_text(p.options))<>(select count(distinct lower(trim(x))) from jsonb_array_elements_text(p.options)x)),
  'generic_lesson_subtitles',(select count(*) from public.daily_lessons where is_published=true and lower(subtitle) in ('a short lesson for your learning context','audience-specific judgement practice')),
  'duplicate_lesson_reveals',(select count(*) from (select content->>'reveal' v from public.daily_lessons where is_published=true group by v having count(*)>2)x),
  'duplicate_lesson_ai_age',(select count(*) from (select content->>'ai_age' v from public.daily_lessons where is_published=true group by v having count(*)>2)x),
  'scenario_diversity',(select jsonb_agg(x order by audience) from (select audience,count(distinct scenario_category) categories,max(round(100.0*n/nullif(total,0),1)) max_category_pct from scenario group by audience)x),
  'legacy_template_signals',(select jsonb_agg(to_jsonb(phrase) order by audience) from phrase),
  'audience_mismatch_flags',jsonb_build_object(
    'student_executive_terms',(select count(*) from aud where audience='university_student' and not is_diagnostic and prompt ~* '(board paper|shareholder|capital allocation|employee performance review|M&A)'),
    'executive_student_terms',(select count(*) from aud where audience='executive' and not is_diagnostic and prompt ~* '(essay|assignment|classmate|module choice|graduate scheme)')
  ),
  'hybrid_diagnostic',(select jsonb_agg(x order by audience) from (select a.slug audience,
      (select count(*) from published p where p.is_diagnostic and p.diagnostic_role='core') core_available,
      (select count(*) from published p where p.is_diagnostic and p.diagnostic_role='audience_applied' and p.audience_segments@>array[a.slug]) applied_available
    from public.audience_segments a where a.is_active)x),
  'mcq_correct_positions',(select jsonb_object_agg(correct_index,n) from (select k.correct_index,count(*) n from public.challenge_answer_keys k join published p on p.id=k.challenge_id where p.interaction_type='single_choice' group by k.correct_index order by k.correct_index)x)
));
