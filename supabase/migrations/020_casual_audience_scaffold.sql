-- Cogni v0.20a — Casual / personal-growth learning context scaffold.
-- Casual is a motivation/context segment, not an ability tier. Difficulty remains adaptive around 50.

create schema if not exists private;

insert into public.audience_segments(slug,label,description,icon,complexity_anchor,sort_order,is_active)
values ('casual','Casual / personal growth','Curiosity-led learning for everyday decisions, online information, AI use and personal growth.','🌱',50,0,true)
on conflict(slug) do update set label=excluded.label,description=excluded.description,icon=excluded.icon,
complexity_anchor=excluded.complexity_anchor,sort_order=excluded.sort_order,is_active=true;

create or replace function private._cogni_casual_render(template text,claim text,source_text text,decision_text text,alternative text)
returns text language sql immutable as $render$
select replace(replace(replace(replace(template,'{claim}',claim),'{source}',source_text),'{decision}',decision_text),'{alternative}',alternative)
$render$;

drop table if exists private._cogni_v020_casual_generated;
drop table if exists private._cogni_v020_casual_scenario;
drop table if exists private._cogni_v020_casual_skill;

create table private._cogni_v020_casual_skill(
 skill_order integer,skill_slug text,task_title text,question_text text,best_action text,second_action text,
 weak_action text,worst_action text,explanation text,thinking_principle text,difficulty_offset integer
);

create table private._cogni_v020_casual_scenario(
 scenario_order integer,scenario_key text,title text,scenario_text text,claim text,source_text text,
 decision_text text,alternative text,category text,function_tags text[],goal_tags text[],difficulty_offset integer
);

create table private._cogni_v020_casual_generated(
 content_key text,title text,prompt text,options jsonb,challenge_type text,interaction_type text,
 interaction_config jsonb,correct_index integer,correct_answer jsonb,difficulty integer,
 scenario_context text,scenario_category text,scenario_text text,question_text text,skill_slug text,
 explanation text,thinking_principle text,application text,function_tags text[],goal_tags text[],
 complexity_level smallint,sort_order integer
);
