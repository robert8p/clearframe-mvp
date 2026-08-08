-- Cogni v0.13 security hardening.
-- handle_new_user is invoked by the auth.users trigger and should not be callable as a public RPC.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
