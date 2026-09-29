# Road to the Closing Table — Free Investor Toolkit

A standalone Next.js + Supabase web app: the free front door into Henry Washington's
ecosystem, and **Phase 0 of Closing Table OS**. Three tools with real saved history and a
dashboard — Max Offer Calculator, Funding Path Finder, First Deal Blueprint.

> Architecture is locked. Read `FREE-TOOLKIT-PROJECT-SPEC.md` and
> `.claude/skills/closing-table-toolkit-builder/` before making structural changes — don't
> re-derive decisions that were made deliberately there.

## Stack

- **Next.js (App Router)** — server components, server actions, route handlers in one place
- **Supabase** — Postgres + Auth + Row Level Security (per-user data isolation)
- **Auth** — email + password (Supabase Auth; email confirmation on signup, emailed password reset). Changed from magic-link by Tazz's decision, Sep 2026.
- **Hosting** — Vercel (prod), local for dev
- **GHL** — one-way webhook (app → GHL) for CRM tagging. GHL never calls the app for anything auth-critical.

## Local setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a Supabase project (free tier is fine for dev), then copy the env template:
   ```bash
   cp .env.example .env.local
   ```
   Fill in the Supabase URL + keys. See `.env.example` for what each variable is and which are server-only.
3. Apply the database schema (creates `profiles`, `tool_results`, `sync_failures` with RLS on):
   run `supabase/schema.sql` in the Supabase SQL editor.
4. Start the dev server:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

## The one rule that matters most

Every tool's calculation/decision logic lives as a **pure, isolated module** in `lib/tools/<tool>.ts`
— no React, no Supabase, no Next.js imports. Pages only collect inputs, call the pure function, save
the result, fire the GHL webhook, and render. This is what lets the logic be *lifted* into Closing
Table OS later instead of rewritten.

## Layout

```
app/
  login/                  sign in / create account / forgot password
  update-password/        set a new password (from the reset email)
  auth/callback/          Supabase auth callback (code -> session)
  dashboard/              the toolkit dashboard (protected)
  tools/max-offer/        Max Offer Calculator
lib/
  tools/                  PURE logic modules (portable to CTOS)
  supabase/               browser + server Supabase clients
  ghl.ts                  one-way webhook to GHL (fire-and-forget-but-logged)
supabase/
  schema.sql              data model + RLS policies
```
