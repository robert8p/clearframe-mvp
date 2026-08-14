-- Cogni v0.20c — Casual scenario templates and 120-challenge bank.
-- Generated as 8 practical everyday contexts × all 15 Cogni judgement skills.

truncate table private._cogni_v020_casual_scenario;
insert into private._cogni_v020_casual_scenario(
  scenario_order,scenario_key,title,scenario_text,claim,source_text,decision_text,alternative,
  category,function_tags,goal_tags,difficulty_offset
) values
(1,'wellness','The viral focus supplement','A popular creator says a supplement improves concentration because they felt sharper after taking it for three days, and thousands of comments agree.','the supplement improves concentration','the creator’s testimonial and comments','taking or recommending the supplement','placebo effects, sleep changes or self-selection','health and wellbeing',array['health_wellbeing','news_media']::text[],array['spot_misleading_claims','make_better_everyday_decisions']::text[],-2),
(2,'reviews','The five-star purchase','You are choosing an expensive air purifier. One model has 4.9 stars from 38 reviews, another has 4.5 stars from 2,400 reviews, and the top review for the first model is sponsored.','the first model is the better purchase','the ratings and sponsored review','spending the money on the purifier','review selection, sponsorship or different patterns of use','purchases and reviews',array['money_purchases','news_media']::text[],array['make_better_everyday_decisions','spot_misleading_claims']::text[],0),
(3,'travel_ai','The AI travel plan','An AI assistant builds a late-night journey and states the last train leaves at 23:40, but the operator’s website warns of engineering works that evening.','the AI journey will work as planned','the AI answer and the operator notice','relying on the route for the trip','a changed timetable, replacement bus or cancelled service','AI and travel',array['technology_ai','travel_planning']::text[],array['use_ai_wisely','make_better_everyday_decisions']::text[],1),
(4,'news_chart','The dramatic crime chart','A widely shared post says local crime doubled this year, using two months of data and a chart whose vertical axis begins close to the previous value.','local crime has meaningfully doubled','the post’s short data window and chart','supporting a major response to the claimed increase','seasonal variation, a small starting number or selectively chosen dates','news and charts',array['news_media','community_civic']::text[],array['understand_news_online','spot_misleading_claims']::text[],1),
(5,'community','The neighbourhood camera proposal','After one widely discussed theft, a neighbourhood group wants to spend most of its annual budget on cameras even though the full-year incident count has not risen.','cameras are the best use of the group’s budget','the recent incident and the unchanged annual data','committing most of the budget to cameras','other safety measures, prevention needs or a memorable-event effect','community decisions',array['community_civic','relationships_communication']::text[],array['make_better_everyday_decisions','ask_better_questions']::text[],2),
(6,'privacy_app','The “free” wellbeing app','A free wellbeing app promises personalised advice but asks for contacts, precise location and permission to share data indefinitely with partners.','the app is worth using because it is free and personalised','the app’s promise and its data terms','installing it and granting the requested permissions','privacy costs, narrower permissions or a less intrusive service','apps and privacy',array['technology_ai','health_wellbeing']::text[],array['use_ai_wisely','make_better_everyday_decisions']::text[],1),
(7,'sleep_tracker','The sleep-tracker pattern','Your sleep-tracker score is higher on days you exercise, and you conclude exercise caused the improvement, although those days are also weekends with an earlier bedtime.','exercise caused the better sleep score','your tracker pattern','changing your routine based on that conclusion','weekend timing, earlier bedtime or tracker measurement error','personal data and habits',array['health_wellbeing','personal_growth']::text[],array['think_more_clearly','make_better_everyday_decisions']::text[],0),
(8,'money_tip','The urgent investment tip','A family group chat shares an AI-written summary claiming an unfamiliar investment is “guaranteed to double”. It cites a regulator page that does not contain the claim and urges everyone to act today.','the investment is guaranteed to double','the AI-written summary, family message and unrelated regulator page','investing or encouraging others to invest immediately','fabricated detail, an unregulated product, incentives or pressure tactics','money and AI claims',array['money_purchases','technology_ai','relationships_communication']::text[],array['use_ai_wisely','spot_misleading_claims','make_better_everyday_decisions']::text[],2);

