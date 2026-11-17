# Calculator signup endpoint — for the GHL calculator page

`POST https://app.henrywashington.com/api/calculator-signup`

The Max Offer Calculator on Henry's GHL page (henrywashington.com) sends the visitor's deal
here. Only `https://henrywashington.com` and `https://www.henrywashington.com` may call it.

## Request (JSON)

**The calculator page's own labels work as-is** (approved by Tazz, Nov 17, 2026): `firstName`,
`email`, `address`, `arv`, `price`, `reno`, `profit`, `holdMonths`, `commissionPct`,
`saleClosingPct`, `purchaseClosingPct`, `loanPointsPct`, `originationFee`, `holdingRatePct`,
`fundingType`, `cashAvailable`, `experience`. The snake_case names below also work.

```js
fetch("https://app.henrywashington.com/api/calculator-signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    first_name: "Jane",            // required
    email: "jane@example.com",     // required
    arv: 300000,                   // required — numbers or strings like "$300,000"
    asking: 180000,                // required (asking / purchase price)
    repairs: 40000,                // required
    profit: 40000,                 // optional — leave out/empty to use the rule of thumb (= repairs)
    hold: 8,                       // required, months
    commission: 6,                 // required, % as a whole number (6 = 6%)
    sale_closing: 2,               // required, %
    purchase_closing: 2,           // required, %
    points: 2,                     // optional, loan points
    origination: 0,                // optional, $
    rate: 12,                      // required, holding interest rate %
    address: "614 Maple St",       // optional
    funding_type: "Hard Money",    // the 3 answers (optional)
    cash_available: 25000,
    experience: "First-Time Investor", // must match the app's options to set the stage tag:
                                       // "First-Time Investor" | "1–3 Deals Completed" |
                                       // "4–10 Deals Completed" | "10+ Deals Completed"
    utm_source: "...", utm_medium: "...", utm_campaign: "...", utm_term: "...", utm_content: "...",
    website: ""                    // HONEYPOT — hidden field, must stay empty
  }),
});
```

## Responses

| Status | Body | What the page should do |
|---|---|---|
| 200 | `{ "status": "signed_in", "redirect": "https://app…/auth/confirm?…" }` | `window.location.href = redirect` — they land on their report, signed in |
| 200 | `{ "status": "check_inbox", "message": "Check your inbox" }` | Show "Check your inbox — we emailed you a sign-in link" |
| 400 | `{ "error": "…" }` | Show the error next to the form |
| 429 | `{ "error": "Too many tries…" }` | Show the error |
| 5xx | `{ "error": "…" }` | Show the error; they can retry |

The honeypot gets a fake `check_inbox` on purpose — don't treat it as a real signup.

## What happens behind it
- **New email:** account created (no password yet), the deal is computed with the app's own
  formula and saved to their Reports, GHL gets `closing-table-os:signed-up`,
  `tool:max-offer-used` and a `stage:` tag. The redirect link is one-time and short-lived.
  Inside the app a banner asks them to set a password.
- **Existing email:** nobody is signed in. The deal is saved as pending, and the Zap tags the
  contact `closing-table-os:login-link` with the link in **Closing Table OS Action Link**.
  A GHL workflow (Tazz) emails it. Clicking it signs them in and adds the deal to Reports.
- **Limits:** 100 attempts per IP per hour (events share Wi-Fi), 5 per email per hour.

## GHL workflow C — Login link (approved by Tazz, Nov 17, 2026)
For people who already have an account and use the calculator on Henry's website.

- **Name:** Closing Table OS – Login Link
- **Trigger:** Contact Tag → Tag Added → `closing-table-os:login-link`
- **Action 1 — Send Email:**
  - **From:** The Henry Washington Team
  - **Subject:** Your deal is saved. Here's your sign-in link
  - **Preview:** One tap opens your report. The link works once and expires in about an hour.
  - **Body:** Hi {{contact.first_name}}, I saved the deal you just ran through the Max Offer
    Calculator to your Closing Table OS reports. Tap below to sign in and see it. This link
    works once and expires in about an hour. If it expires, run the calculator again and we'll
    send a fresh one, or log in to the OS as usual.
  - **Button:** Open my report → `{{contact.contact_closing_table_os_action_link}}` (pick it
    with the merge-field picker; no UTMs on this link)
  - **Fallback line:** Button not working? Paste this into your browser:
    {{contact.contact_closing_table_os_action_link}}
  - **Safety line:** Didn't request this? Ignore this email.
- **Action 2:** Remove Contact Tag `closing-table-os:login-link`
- **Settings:** Allow Re-entry ON, no wait step. Publish before the app goes live.
- Test with a real tagged contact (an editor "send test" has an empty link). Contacts on email
  Do Not Disturb won't get it — they can still log in normally and the deal will be there.

## Welcome email "Set your password" backup link
`https://app.henrywashington.com/login?mode=forgot` — opens on Reset password, never expires.
