-- Cogni v0.20d — Casual starting check and integrated capstone.

insert into public.challenges(
 title,prompt,options,challenge_type,difficulty,is_diagnostic,confidence_required,industry,is_published,
 sort_order,interaction_type,interaction_config,audience_segments,scenario_context,content_key,
 function_tags,industry_tags,goal_tags,scenario_category,complexity_level,diagnostic_role,
 scenario_text,question_text,updated_at
) values
('The impressive product claim','A video says a home air-quality device removes “99% of harmful particles”, but the test was commissioned by the manufacturer and used a sealed laboratory room.\n\nWhat is the strongest next step before relying on the claim?','["Check the original test method, conditions and independent evidence relevant to real homes","Treat 99% as reliable because it is a precise number","Look only at whether the video presenter seems trustworthy","Assume a laboratory result must apply equally in every room"]'::jsonb,'scenario_mcq',49,true,true,null,true,21001,'single_choice','{"instructions":"Choose the strongest response."}'::jsonb,array['casual']::text[],'Everyday learner • product evidence','diag_casual_evidence','{}'::text[],'{}'::text[],array['make_better_everyday_decisions']::text[],'product evidence',2,'audience_applied','A video says a home air-quality device removes “99% of harmful particles”, but the test was commissioned by the manufacturer and used a sealed laboratory room.','What is the strongest next step before relying on the claim?',now()),
('The cheaper subscription','A new subscription is cheaper per month, so a friend says switching will definitely save money.\n\nWhich assumption most needs checking?','["That the cheaper monthly price remains cheaper after setup charges, minimum terms and features you would need to replace","That the company uses a modern logo","That subscriptions are paid monthly","That your friend prefers saving money"]'::jsonb,'scenario_mcq',49,true,true,null,true,21002,'single_choice','{"instructions":"Choose the strongest response."}'::jsonb,array['casual']::text[],'Everyday learner • everyday purchases','diag_casual_assumption','{}'::text[],'{}'::text[],array['make_better_everyday_decisions']::text[],'everyday purchases',2,'audience_applied','A new subscription is cheaper per month, so a friend says switching will definitely save money.','Which assumption most needs checking?',now()),
('The new morning routine','You start taking a vitamin and feel more energetic that week, but you also sleep an extra hour and drink less alcohol.\n\nWhat is the strongest conclusion?','["The improvement is encouraging, but the week does not separate the vitamin from the other changes or normal variation","The vitamin caused the improvement because it was new","Sleep cannot matter because you also took a vitamin","Every change caused exactly one-third of the improvement"]'::jsonb,'scenario_mcq',50,true,true,null,true,21003,'single_choice','{"instructions":"Choose the strongest response."}'::jsonb,array['casual']::text[],'Everyday learner • personal data and habits','diag_casual_cause','{}'::text[],'{}'::text[],array['make_better_everyday_decisions']::text[],'personal data and habits',2,'audience_applied','You start taking a vitamin and feel more energetic that week, but you also sleep an extra hour and drink less alcohol.','What is the strongest conclusion?',now()),
('The AI cancellation rule','An AI assistant says you can cancel a holiday booking for free and quotes a policy clause, but the booking provider’s current terms use different wording.\n\nWhat is the strongest next step?','["Check the current provider terms and your booking conditions before relying on the AI answer","Ask the AI to repeat the clause with more confidence","Assume the AI has access to a newer private policy","Book another trip before checking"]'::jsonb,'scenario_mcq',51,true,true,null,true,21004,'single_choice','{"instructions":"Choose the strongest response."}'::jsonb,array['casual']::text[],'Everyday learner • AI and travel','diag_casual_ai','{}'::text[],'{}'::text[],array['make_better_everyday_decisions']::text[],'AI and travel',2,'audience_applied','An AI assistant says you can cancel a holiday booking for free and quotes a policy clause, but the booking provider’s current terms use different wording.','What is the strongest next step?',now()),
('The weather-dependent event','You are planning an outdoor gathering. Rain is possible but the forecast is changing and cancelling today would lose a deposit.\n\nWhat is the strongest response?','["Set a decision deadline, compare the cost of each outcome and prepare a workable backup plan","Wait for complete certainty even if the deadline passes","Cancel immediately because any rain is possible","Ignore the forecast and present the outdoor plan as guaranteed"]'::jsonb,'scenario_mcq',50,true,true,null,true,21005,'single_choice','{"instructions":"Choose the strongest response."}'::jsonb,array['casual']::text[],'Everyday learner • planning under uncertainty','diag_casual_uncertainty','{}'::text[],'{}'::text[],array['make_better_everyday_decisions']::text[],'planning under uncertainty',2,'audience_applied','You are planning an outdoor gathering. Rain is possible but the forecast is changing and cancelling today would lose a deposit.','What is the strongest response?',now())
on conflict(content_key) where content_key is not null do update set
 title=excluded.title,prompt=excluded.prompt,options=excluded.options,challenge_type=excluded.challenge_type,
 difficulty=excluded.difficulty,is_diagnostic=true,confidence_required=true,is_published=true,
 sort_order=excluded.sort_order,interaction_type=excluded.interaction_type,
 interaction_config=excluded.interaction_config,audience_segments=excluded.audience_segments,
 scenario_context=excluded.scenario_context,function_tags=excluded.function_tags,
 industry_tags=excluded.industry_tags,goal_tags=excluded.goal_tags,
 scenario_category=excluded.scenario_category,complexity_level=excluded.complexity_level,
 diagnostic_role=excluded.diagnostic_role,scenario_text=excluded.scenario_text,
 question_text=excluded.question_text,updated_at=now();

