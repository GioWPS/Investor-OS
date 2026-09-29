# Resend email setup — the chill version 🌿

Setting up nicer sign-in emails. Skim it. You've got this.

## 😌 First: you can't break anything
- This does **not** touch the app, the database, users, or the website.
- **Worst case if you fumble:** an email doesn't send. That's the whole disaster. Fixable in minutes.
- Everything undoes: records delete, settings toggle off, keys regenerate.
- Two "don't-do" rules and you're golden 👇

## 🚫 The only 2 ways to trip
1. In DNS, **only ADD the new stuff Resend gives you.** Don't edit/delete what's already there.
2. Keep the **API key** private (it's like a password). Leaks? Delete it, make a new one. Done.

## 🤔 Why we're doing this at all
- Right now Supabase sends login emails itself → **caps you at ~2/hour** ("rate limit exceeded" 🙄), says "Supabase Auth," and won't let us style it.
- **Resend** = a real email sender. Plug it in →
  - ✅ no more rate limit
  - ✅ sender says "Henry Washington · Investor OS"
  - ✅ our pretty branded email works

## 🧩 3 words, decoded
- **SMTP** = "the way email gets sent." We're swapping in a better sender.
- **DNS** = a domain's settings list (where the website + email rules live).
- **DKIM / SPF** = little proofs that say "yes, this sender is legit" so emails don't hit spam.

---

## 🪜 The steps (each is small)

**1. Make a Resend account** — resend.com, free. 🟢 *zero risk*

**2. Add your sending domain**
- Use a **subdomain**: `mail.roadtotheclosingtable.com` (keeps it away from Henry's real email 👌)
- Resend hands you a few **DNS records** → paste them into wherever the domain lives → hit **Verify**
- 🟡 *careful spot:* only **ADD** them. Typo = "not verified," no biggie, just fix + retry.

**3. Grab an API key**
- Resend → API Keys → Create → copy it (starts `re_…`)
- 🟡 It's a password. Don't post it / don't send it to me. Revocable anytime.

**4. Tell Supabase to use Resend**
- Supabase → Authentication → Emails → **Set up SMTP**, then type:
  - Sender email: `noreply@mail.roadtotheclosingtable.com`
  - Sender name: `Henry Washington · Investor OS`
  - Host: `smtp.resend.com` · Port: `465` · Username: `resend` · Password: *(the API key)*
- Save. 🟢 *only changes how emails send — flip it off anytime to undo*

**5. Paste the pretty email**
- Now the email editor unlocks. Paste our subject + design into **Magic Link** + **Confirm signup**. Save. 🟢

**6. Test** — sign in at the app → email shows up branded, no rate limit. 🎉

---

## 🙋 Who does what
- **You:** make the accounts, add DNS records, paste the key + settings (your logins, so it's gotta be you).
- **Me (Claude):** walk you through every field, read the DNS records with you, double-check, and test from the app side.

## ▶️ To start, just tell me:
1. **Which domain?** (`roadtotheclosingtable.com` / `henrywashington.com` / other)
2. **Do you have DNS access?** (or know who does)

That's it. Reply and I'll hold your hand through step 1. 💛
