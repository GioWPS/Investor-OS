# Road to the Closing Table — Free Investor Toolkit
## Project Spec / Ecosystem Breakdown

*Prepared for Henry Washington's team. This document captures the full strategic and technical plan for the Free Investor Toolkit — read this before making any changes to scope, architecture, or sequencing.*

---

## 1. Vision

We are not building three disconnected lead magnets. We are building a connected **free investor toolkit ecosystem** that functions as the free front door into Henry Washington's entire business — and, critically, this ecosystem is being built as **Phase 0 of Closing Table OS**, not a throwaway marketing asset.

The ecosystem sits inside a larger funnel:

```
Road to the Closing Table (content, audience)
        ↓
Free Investor Toolkit  ← this project
        ↓
Monthly Webinar / Events
        ↓
The Closing Table Mastermind
        ↓
Closing Table OS (future paid product)
```

Every architecture decision below was made by asking: *does this survive and carry forward as the ecosystem matures into Closing Table OS, or does it get thrown away?* We chose the option that survives, even where a faster/cheaper shortcut existed.

---

## 2. The Three Tools (launch set)

1. **Max Offer Calculator** — Henry's MAO (Maximum Allowable Offer) framework, productized. Real formula logic, not a form.
2. **Funding Path Finder** — a branching decision tree that matches a user's deal/profile to a funding strategy (hard money, private money, DSCR, seller financing, etc.).
3. **First Deal Blueprint** — a personalized generated plan, positioned as a capstone tool.

**Build order: Max Offer Calculator → Funding Path Finder → First Deal Blueprint.**
Reasoning: Max Offer Calculator went first because an Excel MVP of its MAO logic already existed, making it the fastest real start — it becomes the first tool ported onto the platform. Funding Path Finder is next: it's a branching decision tree that produces the single most valuable segmentation signal (which funding path a user matches). First Deal Blueprint is the most synthesis-heavy and works best last, once a user has already engaged with the other two.

**Parallel-track note:** because every tool's logic is a pure, decoupled function (see §3), the Funding Path Finder's decision-tree logic can be built completely independently of the app scaffold and handed off for integration later. This lets foundation work and tool-logic work happen simultaneously in two separate Claude Code sessions without colliding.

Two of these three tools are direct, lightweight previews of future Closing Table OS modules (Deal Analyzer, Funding Path Finder) — this is intentional, not a coincidence.

---

## 3. Core Architecture Decision

**This is a standalone web app with real accounts and a persistent dashboard — not a GHL-native build.**

We considered and rejected three alternatives:
- **GHL public funnel pages only** — rejected once the goal was clarified as wanting real saved history and a dashboard feel, since GHL pages are stateless and can only fake persistence.
- **GHL free membership / Client Portal** — rejected outright, and stays rejected. GHL's Client Portal shell is shared across every product/offer a contact has in that location. Henry's paid course portal already lives there, and any dashboard-for-free-users work in that same shell creates ongoing risk of touching or diluting the paid experience. This is a firm boundary, not a preference.
- **Building tool logic natively in GHL forms/surveys** — rejected because it can't express real branching/calculation logic and isn't reusable.