create temporary table tmp_v023_casual_diag(
 content_key text,correct_index integer,correct_answer jsonb,explanation text,
 thinking_principle text,application text,skill_slug text
) on commit drop;
insert into tmp_v023_casual_diag values
('diag_casual_evidence',0,'0'::jsonb,'A precise result can be real under narrow conditions without supporting the broader everyday claim.','Match the evidence method and conditions to the decision you actually face.','Use this whenever a product or health claim depends on a striking statistic.','evidence-evaluation'),
('diag_casual_assumption',0,'0'::jsonb,'The conclusion depends on total cost and usable value, not the headline monthly price alone.','Find the hidden condition connecting a headline fact to the proposed choice.','Use this before acting on “cheaper”, “faster” or “better value” claims.','assumption-identification'),
('diag_casual_cause',0,'0'::jsonb,'Several changes occurred together, so the pattern does not identify a single cause.','Treat a before-and-after pattern as a clue until alternative causes are tested.','Use this when interpreting personal trackers, habits and wellbeing changes.','correlation-causation'),
('diag_casual_ai',0,'0'::jsonb,'The authoritative current terms, not the fluency of the AI response, determine the booking rights.','Verify the detail that carries the consequence against the current authoritative source.','Use this for travel, money, health, legal or other consequential AI answers.','ai-output-verification'),
('diag_casual_uncertainty',0,'0'::jsonb,'A threshold, deadline and backup plan allow action without pretending uncertainty has disappeared.','Make uncertainty visible, set an action threshold and preserve options where possible.','Use this when delay, reversal and downside have different costs.','decision-uncertainty');

insert into public.challenge_answer_keys(challenge_id,correct_index,correct_answer,explanation,thinking_principle,application,error_patterns)
select c.id,d.correct_index,d.correct_answer,d.explanation,d.thinking_principle,d.application,
       '{"1":"surface_cue","2":"authority_guess","3":"unsupported_certainty"}'::jsonb
from tmp_v023_casual_diag d join public.challenges c on c.content_key=d.content_key
on conflict(challenge_id) do update set correct_index=excluded.correct_index,correct_answer=excluded.correct_answer,
 explanation=excluded.explanation,thinking_principle=excluded.thinking_principle,
 application=excluded.application,error_patterns=excluded.error_patterns;

