-- Cogni v0.14 performance hardening. Access semantics are unchanged.
-- Cache auth.uid() once per statement inside RLS policies.

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select to authenticated using (id=(select auth.uid()));
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));

drop policy if exists "own responses readable" on public.user_responses;
create policy "own responses readable" on public.user_responses for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "own scores readable" on public.user_skill_scores;
create policy "own scores readable" on public.user_skill_scores for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "own error patterns readable" on public.user_error_patterns;
create policy "own error patterns readable" on public.user_error_patterns for select to authenticated using (user_id=(select auth.uid()));

drop policy if exists "own events insert" on public.analytics_events;
create policy "own events insert" on public.analytics_events for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "own events read" on public.analytics_events;
create policy "own events read" on public.analytics_events for select to authenticated using (user_id=(select auth.uid()));

drop policy if exists "own achievements readable" on public.user_achievements;
create policy "own achievements readable" on public.user_achievements for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "own training sessions readable" on public.training_sessions;
create policy "own training sessions readable" on public.training_sessions for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "own training session challenges readable" on public.training_session_challenges;
create policy "own training session challenges readable" on public.training_session_challenges for select to authenticated using (exists(select 1 from public.training_sessions s where s.id=training_session_challenges.session_id and s.user_id=(select auth.uid())));
drop policy if exists "own response skill updates readable" on public.user_response_skill_updates;
create policy "own response skill updates readable" on public.user_response_skill_updates for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "own lesson completions readable" on public.user_lesson_completions;
create policy "own lesson completions readable" on public.user_lesson_completions for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "own practice sessions read" on public.practice_sessions;
create policy "own practice sessions read" on public.practice_sessions for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "own practice assignments read" on public.practice_session_challenges;
create policy "own practice assignments read" on public.practice_session_challenges for select to authenticated using (exists(select 1 from public.practice_sessions ps where ps.id=practice_session_challenges.session_id and ps.user_id=(select auth.uid())));
drop policy if exists "own session feedback read" on public.session_feedback;
create policy "own session feedback read" on public.session_feedback for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "own session feedback insert" on public.session_feedback;
create policy "own session feedback insert" on public.session_feedback for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "own session feedback update" on public.session_feedback;
create policy "own session feedback update" on public.session_feedback for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create index if not exists idx_challenge_skill_mapping_skill on public.challenge_skill_mapping(skill_id);
create index if not exists idx_user_responses_challenge on public.user_responses(challenge_id);
create index if not exists idx_user_skill_scores_skill on public.user_skill_scores(skill_id);
create index if not exists idx_practice_session_challenges_challenge on public.practice_session_challenges(challenge_id);
create index if not exists idx_practice_sessions_skill on public.practice_sessions(skill_id);
create index if not exists idx_session_feedback_session on public.session_feedback(session_id);
create index if not exists idx_training_session_challenges_challenge on public.training_session_challenges(challenge_id);
create index if not exists idx_training_session_challenges_target_skill on public.training_session_challenges(target_skill_id) where target_skill_id is not null;
create index if not exists idx_training_sessions_lesson on public.training_sessions(lesson_id) where lesson_id is not null;
create index if not exists idx_user_achievements_achievement on public.user_achievements(achievement_id);
create index if not exists idx_user_lesson_completions_lesson on public.user_lesson_completions(lesson_id);
create index if not exists idx_user_response_skill_updates_skill on public.user_response_skill_updates(skill_id);
create index if not exists idx_ai_evaluations_challenge on public.ai_evaluations(challenge_id);
create index if not exists idx_ai_evaluations_user on public.ai_evaluations(user_id);
create index if not exists idx_organisation_members_user on public.organisation_members(user_id);

drop index if exists public.idx_events_name_created;
