-- ═══════════════════════════════════════════════════════════════════════════
-- Road to the Closing Table — Free Toolkit : data model + Row Level Security
-- Run this in the Supabase SQL editor (or via the Supabase CLI) on a fresh project.
-- Safe to re-run: everything is guarded with "if not exists" / "drop policy if exists".
--
-- The golden rule embodied here: RLS is ON from day one, and every policy scopes access
-- to the row's owner via auth.uid(). Without RLS, the anon key could read every user's
-- rows. WITH RLS + these policies, a logged-in user can only ever touch their own data.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── profiles ────────────────────────────────────────────────────────────────
-- One row per auth user. We do NOT create our own identity/users table; Supabase's
-- auth.users is the source of truth for identity. profiles just extends it with
-- app-specific fields (like investor stage).
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  first_name    text,          -- captured on the sign-up form (auth user metadata)
  last_name     text,
  stage         text check (stage in ('pre-deal', '1-3-deals', 'active')),
  ghl_synced_at timestamptz,   -- set once, the first time we fire the signup webhook to GHL
  created_at    timestamptz not null default now()
);

-- If profiles already exists from an earlier run, make sure the column is present.
alter table public.profiles add column if not exists ghl_synced_at timestamptz;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;

-- ── tool_results ─────────────────────────────────────────────────────────────
-- One row per tool completion. inputs/outputs are jsonb ON PURPOSE: each tool has a
-- different shape, and jsonb lets tool #4 / #5 drop in later with NO schema migration.
create table if not exists public.tool_results (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  tool           text not null check (tool in ('max_offer', 'funding_path', 'first_deal_blueprint')),
  inputs         jsonb not null,
  outputs        jsonb not null,
  result_segment text,   -- e.g. 'deal_verdict_good', 'hard_money' — mirrors the GHL result tag
  created_at     timestamptz not null default now()
);

create index if not exists tool_results_user_id_idx on public.tool_results (user_id);
create index if not exists tool_results_user_tool_idx on public.tool_results (user_id, tool);

-- ── sync_failures ─────────────────────────────────────────────────────────────
-- The GHL webhook is "fire-and-forget-but-logged": a GHL outage must never block a user
-- from seeing/saving their result. When a GHL call fails, we record it here so Gio can
-- see and replay it later, instead of silently losing the signal.
create table if not exists public.sync_failures (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  tool       text,
  payload    jsonb,     -- what we tried to send to GHL
  error      text,      -- why it failed
  created_at timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.tool_results  enable row level security;
alter table public.sync_failures enable row level security;

-- profiles: a user can read/insert/update ONLY their own row (id = auth.uid()).
drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- tool_results: a user can read + create ONLY their own results. Results are append-only
-- (no update/delete policy on purpose — a saved result is a historical record).
drop policy if exists "tool_results: select own" on public.tool_results;
create policy "tool_results: select own" on public.tool_results
  for select using (auth.uid() = user_id);

drop policy if exists "tool_results: insert own" on public.tool_results;
create policy "tool_results: insert own" on public.tool_results
  for insert with check (auth.uid() = user_id);

-- sync_failures: a user can create + read their own failure log entries. (No broad admin
-- read here yet; when Gio needs an ops view, add a separate admin-scoped policy/role.)
drop policy if exists "sync_failures: insert own" on public.sync_failures;
create policy "sync_failures: insert own" on public.sync_failures
  for insert with check (auth.uid() = user_id);

drop policy if exists "sync_failures: select own" on public.sync_failures;
create policy "sync_failures: select own" on public.sync_failures
  for select using (auth.uid() = user_id);

-- ── Auto-create a profile row when a new auth user signs up ─────────────────────
-- security definer so it can insert into public.profiles from the auth trigger context.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    nullif(left(trim(new.raw_user_meta_data ->> 'first_name'), 80), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'last_name'), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Lead Pipeline (added later — see supabase/leads.sql for the standalone migration) ──
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The property, as the user knows it ("614 Maple, Springdale") — also what we match
  -- against tool_results addresses to link deal reports.
  nickname text not null,
  contact_name text,
  contact_info text,        -- phone / email, freeform
  source text,              -- driving for dollars, referral, PropStream, etc.
  stage text not null default 'cold'
    check (stage in ('cold', 'warm', 'hot', 'under_contract', 'closed', 'dead')),
  notes text,
  next_follow_up date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS from day one, scoped to the owner (security checklist #2).
alter table public.leads enable row level security;

create policy "leads: select own" on public.leads
  for select using (auth.uid() = user_id);
create policy "leads: insert own" on public.leads
  for insert with check (auth.uid() = user_id);
create policy "leads: update own" on public.leads
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "leads: delete own" on public.leads
  for delete using (auth.uid() = user_id);

create index if not exists leads_user_stage_idx on public.leads (user_id, stage);
create index if not exists leads_user_follow_up_idx on public.leads (user_id, next_follow_up);
