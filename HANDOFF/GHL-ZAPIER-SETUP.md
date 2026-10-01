# GoHighLevel + Zapier setup — Closing Table OS

How the app talks to GoHighLevel (GHL), what's built where, and how to rebuild or change it.
Last updated Sep 30, 2026.

---

## ⚠️ The one rule: never add tags through Zapier's GoHighLevel app

Zapier's GoHighLevel app ("LeadConnector") only has an **Add/Update Contact** action for
contacts, and GHL's own docs say its Tags field **"will overwrite all current tags associated
with the contact."** Using it would wipe tags on Henry's existing contacts — including paid
course members. The Zap below uses **Webhooks by Zapier** to call GHL's API directly instead,
which adds and removes tags without touching anything else. Verified in testing: existing tags
(`seat-6mo`, `pay-full`) stayed put.

---

## How it flows

```
app.henrywashington.com  →  Zapier (Catch Hook)  →  GHL API  →  GHL workflows / automations
```

The app sends one message per event to the Zap. Events:

| Event | When | Tags it adds |
|---|---|---|
| `signup` | New user clicks their confirm-email link | `closing-table-os:signed-up` |
| `tool_completed` | Every Max Offer Calculator run | `tool:max-offer-used`, `stage:<level>` (removes the other two stage tags) |
| `auth_email` | Sign-up confirmation or password reset requested | `closing-table-os:confirm-email` or `closing-table-os:reset-password` (+ writes the link to a custom field) |

Stage tags: `stage:pre-deal`, `stage:1-3-deals`, `stage:active` — exactly one per contact.
On hold until Henry approves scoring: `max-offer:deal-verdict-good` / `-tight` / `-pass`.

---

## The Zap — "Closing Table OS → GoHighLevel (contacts + tags)"

In Henry's Zapier, folder **01 - OS**. Every GHL step uses these 4 headers:

| Header | Value |
|---|---|
| `Authorization` | `Bearer <GHL Private Integration token>` |
| `Version` | `2021-07-28` |
| `Content-Type` | `application/json` |
| `Accept` | `application/json` |

The token comes from GHL **Settings → Private Integrations → "Closing Table OS"**, with only
**View Contacts** + **Edit Contacts** permission. Keep it private.

| Box | App / action | Setup |
|---|---|---|
| 1 | Webhooks by Zapier · Catch Hook | Its URL is in Vercel as `GHL_WEBHOOK_URL` |
| 2 | Webhooks · Custom Request | **POST** `https://services.leadconnectorhq.com/contacts/upsert` · Data: `{"locationId": "4uMmDI2kosLMlzdAlUS8", "email": "`[1. Email]`"`[1. Contact Fields]`, "source": "Closing Table OS"}` |
| 3 | Webhooks · Custom Request | **POST** `https://services.leadconnectorhq.com/contacts/`[2. Contact Id]`/tags` · Data: `{"tags": [`[1. Tags Quoted]`]}` |
| 4 | Filter by Zapier | Only continue if **1. Remove Tags Quoted** (Text) Contains `stage:` |
| 5 | Webhooks · Custom Request | **DELETE** same URL as box 3 · Data: `{"tags": [`[1. Remove Tags Quoted]`]}` |

All boxes: **Data Pass-Through = False**, **Unflatten = No**. No quotation marks around the
mapped `Tags Quoted` / `Remove Tags Quoted` / `Contact Fields` fields — they're pre-formatted by
the app (`lib/ghl-format.ts`). A run showing **"Filtered"** is normal: it stopped at box 4
because there were no old stage tags to remove.

Why the odd field formats: Zapier auto-converts any field that looks like JSON into a list and
flattens it (`a,b`), which breaks GHL's API. So the app sends tags as `"a","b"` (no brackets)
and the brackets live in the Zap. Names are sent only when known, so GHL never blanks a name.

---

## Confirm-signup & reset-password emails — sent by GHL

Tazz's decision: GHL sends these (not Supabase). How it works: Supabase's **Send Email hook**
calls `https://app.henrywashington.com/api/auth/send-email` → the app sends an `auth_email`
event through the Zap → the Zap writes the link to the contact and adds the tag → a GHL
workflow emails the link.

### Custom field (done)
- **Name:** Closing Table OS Action Link · **Type:** Single Line
- **Key:** `contact_closing_table_os_action_link` (GHL wouldn't allow a period)
- **Merge field in emails:** `{{contact.contact_closing_table_os_action_link}}`

### Workflow A — Confirm email
1. **Automation → Workflows → + Create Workflow → Start from Scratch.**
2. Name it `Closing Table OS – Confirm Email`.
3. **Trigger:** Add New Trigger → **Contact Tag** → Add filters → **Tag Added** →
   `closing-table-os:confirm-email` → Save Trigger.
4. **Action 1 — Send Email:**
   - From name: `Henry Washington · Closing Table OS`
   - Subject: `Confirm your email — Closing Table OS`
   - Button text `Confirm my email`, link `{{contact.contact_closing_table_os_action_link}}`
     (pick it via the merge-field picker → Contact → Closing Table OS Action Link)
   - Body: *"Hi {{contact.first_name}}, tap below to confirm your email and open your Closing
     Table OS. This link expires soon."* Optionally paste the merge field as plain text too.
5. **Action 2 — Remove Contact Tag:** `closing-table-os:confirm-email`.
6. **Settings → Allow Re-entry: ON** (otherwise a second attempt won't send).
7. Save → switch **Draft → Publish**.

### Workflow B — Reset password
Same as A, except:
- Name `Closing Table OS – Reset Password`
- Trigger tag `closing-table-os:reset-password`
- Subject `Reset your password — Closing Table OS` · Button `Choose a new password`
- Action 2 removes `closing-table-os:reset-password`
- **Allow Re-entry: ON** → Publish

Heads-up: GHL won't email contacts marked **Do Not Disturb** for email — those people won't get
confirm/reset emails either.

### Turning it on (order matters — do the hook LAST)
1. Custom field ✅ and both workflows published.
2. App code deployed (push to `main`).
3. Supabase → **Authentication → Hooks → Send Email hook** → HTTPS →
   URL `https://app.henrywashington.com/api/auth/send-email` → **Generate secret**, copy it.
4. Vercel → Environment Variables → add `SEND_EMAIL_HOOK_SECRET` = that secret → **Redeploy**.
5. After the redeploy is **Ready**, save/enable the hook in Supabase.
6. Supabase → **Authentication → Rate Limits** → raise the email limit if editable.
7. Test with **Forgot password?** on the live site.

If the hook is enabled before steps 1–4, new sign-ups get **no** email.

---

## Where things live
- App side: `lib/ghl.ts`, `lib/ghl-format.ts` (tested), `app/api/auth/send-email/route.ts`,
  `lib/webhook-signature.ts` (tested).
- Vercel env: `GHL_WEBHOOK_URL`, `GHL_WEBHOOK_SECRET`, `SEND_EMAIL_HOOK_SECRET`.
- Tazz's visual handoff page: https://claude.ai/artifact/GzWD7s6csf1XHVKfcExw5c
