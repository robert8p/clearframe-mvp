-- Prevent duplicate published challenge wording from re-entering the live question bank.
-- Existing duplicate rows were retired in production before this migration was recorded.
create unique index if not exists challenges_published_prompt_unique_idx
on public.challenges ((lower(regexp_replace(btrim(prompt), '\s+', ' ', 'g'))))
where is_published = true;
