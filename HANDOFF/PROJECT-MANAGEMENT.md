# PROJECT MANAGEMENT — Investor-OS

The single source of truth for **what's done, what's parked, and what's next.** After every push,
give Gio a short recap pulled from the "Parked / Pending" section below. Keep this file updated as
work progresses.

---

## ✅ Done & pushed
- Foundation: Next.js + Supabase (3 clients), RLS data model (run in Supabase), magic-link auth,
  middleware gating, GHL webhook plumbing, per-tool pattern.
- **Max Offer Calculator** — fully built: pure tested logic (Henry's real MAO), branded form,
  full results experience with live "Adjust Your Numbers" panel, saves to Supabase, fires GHL usage tag.
- **Dashboard + Login** — redesigned as the dark "Closing Table OS command center," driven by real data.
- Dev cache fix (`Cache-Control: no-store` in dev only).
- Branded magic-link **email template committed** (`supabase/email-templates/magic-link.html`) — not yet live.
- New-tab behavior + "⧉ Dashboard" tab-jump in the calculator.

## 🅿️ Parked / Pending (this is the recap list)
1. **Email branding / Resend SMTP** — the branded sign-in email is committed but not live. Supabase
   locks template editing behind **custom SMTP** (all tiers — **NOT** a Pro feature; do not upgrade to
   Pro for this). Set up **Resend SMTP** to unlock templates + fix the "Supabase Auth" sender name +
   get reliable delivery. **Paused at:** which domain to send from + DNS access
   (`roadtotheclosingtable.com` / `henrywashington.com` / ?). Full steps in
   `MEMORY-EXPORT/investor-os-email-branding.md`.
2. **Offer Strength Score** (Max Offer results) — the 0–100 score weights are a **placeholder**
   (`SCORE_MODEL_VERSION` in `lib/tools/max-offer.ts`), ported from Tazz's mock-up. **Needs Henry/team
   sign-off** on the real weights. UI already labels it "Preview scoring."
3. **GHL verdict tag — gated.** The verdict (`deal-verdict-good/tight/pass`) is stored in the DB
   (`result_segment`), but the GHL segment **tag** is intentionally held (usage + stage tags only)
   until Henry confirms the verdict/scoring. Flip it on in `app/tools/max-offer/actions.ts` when approved.
4. **Funding Path Finder** (tool #2) — not built. Its pure decision-tree module is fully independent
   of the rest, so it's a clean next build. Same per-tool pattern.
5. **First Deal Blueprint** (tool #3) — not built. Most synthesis-heavy; build last.
6. **Dashboard/login design** — currently the command-center design is live. (Earlier note about
   "plain placeholder" is resolved — this is the real design now.)

## 🗺️ Roadmap / suggested next steps
1. **Funding Path Finder** — pure `lib/tools/funding-path.ts` decision tree (hard money / private /
   DSCR / seller financing / etc.) + unit tests, then wire the page (form → save → GHL) following the
   Max Offer pattern. Ask Gio for Henry's branching logic/questions before writing the tree.
2. **Deploy to Vercel** — create project, set the same env vars there, add the prod URL to Supabase's
   redirect allow-list, point a subdomain (`toolkit.roadtotheclosingtable.com`).
3. **Wire GHL for real** — get the real inbound webhook URL + shared secret, set env vars, test the
   signup + tool-completion tagging end-to-end.
4. **Email branding** — once Gio picks the domain, do the Resend SMTP setup, then paste the template.
5. **Henry sign-offs** — score weights + turning on the GHL verdict tag.
6. **First Deal Blueprint** — after the other two tools.

## 🤝 Working agreements (how to run sessions with Gio)
- **Gio is learning the stack.** Explain the *why*, flag security, link official docs for new primitives.
- **Flow:** build → show on localhost → **wait for Gio to say "commit and push."** Never commit/push
  without explicit approval. He reviews in his browser first.
- **After every push:** append a short **"Parked / pending"** recap (from this file).
- Verify before claiming done: `npx tsc --noEmit`, `npm test`, `npm run build`, and render/screenshot
  UI changes.
- Some actions are Gio's to do (his accounts): creating Supabase/Resend/GitHub accounts, entering API
  keys, changing Supabase dashboard settings, DNS. Claude guides; Gio clicks.

## 📇 Where things live (quick map)
- Locked spec: `FREE-TOOLKIT-PROJECT-SPEC.md` · Skill: `.claude/skills/closing-table-toolkit-builder/`
- Pure logic: `lib/tools/*.ts` · Supabase clients: `lib/supabase/*` · GHL: `lib/ghl.ts`
- Max Offer tool: `app/tools/max-offer/*` (+ `moc.css`) · Dashboard: `app/dashboard/*` (+ `app/brand-os.css`)
- DB schema: `supabase/schema.sql` · Email template: `supabase/email-templates/magic-link.html`
- Setup/GitHub: `HANDOFF/GITHUB-AND-SETUP.md` · Memory export: `HANDOFF/MEMORY-EXPORT/`
