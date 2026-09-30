# Security Checklist — Review This Before Reviewing Anything Else

Gio has a CS degree but is new to this specific stack, which means the mistakes to watch for are
predictable: Next.js/Supabase has a few sharp edges that are easy to get wrong once and never notice,
because the app still *works* — it's just insecure. Check these first, before style or structure
feedback, on any code touching auth, data access, or the GHL webhook.

## 1. Service-role keys never reach the client

Supabase gives you two keys: an `anon` key (safe for the browser, respects RLS) and a `service_role`
key (bypasses RLS entirely — full database access). The service-role key must only ever be used in
server-side code (API routes, server actions) and must never be prefixed `NEXT_PUBLIC_` or referenced
in any client component. If you see it imported into a file that runs in the browser, that's a
stop-everything issue, not a style note.

**Why it matters practically:** if it leaks, anyone can read or write every user's `tool_results` and
`profiles` rows, full stop.

## 2. Row Level Security is on, and the policies are actually scoped to the user

It's tempting to skip RLS "for now" since this is a free tool with low stakes. Don't — the
`tool_results` table holds real emails, names, and deal numbers, and the habit of skipping RLS "for
now" is exactly how it stays off permanently. Every table Gio adds should have RLS enabled with a
policy that scopes reads/writes to `auth.uid() = user_id` (or the equivalent), verified by testing as
a logged-in non-admin user, not just checked by reading the policy definition.

## 3. Environment variables are actually treated as secrets

- `.env.local` (or equivalent) is gitignored — check this explicitly, don't assume it.
- No API keys, secrets, or GHL credentials hardcoded anywhere in committed code, even temporarily "to
  test."
- Production secrets live in Vercel's environment variable settings, not in a committed config file.

## 4. The GHL webhook call validates what it's sending and trusts nothing it doesn't need to

- The app → GHL direction: don't send more data than GHL needs (no need to push full deal financials
  if a tag and a couple of custom fields cover the use case).
- If GHL ever calls back into the app (not the primary direction here, but if it happens later),
  verify a shared secret or signature on that incoming request before acting on it — never trust an
  unauthenticated POST to do something like mark a user as upgraded or delete data.

## 5. Password auth is used as intended, not defeated by shortcuts

- Passwords only ever go to Supabase Auth (`signUp`, `signInWithPassword`, `updateUser`). The app
  never stores, logs, or echoes a password, and never puts one in a URL or a GHL payload.
- Keep **"Confirm email" on** in Supabase. The confirmation click proves the person owns the inbox,
  and it's also what fires the one-time GHL signup webhook — turning it off would push unverified
  addresses into GHL.
- Keep sign-in errors generic ("Email or password is incorrect") so the form can't be used to
  discover which emails have accounts.
- Password-reset links are single-use and time-limited by Supabase — don't build custom logic that
  re-issues or extends them. The reset link signs the user in, and `/update-password` sets the new
  password on that session.
- `/update-password` accepts any signed-in session, so someone holding a live session could change
  the password without the old one. If that matters, turn on Supabase's "Secure password change"
  option (requires a recent login) rather than hand-rolling a check.
- Don't build a "dev bypass" login and forget to remove it.
- Redirect URLs for confirm/reset links must be an explicit allow-list in Supabase Auth settings:
  exact domains only, never a wildcard domain (a `/**` path suffix on an exact domain is fine).
  A wildcard domain is a common Next.js + Supabase misconfiguration that lets tokens be redirected
  to an attacker-controlled URL.

## 6. Never trust client-supplied identity

A request body field like `userId`, or a custom header like `x-user-email`, is just as spoofable as
any other client input — there's nothing enforcing that either one actually matches whoever is
making the request. This is easy to miss because it "still works" in your own testing: you're always
logged in as yourself, so the value you trusted from the client happens to be correct every time,
right up until someone else sends a request with a different value in that field.

Always derive the acting user from the authenticated session, server-side — e.g.
`supabase.auth.getUser()` read from the request's cookies — and ignore any `userId` or email the
client tries to hand you directly. This applies to every route that reads or writes `tool_results` or
`profiles`, and to the GHL webhook call (use the session's email, not a client-supplied header).

## How to raise these with Gio

Frame these as "here's the thing about this stack that bites people" rather than a pass/fail grade —
he's learning the ecosystem, not failing a test. Point him at the specific Supabase/Next.js docs page
for RLS or environment variables when it's a new concept, so he builds the mental model instead of
just fixing the one instance.
