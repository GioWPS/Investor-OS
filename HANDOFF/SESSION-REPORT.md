# SESSION REPORT — Investor-OS (July 2026)

A detailed account of everything built, decided, and verified so a new Claude can continue
seamlessly. Repo: `https://github.com/GioWPS/Investor-OS.git` (branch `main`).

---

## 1. What this project is
The **Road to the Closing Table — Free Investor Toolkit**: a standalone Next.js + Supabase web app
with real accounts, a persistent dashboard, and three tools — **Max Offer Calculator**,
**Funding Path Finder**, **First Deal Blueprint**. It's deliberately **Phase 0 of Closing Table OS**
(a future paid product), so every decision favors what *survives* into that product. Marketing lives
in GoHighLevel (GHL); the app connects to GHL only via a one-way webhook.

Locked architecture: `FREE-TOOLKIT-PROJECT-SPEC.md` + the `closing-table-toolkit-builder` skill.

## 2. Stack
- **Next.js 15** (App Router, TypeScript) + **Tailwind 3**
- **Supabase** (Postgres + Auth + Row Level Security), **magic-link (passwordless) auth**
- **vitest** for unit tests
- Hosting target: **Vercel** (not deployed yet)
- **GHL**: one-way webhook (app → GHL) for contact upsert + tagging. Never GHL → app for anything auth-critical.

## 3. Build timeline (git history, oldest → newest)
```
378db4b Initial commit
451d77e Add project spec and Claude Code build skill
ddea864 Scaffold Next.js + Tailwind foundation
f419a69 Add Supabase clients, session middleware, and RLS data model
8bba64f Add magic-link auth, dashboard shell, per-tool pattern, GHL plumbing
00548c1 Port Max Offer Calculator as first live tool
efddbc1 Rename Supabase public key env var to PUBLISHABLE_KEY
0c3ee31 Apply Henry's branded Max Offer design + full results experience
c1fa2a8 Redesign dashboard + login as Closing Table OS "command center"
ea9dab7 Disable browser caching in dev to end stale CSS/chunk hiccups
d8153ba Add branded Investor OS magic-link email template
0136607 Update webinar link + open tool/external links in a new tab
7a5aafa Add "Dashboard" tab-jump in the calculator (reuse the dashboard tab)
```

## 4. What's built (by area)

### Foundation
- Hand-scaffolded Next.js 15 (App Router) + TS + Tailwind 3 (chose hand-scaffold over
  `create-next-app` because the repo already held the spec + skill).
- **Three Supabase clients** — the security backbone:
  - `lib/supabase/client.ts` — browser, publishable key, RLS-bound.
  - `lib/supabase/server.ts` — server, publishable key + session cookies; the acting user is
    always derived from the cookie session, never client input.
  - `lib/supabase/middleware.ts` + `middleware.ts` — refresh session each request, gate
    `/dashboard` + `/tools/*`.
  - **No `service_role` client exists** — nothing needs to bypass RLS yet, and an unused god-key
    is pure attack surface. (The env var was renamed `SUPABASE_SECRET_KEY`; still unused.)
- **Data model** `supabase/schema.sql`: `profiles`, `tool_results`, `sync_failures`, **RLS on from
  creation**, policies scoped to `auth.uid()`. `inputs`/`outputs` are `jsonb` so new tools need no
  migration. A trigger auto-creates a `profiles` row on signup. **This SQL has been run in Supabase.**
- **Auth**: `/login` (magic-link request) → `/auth/callback` (code→session, with open-redirect
  protection on `?next=`). Sign-out server action.
- **Per-tool pattern**: `lib/tools/registry.ts` is the single source of truth (sequence, accent,
  status). `components/tool-shell.tsx`, `tool-card.tsx`, `cross-promo.tsx` (these are the ORIGINAL
  generic components; the Max Offer tool + dashboard now use their own branded designs — see below).
- **GHL plumbing** `lib/ghl.ts`: one-way, fire-and-forget-**but-logged** to `sync_failures`,
  shared-secret header, `import "server-only"` guard, consistent tag taxonomy. Skips cleanly when
  GHL isn't configured with a real http(s) URL. **GHL is not wired to a real endpoint yet** (env
  placeholders), so syncs are safely skipped/logged.

### Max Offer Calculator (the one fully-built tool)
- **Pure logic** `lib/tools/max-offer.ts` — ported from Henry's Excel/Sheets MVP. The MAO is a
  **self-referential flip P&L solved algebraically** for the purchase price (numerator/denominator),
  NOT the naive "70% rule." It also has `analyzeDeal()` which adds: verdict category (±5% "tight"
  band → Strong Offer Zone / Worth a Closer Look / Needs Negotiation), profit-at-asking-price,
  watch-outs, next-step, and a **0–100 Offer Strength Score**.
  - ⚠️ The **Offer Strength Score weights are a PLACEHOLDER** (`SCORE_MODEL_VERSION`), ported from
    Tazz's results-page mock-up which itself says "to be confirmed by Henry/team." The UI labels it
    "Preview scoring." The MAO math and the verdict category are real; the score weights are not final.