truncate table private._cogni_v020_casual_generated;

with rendered as (
  select
    'v020_casual_'||sc.scenario_key||'_'||sk.skill_slug as content_key,
    sc.title||' — '||sk.task_title as title,
    private._cogni_casual_render(sk.question_text,sc.claim,sc.source_text,sc.decision_text,sc.alternative) as question_text,
    sc.scenario_text,
    sc.title as scenario_title,
    sc.category,
    sc.function_tags,
    sc.goal_tags,
    sk.skill_slug,
    sk.skill_order,
    sc.scenario_order,
    private._cogni_casual_render(sk.best_action,sc.claim,sc.source_text,sc.decision_text,sc.alternative) as best_action,
    private._cogni_casual_render(sk.second_action,sc.claim,sc.source_text,sc.decision_text,sc.alternative) as second_action,
    private._cogni_casual_render(sk.weak_action,sc.claim,sc.source_text,sc.decision_text,sc.alternative) as weak_action,
    private._cogni_casual_render(sk.worst_action,sc.claim,sc.source_text,sc.decision_text,sc.alternative) as worst_action,
    sk.explanation,
    sk.thinking_principle,
    greatest(44,least(57,50+sc.difficulty_offset+sk.difficulty_offset)) as difficulty,
    case
      when sc.scenario_order in (1,2,7) then 'single_choice'
      when sc.scenario_order=3 then 'multi_select'
      when sc.scenario_order=4 then 'classification'
      when sc.scenario_order=5 then 'ranking'
      when sc.scenario_order=6 then 'triage'
      when sc.scenario_order=8 and sk.skill_order between 1 and 5 then 'single_choice'
      when sc.scenario_order=8 and sk.skill_order between 6 and 7 then 'classification'
      when sc.scenario_order=8 and sk.skill_order between 8 and 10 then 'multi_select'
      when sc.scenario_order=8 and sk.skill_order between 11 and 14 then 'ranking'
      else 'triage'
    end as interaction_type
  from private._cogni_v020_casual_scenario sc
  cross join private._cogni_v020_casual_skill sk
), shaped as (
  select *,
    jsonb_build_array(best_action,second_action,weak_action,worst_action) as options,
    case interaction_type
      when 'multi_select' then jsonb_build_object('instructions','Choose exactly 2 responses.','requiredSelections',2)
      when 'ranking' then jsonb_build_object('instructions','Tap responses from strongest to weakest. Tap a ranked response to remove it.')
      when 'classification' then jsonb_build_object(
        'instructions','Assign every response to one group.',
        'categories',jsonb_build_array(
          jsonb_build_object('id','strong','label','Useful check'),
          jsonb_build_object('id','weak','label','Weak shortcut')
        )
      )
      when 'triage' then jsonb_build_object('instructions','Choose the action you would take next.')
      else jsonb_build_object('instructions','Choose the strongest response.')
    end as interaction_config,
    case when interaction_type in ('single_choice','triage') then 0 else null end as correct_index,
    case interaction_type
      when 'multi_select' then '[0,1]'::jsonb
      when 'ranking' then '[0,1,2,3]'::jsonb
      when 'classification' then '{"0":"strong","1":"strong","2":"weak","3":"weak"}'::jsonb
      else '0'::jsonb
    end as correct_answer,
    case when difficulty<=48 then 1 when difficulty<=53 then 2 else 3 end::smallint as complexity_level,
    20000+scenario_order*100+skill_order as sort_order
  from rendered
)
insert into private._cogni_v020_casual_generated(
  content_key,title,prompt,options,challenge_type,interaction_type,interaction_config,
  correct_index,correct_answer,difficulty,scenario_context,scenario_category,scenario_text,
  question_text,skill_slug,explanation,thinking_principle,application,function_tags,goal_tags,
  complexity_level,sort_order
)
select
  content_key,title,scenario_text||E'\n\n'||question_text,options,'judgement_scenario',interaction_type,
  interaction_config,correct_index,correct_answer,difficulty,'Everyday learner • '||scenario_title,
  category,scenario_text,question_text,skill_slug,explanation,thinking_principle,
  'Use this thinking move when judging '||category||' information or choices.',function_tags,goal_tags,
  complexity_level,sort_order
