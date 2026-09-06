-- Reconcile the server-only support queue with the Cogni 0.4.0 mobile API.
-- The table pre-dated repository migration tracking, so this migration is
-- intentionally idempotent and preserves both the earlier web/support topics
-- and the subscription-focused mobile topics.

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  category text not null,
  message text not null,
  app_version text,
  platform text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.support_requests
  drop constraint if exists support_request_identity,
  drop constraint if exists support_requests_category_check,
  drop constraint if exists support_requests_message_check,
  drop constraint if exists support_requests_platform_check,
  drop constraint if exists support_requests_status_check;

alter table public.support_requests
  add constraint support_request_identity
    check (user_id is not null or email is not null),
  add constraint support_requests_category_check
    check (category in (
      'general', 'technical', 'content', 'privacy', 'account_deletion',
      'accessibility', 'enterprise', 'account', 'subscription', 'billing',
      'learning', 'bug', 'other'
    )),
  add constraint support_requests_message_check
    check (char_length(message) between 10 and 4000),
  add constraint support_requests_platform_check
    check (platform is null or platform in ('ios', 'android', 'web')),
  add constraint support_requests_status_check
    check (status in ('open', 'in_progress', 'resolved', 'closed'));

create index if not exists idx_support_requests_status_created_at
  on public.support_requests (status, created_at desc);
create index if not exists idx_support_requests_user_id
  on public.support_requests (user_id)
  where user_id is not null;
create index if not exists idx_support_requests_email
  on public.support_requests (lower(email))
  where email is not null;

alter table public.support_requests enable row level security;
revoke all on table public.support_requests from public, anon, authenticated;
grant all privileges on table public.support_requests to service_role;

comment on table public.support_requests is
  'Private server-owned support queue. Mobile and web clients submit only through trusted server APIs and cannot read the queue directly.';