insert into public.challenge_skill_mapping(challenge_id,skill_id,weight)
select c.id,s.id,1 from tmp_v023_casual_diag d join public.challenges c on c.content_key=d.content_key join public.skills s on s.slug=d.skill_slug
on conflict(challenge_id,skill_id) do update set weight=excluded.weight;

insert into public.challenges(
 title,prompt,options,challenge_type,difficulty,is_diagnostic,confidence_required,industry,is_published,
 sort_order,interaction_type,interaction_config,audience_segments,scenario_context,content_key,
 function_tags,industry_tags,goal_tags,scenario_category,complexity_level,diagnostic_role,
 scenario_text,question_text,updated_at
) values (
 'The urgent group-chat recommendation','A family group chat shares an AI-written message recommending an expensive investment as “guaranteed”. The cited regulator page does not contain the claim, and the message urges everyone to act today.\n\nWhat would you do next?','["Pause, verify the product and firm through authoritative sources, check the claimed evidence and incentives, and do not commit money or share sensitive information while the facts remain unclear","Ask the same AI to make the recommendation more detailed and treat the added detail as confirmation","Invest a small amount immediately because that limits the risk while testing whether the claim is true","Act because a trusted family member shared it and the regulator link looks official"]'::jsonb,'audience_scenario',54,false,true,null,true,21999,
 'triage','{"instructions":"Choose the action you would take next."}'::jsonb,array['casual']::text[],
 'Everyday learner • Money and AI claims','v020_casual_capstone_safe_verification',array['money_purchases','technology_ai','relationships_communication']::text[],
 '{}'::text[],array['use_ai_wisely','spot_misleading_claims','make_better_everyday_decisions']::text[],
 'money and AI claims',3,null,'A family group chat shares an AI-written message recommending an expensive investment as “guaranteed”. The cited regulator page does not contain the claim, and the message urges everyone to act today.','What would you do next?',now()
)
on conflict(content_key) where content_key is not null do update set
 title=excluded.title,prompt=excluded.prompt,options=excluded.options,challenge_type=excluded.challenge_type,
 difficulty=excluded.difficulty,is_diagnostic=false,confidence_required=true,is_published=true,
 sort_order=excluded.sort_order,interaction_type=excluded.interaction_type,
 interaction_config=excluded.interaction_config,audience_segments=excluded.audience_segments,
 scenario_context=excluded.scenario_context,function_tags=excluded.function_tags,
 industry_tags=excluded.industry_tags,goal_tags=excluded.goal_tags,
 scenario_category=excluded.scenario_category,complexity_level=excluded.complexity_level,
 diagnostic_role=null,scenario_text=excluded.scenario_text,question_text=excluded.question_text,updated_at=now();

insert into public.challenge_answer_keys(challenge_id,correct_index,correct_answer,explanation,thinking_principle,application,error_patterns)
select c.id,0,'0'::jsonb,'The strongest response combines source tracing, AI verification, pressure awareness, downside control and human responsibility for a consequential choice.','Increase verification and human control as a decision becomes more consequential, sensitive or difficult to reverse.','Use this integrated check before acting on urgent health, money, rights or safety claims.',
       '{"1":"ai_consistency_as_proof","2":"small_stake_as_verification","3":"trusted_sender_shortcut"}'::jsonb
from public.challenges c where c.content_key='v020_casual_capstone_safe_verification'
on conflict(challenge_id) do update set correct_index=excluded.correct_index,correct_answer=excluded.correct_answer,
 explanation=excluded.explanation,thinking_principle=excluded.thinking_principle,
 application=excluded.application,error_patterns=excluded.error_patterns;

insert into public.challenge_skill_mapping(challenge_id,skill_id,weight)
select c.id,s.id,w.weight from public.challenges c
cross join (values ('critical-thinking',0.25::numeric),('source-quality',0.25::numeric),('ai-output-verification',0.25::numeric),('decision-uncertainty',0.25::numeric)) as w(skill_slug,weight)
join public.skills s on s.slug=w.skill_slug
where c.content_key='v020_casual_capstone_safe_verification'
on conflict(challenge_id,skill_id) do update set weight=excluded.weight;