from shaped;

insert into public.challenges(
  title,prompt,options,challenge_type,difficulty,is_diagnostic,confidence_required,industry,
  is_published,sort_order,interaction_type,interaction_config,audience_segments,scenario_context,
  content_key,function_tags,industry_tags,goal_tags,scenario_category,complexity_level,
  diagnostic_role,scenario_text,question_text,updated_at
)
select
  g.title,g.prompt,g.options,g.challenge_type,g.difficulty,false,true,null,true,g.sort_order,
  g.interaction_type,g.interaction_config,array['casual']::text[],g.scenario_context,g.content_key,
  g.function_tags,'{}'::text[],g.goal_tags,g.scenario_category,g.complexity_level,null,
  g.scenario_text,g.question_text,now()
from private._cogni_v020_casual_generated g
on conflict(content_key) where content_key is not null do update set
  title=excluded.title,prompt=excluded.prompt,options=excluded.options,challenge_type=excluded.challenge_type,
  difficulty=excluded.difficulty,is_diagnostic=false,confidence_required=true,is_published=true,
  sort_order=excluded.sort_order,interaction_type=excluded.interaction_type,
  interaction_config=excluded.interaction_config,audience_segments=excluded.audience_segments,
  scenario_context=excluded.scenario_context,function_tags=excluded.function_tags,
  industry_tags=excluded.industry_tags,goal_tags=excluded.goal_tags,
  scenario_category=excluded.scenario_category,complexity_level=excluded.complexity_level,
  diagnostic_role=null,scenario_text=excluded.scenario_text,question_text=excluded.question_text,updated_at=now();

insert into public.challenge_answer_keys(
  challenge_id,correct_index,explanation,thinking_principle,application,error_patterns,correct_answer
)
select c.id,g.correct_index,g.explanation,g.thinking_principle,g.application,
  jsonb_build_object('1','incomplete_check','2','surface_cue','3','unverified_action'),g.correct_answer
from private._cogni_v020_casual_generated g join public.challenges c on c.content_key=g.content_key
on conflict(challenge_id) do update set
  correct_index=excluded.correct_index,explanation=excluded.explanation,
  thinking_principle=excluded.thinking_principle,application=excluded.application,
  error_patterns=excluded.error_patterns,correct_answer=excluded.correct_answer;

insert into public.challenge_skill_mapping(challenge_id,skill_id,weight)
select c.id,s.id,1
from private._cogni_v020_casual_generated g
join public.challenges c on c.content_key=g.content_key
join public.skills s on s.slug=g.skill_slug
on conflict(challenge_id,skill_id) do update set weight=excluded.weight;

do $$
declare n integer; mapped integer; keyed integer;
begin
  select count(*) into n from public.challenges where is_published and content_key like 'v020_casual_%' and content_key not like '%capstone%';
  if n<>120 then raise exception 'Casual generated challenge bank expected 120 rows, found %',n; end if;
  select count(*) into mapped from private._cogni_v020_casual_generated g join public.challenges c on c.content_key=g.content_key join public.challenge_skill_mapping m on m.challenge_id=c.id;
  if mapped<>120 then raise exception 'Casual generated challenge bank expected 120 skill mappings, found %',mapped; end if;
  select count(*) into keyed from private._cogni_v020_casual_generated g join public.challenges c on c.content_key=g.content_key join public.challenge_answer_keys k on k.challenge_id=c.id;
  if keyed<>120 then raise exception 'Casual generated challenge bank expected 120 answer keys, found %',keyed; end if;
end $$;
