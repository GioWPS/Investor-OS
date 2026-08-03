---
name: investor-os-project-state
description: Current build state of the Investor-OS free toolkit and what's pending
metadata:
  type: project
---

Investor-OS is the git repo root (Next.js + Supabase app; Phase 0 of Closing Table OS). Locked architecture is in `FREE-TOOLKIT-PROJECT-SPEC.md` + `.claude/skills/closing-table-toolkit-builder/` and the working guide in `CLAUDE.md` / `HANDOFF/` — read those, don't re-derive. Remote: https://github.com/GioWPS/Investor-OS.git

**DONE & PUSHED:**
- **Foundation:** Next.js 15 App Router + Tailwind 3; Supabase browser/server/middleware clients (no service_role client — nothing needs it); `supabase/schema.sql` (profiles + tool_results + sync_failures, RLS on from day one, run in Supabase); magic-link auth (/login, /auth/callback); per-tool pattern (`lib/tools/registry.ts`); GHL fire-and-forget-but-logged webhook plumbing (`lib/ghl.ts`, not wired to a real endpoint yet).
- **Max Offer Calculator:** pure `lib/tools/max-offer.ts` = Henry's exact self-referential MAO (num/denom, NOT the 70% rule) + `analyzeDeal()` (verdict ±5% band, profit-at-price, watch-outs, 0–100 score). Tests pin $140,982.14 and the v2 $156,839 example (`npm test`, 8 tests). Henry's live "glass/purple" design ported verbatim into `app/tools/max-offer/moc.css`; form + full results experience with live "Adjust Your Numbers" panel (recomputes client-side from the pure module). Saves to Supabase, fires GHL usage tag + investor stage.
- **Dashboard + login:** dark "Closing Table OS command center" (`app/brand-os.css`), real data only (progress ring, stat cards, locked "Soon" modules — no fabricated data). New-tab behavior + "⧉ Dashboard" tab-jump in the calculator (`app/tools/max-offer/back-to-dashboard.tsx` + `app/dashboard/tab-namer.tsx`).
- Dev cache fix: `next.config.mjs` sends `Cache-Control: no-store` in development only (prod untouched).
- Branded magic-link email committed but NOT live — see [[investor-os-email-branding]].

**Pending (recap list — surface after every push):**
- **Email branding / Resend SMTP** — template committed (inert; auth works on default email meanwhile). Paused at "which domain / DNS." See [[investor-os-email-branding]].
- **Offer Strength Score is PLACEHOLDER** (`SCORE_MODEL_VERSION` in max-offer.ts) — weights need Henry/team sign-off. UI labels it "Preview scoring."
- **GHL verdict tag gated:** `result_segment` (deal-verdict-good/tight/pass) stored in DB, but the GHL segment TAG is held (usage + stage only) until Henry confirms. Flip on in `app/tools/max-offer/actions.ts`.
- **Funding Path Finder** (tool #2), then **First Deal Blueprint** (tool #3) — not built yet; same per-tool pattern.
- **Deploy to Vercel** + wire real GHL webhook — not done.

**Working style:** build → show on localhost → wait for Gio's "commit and push" (never commit without his OK); after every push, give the parked/pending recap. Gio is learning the stack — explain the why + flag security. See [[user-gio]] and `HANDOFF/PROJECT-MANAGEMENT.md` (authoritative parked list).
