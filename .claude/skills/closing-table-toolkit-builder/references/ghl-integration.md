# GHL Integration Reference

## The boundary — why this matters

GHL already runs Henry's paid course portal. That system must never be put at risk. The rule that
protects it is simple: **this app and the GHL paid course portal are two fully decoupled systems that
happen to share a marketing/CRM connection, not a shared identity or data layer.** The toolkit app
never reads from GHL's membership data, never authenticates against it, and never writes anything
into GHL except through one narrow, one-way webhook. If a design ever implies the app needs to "know"
whether someone is a paid course member, stop and flag it — that's a sign the boundary is being
crossed and needs a conscious decision, not an assumption.

## What flows from the app to GHL, and when

**On account creation (when a new user clicks their confirm-email link):**
- Upsert a GHL contact by email.
- No tags yet beyond something like `closing-table-os:signed-up` — the useful tags come from tool completion.

**On each tool completion:**
- Upsert the GHL contact (in case they signed up outside the normal flow, or the contact doesn't
  exist yet for some reason).
- Apply a **usage tag**: `tool:funding-path-used`, `tool:max-offer-used`, `tool:first-deal-blueprint-used`.
- Apply a **result-segment tag** based on that tool's output: e.g. `funding-path:hard-money`,
  `funding-path:seller-financing`, `max-offer:deal-verdict-good`, `max-offer:deal-verdict-tight`.
- Apply/update a **stage tag** if the tool captured stage-qualifying info: `stage:pre-deal`,
  `stage:1-3-deals`, `stage:active`. Stage should update in place (remove old stage tag, add new one)
  rather than accumulating multiple stage tags on one contact.
- Set relevant custom fields on the contact mirroring the result (useful for GHL email personalization
  even though the canonical data lives in Supabase).

GHL owns everything downstream of this: nurture sequences, webinar/event/mastermind promotion,
announcements. The app's job ends at "tell GHL what happened."

## Implementation notes

- Use a **GHL API call or inbound webhook trigger**, not a GHL native form submission, to upsert the
  contact and apply tags — the app is the source of truth for when this fires, not a page load.
- **Verify a shared secret** on any webhook GHL calls into the app (if there ever is one — most of the
  traffic here is app → GHL, not GHL → app). For the app → GHL direction, this means signing/attaching
  an API key correctly and never exposing it client-side (see `security-checklist.md`).
- Make the GHL call **fire-and-forget-but-logged**: a failed GHL sync should never block the user from
  seeing their tool result or saving it to Supabase. Log failures somewhere Gio can check (even just a
  Supabase `sync_failures` table) rather than silently dropping them or blocking the UX on GHL being up.
- Keep the tag/field naming consistent across all three tools from day one (`tool:<name>-used`,
  `<tool>:<result-segment>`, `stage:<value>`) — this is the same taxonomy the original toolkit
  architecture memo defined, and it's designed to map cleanly onto Closing Table OS's future
  segmentation logic (Investor Roadmap stage, Funding Match, Deal Health). Don't let naming drift
  tool by tool.

## What NOT to build in GHL for this project

- No GHL native survey/quiz standing in for any of the three tools' logic.
- No GHL membership/client portal product for "free toolkit access" — that's the whole problem this
  app exists to solve. If someone suggests it later ("just to save time"), the answer is no — it
  reopens the exact risk (shared portal shell with the paid course) this architecture was built to avoid.
- No routing the auth emails (signup confirmation, password reset) through GHL, even though it seems like it would save adding
  another vendor. GHL isn't an SMTP relay — Supabase Auth needs real SMTP credentials to send the
  email it generates, and GHL doesn't expose that for arbitrary third-party sends. More importantly,
  doing this would make the login-critical path depend on GHL's workflow engine being up and fast,
  which inverts the one-way, non-critical relationship this integration is built on (app → GHL for
  marketing signals, never GHL → app for anything auth-critical). Use a dedicated transactional
  provider (Resend or Postmark) configured directly in Supabase's Auth SMTP settings instead — GHL
  keeps every marketing/nurture email it already owns, just never the confirm/reset emails themselves.
