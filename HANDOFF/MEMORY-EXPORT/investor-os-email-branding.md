---
name: investor-os-email-branding
description: How to make the branded magic-link email live (Resend SMTP + Supabase paste) — saved to resume later
metadata:
  type: project
---

**Goal:** replace Supabase's default "Supabase Auth / powered by Supabase" sign-in email with the branded Investor OS one.

**Current state:** the branded email HTML is committed at `supabase/email-templates/magic-link.html` (it's an inert reference file — NOT imported by app code, so auth runs fine and unchanged with the default email until this is applied). It has NOT been pasted into Supabase yet. Suggested subject: `Here's your magic link ⚡ — Investor OS`.

**Key gotcha:** Supabase locks email-template editing (subject + body) behind **custom SMTP** — on ALL tiers. This is NOT a Pro feature; Gio does NOT need Supabase Pro (Pro just adds no-auto-pause/backups/more compute — irrelevant here). So the blocker is: set up custom SMTP first.

**Resend SMTP setup unlocks everything at once** (template editing + fixes the "Supabase Auth" sender name → "Henry Washington · Investor OS" + reliable non-rate-limited delivery). Gio must do these himself (his accounts; Claude can't log in / create accounts / enter API keys):

- **Prerequisite — DECIDE:** which domain to send from + DNS access. Options in the ecosystem: roadtotheclosingtable.com, henrywashington.com. Sender = `noreply@<domain>`. (This was the open question when we paused.)
- **Resend (resend.com):** create free account (3,000/mo). Domains → Add Domain → add the DKIM/SPF DNS records they show → Verify. API Keys → Create (starts `re_…`) = the SMTP password.
- **Supabase → Authentication → Emails → Set up SMTP:** Sender email `noreply@<domain>`; Sender name `Henry Washington · Investor OS`; Host `smtp.resend.com`; Port `465`; Username `resend`; Password = Resend API key. Save.
- **Then** paste the subject + the HTML from `supabase/email-templates/magic-link.html` into BOTH the "Magic Link" AND "Confirm signup" templates. Save. Test from `/login`.

See [[investor-os-project-state]].
