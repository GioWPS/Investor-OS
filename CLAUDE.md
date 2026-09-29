# CLAUDE.md — Investor-OS working guide (read me first, every session)

This repo is the **Road to the Closing Table — Free Investor Toolkit**, a Next.js + Supabase
web app built as **Phase 0 of Closing Table OS** for Henry Washington's ecosystem. It's the
primary builder's (Gio's) project.

## Do this at the start of every session
1. **Load the project skill:** `closing-table-toolkit-builder` (in `.claude/skills/`). It holds
   the locked architecture + security checklist. Don't re-derive decisions it already made.
2. **Read `FREE-TOOLKIT-PROJECT-SPEC.md`** (the locked spec) if you haven't this session.
3. **Read `HANDOFF/`** — full session report, project-management/parked items, setup, and a
   verbatim export of the memory notes. Start with `HANDOFF/README.md`.
4. If this is a fresh Claude account/machine, also re-create the memory notes from
   `HANDOFF/MEMORY-EXPORT/` (see that folder's README).

## How Gio likes to work (important)
- **Gio is a CS grad but learning this stack** (Next.js, Supabase, magic-link auth, webhooks).
  Explain the *why*, not just the what. Flag security basics proactively. Point at official docs
  for new primitives.
- **Build → show on localhost → WAIT for Gio to say "commit and push."** Do not commit or push
  unless he explicitly approves. He reviews in his browser first.
- **After every `git push`, give a short "Parked / pending" recap** (pull it from
  `HANDOFF/PROJECT-MANAGEMENT.md` / the project-state memory). Gio asked for this explicitly so
  open threads don't get lost between sessions.
- Verify before claiming done: typecheck (`npx tsc --noEmit`), tests (`npm test`), build
  (`npm run build`), and render/screenshot when UI changed.

## The one non-negotiable coding rule
Every tool's calculation/decision logic is a **pure, isolated module** in `lib/tools/<tool>.ts`
— no React, no Supabase, no Next imports. Pages only collect inputs, call the pure fn, save,
fire the GHL webhook, and render. This is what lets logic be *lifted* into Closing Table OS later.

## Security non-negotiables (full list in the skill's security-checklist.md)
1. Supabase secret/`service_role` key is server-only, never `NEXT_PUBLIC_`, never in a client
   component. (Currently no client uses it — keep it that way unless a feature needs it.)
2. RLS is ON for every table, policies scoped to `auth.uid()`. Never skip "for now."
3. `.env.local` is gitignored; no secrets committed.
4. GHL webhook is fire-and-forget-but-logged; a GHL outage never blocks the user.
5. Magic-link redirect URLs are an explicit allow-list in Supabase, never a wildcard.
6. Never trust client-supplied identity; derive the user from the server session.

## Stack + commands
- Next.js 15 (App Router) + TypeScript + Tailwind 3, Supabase (Postgres + Auth + RLS).
- Auth is **email + password** (confirm-email on signup, emailed reset). Tazz's decision, Sep 2026 —
  this supersedes the "magic-link only" line still in `FREE-TOOLKIT-PROJECT-SPEC.md` §3 and the skill.
- `npm run dev` (dev server) · `npm run build` · `npm test` (vitest) · `npx tsc --noEmit` (typecheck).
- Config changes (`next.config.mjs`, `.env.local`, `tailwind.config.ts`) require a dev restart.
- Dev caching is disabled via `next.config.mjs` (`Cache-Control: no-store` in dev only) so the
  browser never serves stale CSS/JS chunks. Production caching is untouched.

## Repo / GitHub
- Remote: `https://github.com/GioWPS/Investor-OS.git` (branch `main`).
- On a new machine, git needs auth once (see `HANDOFF/GITHUB-AND-SETUP.md`).

Full detail lives in `HANDOFF/`. When in doubt, read it before acting.
