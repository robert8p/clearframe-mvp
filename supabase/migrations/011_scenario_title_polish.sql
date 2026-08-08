-- Cogni v0.13: keep learner-facing question titles short and scenario-led.
-- Audience and skill metadata remain stored separately, so no targeting or scoring data is lost.
update public.challenges
set title = trim(regexp_replace(
  title,
  '^(University student|Graduate / early career|Junior professional|Management|Executive)\s*·\s*[^·]+\s*·\s*',
  '',
  'i'
)),
updated_at = now()
where is_published = true
  and title ~* '^(University student|Graduate / early career|Junior professional|Management|Executive)\s*·\s*[^·]+\s*·\s*';
