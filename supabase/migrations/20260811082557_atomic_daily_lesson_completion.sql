create or replace function public.complete_daily_lesson_with_xp(
  p_user_id uuid,
  p_lesson_id uuid,
  p_lesson_date date,
  p_completed_at timestamptz,
  p_xp_award integer default 5
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_id uuid;
begin
  if p_xp_award < 0 then
    raise exception 'XP award cannot be negative';
  end if;

  insert into public.user_lesson_completions (
    user_id,
    lesson_id,
    lesson_date,
    completed_at
  ) values (
    p_user_id,
    p_lesson_id,
    p_lesson_date,
    p_completed_at
  )
  on conflict (user_id, lesson_date) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return 0;
  end if;

  update public.profiles
  set xp = xp + p_xp_award,
      updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;

  return p_xp_award;
end;
$$;

revoke execute on function public.complete_daily_lesson_with_xp(uuid, uuid, date, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.complete_daily_lesson_with_xp(uuid, uuid, date, timestamptz, integer) to service_role;
