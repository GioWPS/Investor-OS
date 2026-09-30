# Architecture Reference

## Stack

- **Framework:** Next.js (App Router). Gives Gio server components, server actions, and API routes
  in one place — no separate backend service to stand up for something this size.
- **Backend/data:** Supabase (Postgres + Auth + Row Level Security). One provider for the database
  and auth means fewer moving parts for a solo-ish build, and RLS gives real per-user data isolation
  without hand-rolling authorization logic.
- **Hosting:** Vercel (pairs natively with Next.js) is the default assumption unless the user says
  otherwise.
- **Styling:** whatever component approach Gio is comfortable with (Tailwind is a reasonable default
  for speed), but the visual output must match Henry's existing Max Offer Calculator branding as the
  base style, with each tool given a distinct accent color. Don't let a framework choice drive the
  brand — the brand was decided first.

## Data model (minimum viable, expand as needed)

```sql
-- Supabase's auth.users table already exists once Supabase Auth is enabled.
-- Don't create a competing users table for identity — extend auth.users via a profile table instead.

create table profiles (
  id uuid references auth.users(id) primary key,
  email text not null,
  created_at timestamptz default now(),
  stage text  -- 'pre-deal' | '1-3-deals' | 'active' — mirrors the GHL stage tag, set from tool inputs
);

create table tool_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  tool text not null,              -- 'max_offer' | 'funding_path' | 'first_deal_blueprint'
  inputs jsonb not null,
  outputs jsonb not null,
  result_segment text,             -- e.g. 'hard_money', 'deal_verdict_good' — mirrors the GHL result tag
  created_at timestamptz default now()
);
```

Enable Row Level Security on both tables from the start — see `security-checklist.md`. A user should
only ever be able to read/write their own `profiles` row and their own `tool_results` rows.

Keep `inputs`/`outputs` as `jsonb` rather than a rigid column-per-field schema. Each tool has a
different shape of inputs and outputs, and jsonb lets a new tool drop in without a migration. The
dashboard just needs to know how to render each `tool` type's stored result.

## Page structure

```
/                       → marketing/redirect — real marketing lives in GHL, this can just route to /login or /dashboard
/login                  → sign in / create account / forgot password
/auth/callback          → Supabase auth callback handler (confirm-email + reset links)
/update-password        → set a new password (from the reset email)
/dashboard              → the toolkit dashboard: shows all tools, completion state, saved results, room for future tools
/tools/max-offer            → Max Offer Calculator (accent color per branding)
/tools/funding-path          → Funding Path Finder
/tools/first-deal-blueprint  → First Deal Blueprint
```

Each `/tools/*` page should follow the same internal pattern: a form/interaction step, a call into
that tool's pure logic module (see `ctos-migration-notes.md`), a save to `tool_results`, a webhook
fire to GHL (see `ghl-integration.md`), and a redirect/render of the result — plus a "you might also
want to try..." cross-promo block pointing at the next tool in the build order. This consistency is
what makes it cheap to add a fourth and fifth tool later.

## Build order and why

1. **Max Offer Calculator** — first, because an Excel MVP of its MAO logic already existed, making it
   the fastest real start and the first tool ported onto the platform. Real formula logic (Henry's
   MAO framework), no branching complexity.
2. **Funding Path Finder** — a branching decision tree, and its output (which funding path a user
   matches) is the single most valuable segmentation signal for GHL nurture and future sponsor
   placement.
3. **First Deal Blueprint** — the most synthesis-heavy tool; benefits from being built last since it
   can reference logic/patterns already proven out in the first two, and works best positioned as a
   capstone after a user has already engaged with the other two.

Build the dashboard shell and the GHL webhook integration alongside tool #1, not after all three
exist — the cross-tool behavior (discovery, tagging, dashboard state) needs to exist from the first
tool's launch, or it becomes a retrofit against live traffic.

**Working in parallel:** because each tool's logic is a pure, decoupled module (see
`ctos-migration-notes.md`), a tool's decision/calculation logic can be built and unit-tested in a
completely separate session from the app scaffold, then handed off for integration. If two people are
building at once (e.g. one on the Next.js/Supabase foundation, one on the Funding Path Finder's
decision tree), keep the pure-logic work in its own file/location until it's done, so the two sessions
never edit the same files. This is the payoff of the pure-function rule showing up early.