- **Tests** `lib/tools/max-offer.test.ts` (8 tests, `npm test`): pin the MAO to Henry's sheet
  examples — sample → $140,982.14, updated "v2" example → **$156,839** — plus verdict thresholds.
  Note: the results-page script Henry provided contained an **identical** MAO formula (verified, no
  discrepancy).
- **Design**: Henry's live GHL "glass/gloss purple" look, ported **verbatim** into
  `app/tools/max-offer/moc.css` (pulled from the live page source). Form + results rebuilt as React
  using the same class names.
- **Flow** (`app/tools/max-offer/`): `page.tsx` (auth + render) → `max-offer-form.tsx` (client form,
  rule-of-thumb toggle, validation) → server action `actions.ts` (validate server-side, derive user
  from session, call pure fn, save to `tool_results`, set investor `stage` from experience, fire GHL
  usage tag) → `max-offer-results.tsx` (full two-column results + **live "Adjust Your Numbers"**
  panel that recomputes client-side from the same pure module — the payoff of keeping logic pure).
- New fields the branded form added vs. the original: asking price (drives the verdict), investor
  profile (funding type, cash, experience → stage tag). Email is prefilled read-only from the session.

### Dashboard + Login (command-center redesign)
- `app/brand-os.css` — a second design system ported from Henry's **Future Investor Summit**
  dashboard mock-up: dark shell, Anton / Space Grotesk / JetBrains Mono, lime primary with
  purple/teal/orange accents.
- **Dashboard** (`app/dashboard/`): `page.tsx` fetches real data → `dashboard-view.tsx` renders the
  command center (left nav with "Your Toolkit" live/soon + "Closing Table OS" locked "Soon" modules,
  a Toolkit Progress ring, real stat cards, tool cards). `icons.tsx` = small line icons.
  `tab-namer.tsx` names the dashboard tab (for the calculator's tab-jump — see below). **All data is
  real Supabase data — no fabricated leads/deals/market numbers** (deliberate decision; the mock-up
  was full of sample data we did NOT copy in).
- **Login** restyled to match (`app/login/`).
- **New-tab behavior**: dashboard links to the calculator open in a new tab (`target="_blank"
  rel="opener"`), external links open in a new tab (`rel="noopener noreferrer"`). "View your tools"
  stays same-tab (it's an in-page scroll).
- **"⧉ Dashboard" tab-jump** in the calculator (`app/tools/max-offer/back-to-dashboard.tsx`): jumps
  to the *existing* dashboard tab without disturbing the calculator, via `window.open("/dashboard",
  <name>)` (browsers block `opener.focus()`, so named-tab reuse is the only reliable mechanism).

### Branded sign-in email (committed, not yet live)
- `supabase/email-templates/magic-link.html` — dark, on-brand magic-link email (replaces the default
  "Supabase Auth / powered by Supabase"). It's an **inert reference file**; auth works fine on the
  default email until it's pasted into Supabase. See `PROJECT-MANAGEMENT.md` for how to make it live
  (requires Resend SMTP first — NOT a Supabase Pro thing).

## 5. Key decisions & gotchas (so they aren't re-litigated)
- **Supabase "new API keys"**: the project uses the **publishable key** (`sb_publishable_…`), not the
  legacy anon key. Env var is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Publishable = safe for browser,
  RLS-bound.
- **MAO formula is Henry's real algebra, not the 70% rule.** Don't "simplify" it. Tests lock it.
- **Dashboard data is real only.** Do not wire fabricated CTOS module data into the logged-in app.
- **Dev cache hiccups** (unstyled page / `__webpack_require__.n is not a function`) were a **dev-only**
  browser-caching artifact, fixed at the root: `next.config.mjs` sends `Cache-Control: no-store` in
  development only. **Production is content-hashed + immutable — this never affects real users.** If
  it ever recurs: it's stale browser cache, not a code bug (restart dev / hard refresh).
- **Cross-tab focus is browser-restricted.** `window.opener.focus()` is a no-op in Safari; the working
  approach is naming the tab + `window.open(url, name)`. `rel="opener"` (not default noopener) keeps
  the tabs in one browsing-context group so they can find each other.
- **Git auth**: pushes worked because an HTTPS token was cached in the macOS keychain. **A new machine
  needs to authenticate git again** (see `GITHUB-AND-SETUP.md`).

## 6. Verification status
- Typecheck (`npx tsc --noEmit`), tests (`npm test`, 8 passing), and `npm run build` all pass as of
  the last commit.
- Max Offer form + results and the dashboard/login were visually verified in a browser.
- Live magic-link sign-in round-trip works (Gio signed in successfully against the real Supabase project).
- **Not yet deployed** to Vercel. GHL webhook not wired to a real endpoint. Branded email not yet
  pasted into Supabase.

## 7. Working agreements with Gio (carry these forward)
- Gio is a CS grad **learning this stack** — explain the *why*, flag security, point at docs.
- **Build → show on localhost → wait for "commit and push."** Never commit/push without his OK.
- **After every push, give a "Parked / pending" recap.**
- A separate developer QCs Gio's work.

See `PROJECT-MANAGEMENT.md` for the live parked/pending list and roadmap.