**What we're building instead:**

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | Server components + server actions in one place; no separate backend service needed at this scale |
| Backend/data | Supabase (Postgres + Auth + Row Level Security) | One provider for data and auth; RLS gives real per-user data isolation without hand-rolled authorization |
| Auth | Passwordless magic-link email only | Lowest friction for a free-tool signup; no password fatigue, no password-breach risk |
| Hosting | Vercel | Native pairing with Next.js |
| Auth email delivery | Resend or Postmark (via Supabase's SMTP settings) — **not** GHL | GHL isn't an SMTP relay, and routing login-critical email through GHL's workflow engine would make login availability depend on GHL being up and fast, which inverts the one-way relationship this integration is built on |

**Data model (minimum viable):**

```sql
create table profiles (
  id uuid references auth.users(id) primary key,
  email text not null,
  created_at timestamptz default now(),
  stage text  -- 'pre-deal' | '1-3-deals' | 'active'
);

create table tool_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  tool text not null,              -- 'max_offer' | 'funding_path' | 'first_deal_blueprint'
  inputs jsonb not null,
  outputs jsonb not null,
  result_segment text,             -- e.g. 'hard_money', 'deal_verdict_good'
  created_at timestamptz default now()
);
```
Row Level Security is enabled from day one on both tables, scoped to `auth.uid()`. `jsonb` is used for inputs/outputs specifically so a fourth or fifth tool can be added later without a schema migration.

**Page structure:**

```
/login                        → magic-link request
/auth/callback                → Supabase auth callback
/dashboard                     → all tools, completion state, saved results, room for future tools
/tools/funding-path            → build first
/tools/max-offer
/tools/first-deal-blueprint
```

**The one non-negotiable coding rule:** every tool's calculation/decision logic is written as a pure, isolated function (`lib/tools/<tool-name>.ts`) — no React, no Supabase, no Next.js imports inside it. The page's only job is to collect inputs, call the pure function, save the result, fire the GHL webhook, and render. This is what determines whether this codebase gets *lifted* into Closing Table OS later or has to be rewritten from scratch when that build starts.

---

## 4. GHL's Role and the Boundary With the Paid Course Portal

GHL is not being replaced — it's being scoped down to what it's actually good at, and firmly walled off from the app's identity system.

**GHL keeps:**
- The existing paid course portal, completely untouched.
- All public marketing/landing pages for each tool (these link out to the app for the actual tool + dashboard).
- All nurture sequences, announcements, and promotion of the monthly webinar, events, and The Closing Table Mastermind.

**The app's only connection to GHL:** a one-way webhook, app → GHL, fired at two moments:
- **On account creation:** upsert a GHL contact, tag `toolkit:signed-up`.
- **On each tool completion:** upsert the contact, apply a usage tag (`tool:funding-path-used`, etc.), a result-segment tag (`funding-path:hard-money`, `max-offer:deal-verdict-good`, etc.), and a stage tag (`stage:pre-deal`, `stage:1-3-deals`, `stage:active` — updated in place, not accumulated).

GHL owns everything downstream of that signal. The app never reads from GHL, never checks paid-membership status, and never depends on GHL being available for anything the user is actively waiting on.

**Explicitly out of bounds — do not revisit these without a real reason:**
- No GHL native survey/quiz standing in for any tool's logic.
- No GHL membership/portal product for free-toolkit access, ever — this is the exact risk the whole architecture exists to avoid.
- No routing the magic-link auth email through GHL.
- No letting the app's Supabase identity system merge with or read from the paid course's GHL membership data.

---

## 5. Branding

- Name: **"Road to the Closing Table Free Toolkit."**
- Visual base style: the existing Max Offer Calculator branding.
- Each tool gets its own accent color layered on top of that base style, so the ecosystem feels unified but each tool is individually identifiable.

---

## 6. Tagging & Segmentation Taxonomy

Kept consistent across all three tools from day one so it doesn't drift and so it maps cleanly onto Closing Table OS's future segmentation logic (Investor Roadmap stage, Funding Match, Deal Health scoring):

- **Usage tags:** `tool:funding-path-used`, `tool:max-offer-used`, `tool:first-deal-blueprint-used`
- **Result-segment tags:** `funding-path:hard-money`, `funding-path:seller-financing`, `max-offer:deal-verdict-good`, `max-offer:deal-verdict-tight`, etc.
- **Stage tags:** `stage:pre-deal`, `stage:1-3-deals`, `stage:active`

---

## 7. Cross-Promotion Between Tools

Every tool's result page presents the other two tools as a logical next step (framed as a sequence — Max Offer → Funding Path → Blueprint — not a menu), and email follow-ups reinforce the same order. The dashboard shows completion state across all tools so users can see their own progress through the ecosystem.

---

## 8. Team & Roles

- **Gio** — primary builder. CS degree, learning the Next.js/Supabase stack as he goes.
- **A separate developer** — QC's Gio's work as it's built.
- **Henry** — directing priorities and brand decisions.
- **A dedicated Claude Code skill** (`closing-table-toolkit-builder`) acts as the standing technical spec and mentor across every build session — it encodes all the locked decisions in this document plus a security checklist (RLS, env var hygiene, never trusting client-supplied identity, etc.) so architecture doesn't get re-litigated session to session. It lives in the project repo's `.claude/skills/` folder once Gio creates it, so it travels with the codebase.

---

## 9. Security Non-Negotiables

(Enforced by the Claude Code skill on every review, listed here for visibility)

1. Supabase's `service_role` key never reaches client-side code or gets a `NEXT_PUBLIC_` prefix.
2. Row Level Security is on from day one on every table — not added "later."
3. `.env.local` is gitignored; no secrets ever committed, even temporarily.
4. The GHL webhook call is fire-and-forget-but-logged — a GHL outage never blocks a user from seeing or saving their result.
5. Magic-link redirect URLs are an explicit allow-list in Supabase, never a wildcard.
6. The app never trusts a client-supplied `userId` or email header — the acting user is always derived from the authenticated server-side session.

---

## 10. Costs

| Service | During build/testing | Once live |
|---|---|---|
| Supabase | Free | ~$25/mo (Pro) recommended once real users exist — avoids project auto-pause, adds backups |
| Vercel | Free (Hobby) | ~$20/mo (Pro) — Hobby tier is technically non-commercial use |
| Transactional email (Resend/Postmark) | Free (~3,000 emails/mo on Resend's free tier) | Likely still free at this stage |
| GHL | No change | No change — existing account/API |
| Domain/subdomain | Free (existing domain) | Free |

**Realistic run-rate once live: ~$45–50/month.** Everything before deployment costs nothing.

---

## 11. Build Sequence

1. Gio creates the GitHub repo (in progress).
2. Gio creates a Supabase project (free).
3. Scaffold Next.js app locally, wire up Supabase clients (server + browser), run the data-model SQL with RLS enabled.
4. Build the **Max Offer Calculator** first (Excel MVP already exists), fully local — no deployment or GHL integration needed yet.
5. Build the dashboard shell and the GHL webhook integration **alongside tool #1**, not after all three tools exist.
6. Once tool #1 works end-to-end locally, create a Vercel account and deploy.
7. Wire the live GHL webhook using the existing GHL account/API access.
8. Point a subdomain (e.g. `toolkit.roadtotheclosingtable.com`) at the deployment.
9. Build Max Offer Calculator, then First Deal Blueprint, following the same pattern.

---

## 12. Long-Term Payoff

Every account created through this toolkit is a Closing Table OS user in waiting. When CTOS Phase 1 ships, these users don't onboard from zero — their account, tool history, and stage classification already exist, and the tagging/segmentation data collected here becomes real training signal for CTOS's Investor Roadmap and Funding Match logic. This project is deliberately scoped small, but every piece of it — the data model, the pure-function tool logic, the tagging taxonomy — is built to be inherited by the real product, not replaced by it.
