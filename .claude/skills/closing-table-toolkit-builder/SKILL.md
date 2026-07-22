---
name: closing-table-toolkit-builder
description: Guide for building and reviewing the "Road to the Closing Table Free Toolkit" — Henry Washington's standalone Next.js + Supabase web app (Max Offer Calculator, Funding Path Finder, First Deal Blueprint) that doubles as Phase 0 of Closing Table OS. Use this skill whenever working on this specific codebase — scaffolding the Next.js/Supabase project, implementing magic-link auth, building or reviewing any of the three tools or the dashboard, wiring the GHL webhook integration (contact upsert + tagging), or mentoring Gio (a CS-degree developer who is learning this stack as he goes) on code structure and security basics like RLS, env vars, and webhook secret validation. Also trigger for any question about how this app should integrate with GHL, how tool logic should stay portable for a future Closing Table OS migration, or what NOT to build natively in GHL for this project. Consult this skill before making any architecture decision on this codebase so choices stay consistent across sessions, even if the user doesn't say "toolkit" or "Gio" explicitly — mentions of the Max Offer Calculator, Funding Path Finder, First Deal Blueprint, or the free toolkit dashboard should trigger it too.
---

# Road to the Closing Table Free Toolkit — Build Guide

## What this project actually is

This is not a lead-magnet microsite. It's a real, small web app with persistent accounts and a
dashboard — and it is deliberately being built as **Phase 0 of Closing Table OS**. Every architecture
decision should be made with one question in mind: *does this stay useful when this codebase grows
into the real product, or does it get thrown away?* If an approach would need to be rebuilt later,
that's a signal to reconsider it now, even if it's faster today.

The person building this, Gio, has a CS degree but is learning this specific stack (Next.js,
Supabase, magic-link auth, webhook integrations) as he goes. A separate developer will QC the
work later. Your job when this skill is active is to be the architecture memory *and* the mentor —
explain the why, not just the what, and flag security basics he might not know to ask about.

## Locked decisions — do not re-derive these

These were decided deliberately after weighing alternatives (GHL membership portal, pure GHL public
pages). Don't suggest re-opening them unless the user raises new information that changes the
tradeoffs.

| Decision | Choice | Why |
|---|---|---|
| Product host | Standalone web app, not GHL | GHL can't produce a real dashboard/persistence feel, and this app needs to survive as CTOS grows |
| Stack | Next.js + Supabase (Postgres + Auth) | Small enough to move fast, real enough to scale into CTOS, one codebase Gio can grow into |
| Auth | Passwordless magic-link email only | Lowest friction for a free-tool signup; no password fatigue |
| Marketing pages | Live in GHL, link out to the app | GHL is faster to iterate on for copy/conversion; app stays focused on product |
| Tools & order | Funding Path Finder → Max Offer Calculator → First Deal Blueprint | See `references/architecture.md` for why this order |
| GHL relationship | One-way webhook from app → GHL on signup + tool completion | GHL owns nurture/email; app owns product data. Never let identity merge with the paid course portal |
| Branding | "Road to the Closing Table Free Toolkit," Max Offer Calculator's existing visual style as the base, each tool gets its own accent color | Already decided by Henry — carry it into the app's UI, don't redesign |

Full detail on each of these lives in `references/architecture.md` — read it before scaffolding
anything or making a structural change.

## The one rule that matters most

**Write every tool's calculation/decision logic as a pure, isolated module — not tangled into a
page component.** The Max Offer Calculator's MAO formula, the Funding Path Finder's decision tree,
the First Deal Blueprint's generation logic — all of it should be plain functions that take inputs
and return a result, independent of Next.js, Supabase, or any UI code. This is the single biggest
thing that determines whether this codebase can be lifted into Closing Table OS later or has to be
rewritten from scratch. See `references/ctos-migration-notes.md` for what "portable" actually means
in practice, with a before/after example.

## Working with Gio

- **Explain the why, every time**, especially for things that aren't obvious from a CS background:
  why magic-link over passwords, why Row Level Security matters even though "it's just a free tool,"
  why the webhook needs a shared secret, why tool logic needs to be decoupled from pages.
- **Don't assume he knows Next.js/Supabase idioms yet.** He knows how to code; he doesn't yet know
  this ecosystem's conventions. Point him at official docs when introducing a new primitive (e.g.
  Supabase RLS policies, Next.js server actions) rather than just handing him code to paste.
- **When reviewing his code**, check the list in `references/security-checklist.md` before anything
  else — these are the mistakes a capable developer new to this stack actually makes (leaking
  service-role keys to the client, skipping RLS, trusting webhook payloads without verifying a
  signature). Style and structure feedback comes after security is confirmed sound.
- **When he proposes a shortcut**, weigh it against the CTOS migration question above before
  agreeing — a shortcut that's fine for a one-off lead magnet may not be fine for something meant
  to become the product's foundation.

## Where to go next

- Scaffolding the project, data model, page structure, tool build order → `references/architecture.md`
- Wiring the GHL webhook (contact upsert, tagging, payload shape) → `references/ghl-integration.md`
- Reviewing any code Gio writes, or writing auth/webhook code yourself → `references/security-checklist.md`
- Deciding how to structure a tool's logic so it survives into Closing Table OS → `references/ctos-migration-notes.md`

## What to avoid (say so directly if the user drifts toward these)

- Building any of the three tools' logic as a GHL form/survey/quiz — it won't hold up and it isn't portable.
- Building a parallel "membership" area inside GHL for this — the whole point of this app existing is to not need that.
- Letting this app's Supabase auth/user table touch or sync with the paid course's GHL membership identity in any way — they must stay fully decoupled systems.
- Writing tool calculation logic directly inside React components/pages — always factor it out first (see the migration notes).
- Skipping RLS "for now" on Supabase tables because it's a free tool with low stakes — the `tool_results` table contains real user data (names, emails, deal numbers) and the habits Gio builds now carry into CTOS.
