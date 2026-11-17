-- Calculator signup from the GHL page (POST /api/calculator-signup).
-- Additive migration. Both tables have RLS ON and NO policies: only the server's secret
-- (service role) key can touch them — browsers and signed-in users can't read or write.

-- A run submitted with the email of an EXISTING account. Anyone can type any email, so it
-- isn't attached to that account until the owner clicks the sign-in link GHL emails them;
-- then /auth/confirm moves it into tool_results (same id, so the link can point at it).
create table if not exists public.pending_runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  tool           text not null,
  inputs         jsonb not null,
  outputs        jsonb not null,
  result_segment text,
  created_at     timestamptz not null default now(),
  claimed_at     timestamptz
);
alter table public.pending_runs enable row level security;
create index if not exists pending_runs_user_unclaimed_idx
  on public.pending_runs (user_id) where claimed_at is null;

-- One row per signup attempt, keyed by "ip:<addr>" or "email:<addr>", for rate limiting.
-- Rows older than a day are pruned by the endpoint.
create table if not exists public.rate_limit_events (
  id         bigserial primary key,
  key        text not null,
  created_at timestamptz not null default now()
);
alter table public.rate_limit_events enable row level security;
create index if not exists rate_limit_events_key_time_idx
  on public.rate_limit_events (key, created_at);
