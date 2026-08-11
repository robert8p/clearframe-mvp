create or replace function public.award_xp_and_maybe_streak(
  p_user_id uuid,
  p_xp_earned integer,
  p_completed_core_training boolean,
  p_today date,
  p_yesterday date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_xp_earned < 0 then
    raise exception 'XP earned cannot be negative';
  end if;

  update public.profiles
  set
    xp = xp + p_xp_earned,
    current_streak = case
      when p_completed_core_training and last_session_date is distinct from p_today then
        case
          when last_session_date = p_yesterday then current_streak + 1
          else 1
        end
      else current_streak
    end,
    last_session_date = case
      when p_completed_core_training and last_session_date is distinct from p_today then p_today
      else last_session_date
    end,
    updated_at = now()
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke execute on function public.award_xp_and_maybe_streak(uuid, integer, boolean, date, date) from public, anon, authenticated;
grant execute on function public.award_xp_and_maybe_streak(uuid, integer, boolean, date, date) to service_role;
