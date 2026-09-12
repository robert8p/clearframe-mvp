insert into public.achievements(slug,name,description,criteria) values
  ('first-lesson','First Lesson','Complete your first Cogni lesson.','{"metric":"completed_lessons","target":1,"tone":"common"}'::jsonb),
  ('first-principles','First Principles','Earn 50 XP.','{"metric":"xp","target":50,"tone":"common"}'::jsonb),
  ('concept-explorer','Concept Explorer','Answer 25 Cogni questions.','{"metric":"answers","target":25,"tone":"uncommon"}'::jsonb),
  ('week-warrior','Week Warrior','Complete 5 learning sessions.','{"metric":"completed_sessions","target":5,"tone":"rare"}'::jsonb),
  ('seven-day-signal','Seven-Day Signal','Build a 7-day streak.','{"metric":"streak","target":7,"tone":"epic"}'::jsonb),
  ('evidence-habit','Evidence Habit','Earn 250 XP.','{"metric":"xp","target":250,"tone":"rare"}'::jsonb),
  ('mastery-builder','Mastery Builder','Measure progress in 5 topics.','{"metric":"measured_skills","target":5,"tone":"epic"}'::jsonb),
  ('galaxy-mind','Galaxy Mind','Reach mastery in 3 topics.','{"metric":"mastered_skills","target":3,"tone":"legendary"}'::jsonb)
on conflict(slug) do update set
  name=excluded.name,
  description=excluded.description,
  criteria=excluded.criteria;
