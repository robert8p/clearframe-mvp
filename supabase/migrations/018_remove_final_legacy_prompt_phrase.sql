-- Final v0.14 legacy-template cleanup.
update public.challenges
set prompt=regexp_replace(prompt,'Choose the TWO actions that would best help you (.*) at work\.$','Pick the TWO actions that would make your response most defensible by helping you \1.','i'),updated_at=now()
where is_published=true and not is_diagnostic and challenge_type='judgement_scenario' and audience_segments@>array['graduate_early_career'] and interaction_type='multi_select' and prompt ~* 'Choose the TWO actions that would best help you .* at work\.$';
