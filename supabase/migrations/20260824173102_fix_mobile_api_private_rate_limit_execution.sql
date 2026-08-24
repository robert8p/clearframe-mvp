-- Fix the mobile API rate limiter's privilege boundary.
--
-- The authenticated Edge Function calls public.consume_mobile_api_rate_limit(...)
-- with the service_role client. The original function was SECURITY INVOKER but
-- its backing table lives in the locked private schema. service_role could
-- execute the function yet had no USAGE on private and no table privileges, so
-- every mobile API request failed before route handling with HTTP 500.
--
-- Keep the private schema/table inaccessible to service_role directly. Run the
-- narrowly exposed RPC as its postgres owner instead, retain an empty search
-- path, and continue granting EXECUTE only to service_role.

alter function public.consume_mobile_api_rate_limit(uuid, text, integer, integer)
  security definer;

alter function public.consume_mobile_api_rate_limit(uuid, text, integer, integer)
  owner to postgres;

alter function public.consume_mobile_api_rate_limit(uuid, text, integer, integer)
  set search_path = '';

revoke all on schema private from public, anon, authenticated, service_role;
revoke all on table private.mobile_api_rate_limits from public, anon, authenticated, service_role;

revoke execute on function public.consume_mobile_api_rate_limit(uuid, text, integer, integer)
  from public, anon, authenticated;

grant execute on function public.consume_mobile_api_rate_limit(uuid, text, integer, integer)
  to service_role;
