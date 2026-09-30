-- Lead Pipeline (Pipeline Lite) — free-tier CRM table.
-- Additive migration: run this in the Supabase SQL editor on projects that already ran
-- schema.sql before it included the leads table.
--
-- Free tier = this table + the board UI + follow-up nudges + deal-report linking.
-- Automations, team sharing, email/SMS sending, and imports are PAID Closing Table OS
-- features — do not add columns/flows for them here.

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
