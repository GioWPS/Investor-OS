# GITHUB & SETUP — get the new machine/account running

## 1. Connect to GitHub
Repo: **`https://github.com/GioWPS/Investor-OS.git`** (branch `main`, owner `GioWPS`).

**If the repo isn't on the machine yet**, clone it:
```bash
cd ~   # or wherever you keep projects
git clone https://github.com/GioWPS/Investor-OS.git
```

**Authenticating pushes** (a new machine has no cached credentials). Two options:

- **GitHub CLI (easiest going forward):**
  ```bash
  brew install gh && gh auth login
  ```
  (If `brew` isn't installed, use the PAT option below.)

- **Personal Access Token (no install):** GitHub → Settings → Developer settings → Fine-grained
  tokens → new token with **Contents: Read and write** on `GioWPS/Investor-OS`. Then the first push
  prompts for username (`GioWPS`) and password — **paste the token**. macOS keychain remembers it, so
  future pushes just work. (A classic token with the `repo` scope works too.)
  ```bash
  cd Investor-OS && git push -u origin main   # triggers the prompt
  ```

> ⚠️ For Claude: git push worked in the previous session because a token was cached in the keychain.
> On a fresh machine you must have Gio authenticate once (above) before you can push. Don't put a
> token in the remote URL.

## 2. Local project setup
The app lives in the repo root (this folder). From it:
```bash
npm install
```

Create `.env.local` (it's gitignored — not in the repo). **These two values are safe to share**
(the publishable key is RLS-bound / public by design). The secret + GHL values are placeholders and
not needed yet:
```
NEXT_PUBLIC_SUPABASE_URL=https://pkzphlmgulsmfzowiprj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_4NNsH1FE3G0eD_sFZLOA9w_wNMp0cK0
NEXT_PUBLIC_SITE_URL=http://localhost:3000

SUPABASE_SECRET_KEY=not-needed-yet
GHL_WEBHOOK_URL=not-configured-yet
GHL_WEBHOOK_SECRET=not-configured-yet
```
Then:
```bash
npm run dev    # http://localhost:3000
```

## 3. Supabase — already configured (nothing to redo)
The Supabase project **`investor-os-toolkit`** (free tier) is already set up on Gio's Supabase account:
- Schema (`supabase/schema.sql`) has been **run** — `profiles`, `tool_results`, `sync_failures`, RLS on.
- Auth redirect allow-list includes `http://localhost:3000/auth/callback`; Site URL is
  `http://localhost:3000`.
- Uses the new **publishable key** (already in `.env.local` above).

You only touch Supabase again for: the branded email template (needs Resend SMTP first — see
`PROJECT-MANAGEMENT.md`), and adding the **production** redirect URL when you deploy to Vercel.

## 4. Dev workflow notes
- Commands: `npm run dev` · `npm run build` · `npm test` (vitest) · `npx tsc --noEmit`.
- **Restart the dev server** after editing config files: `next.config.mjs`, `.env.local`,
  `tailwind.config.ts`. Normal code/CSS edits hot-reload.
- Restart pattern:
  ```bash
  lsof -ti tcp:3000 | xargs kill -9 ; npm run dev
  ```
- Browser caching is disabled **in dev** via `next.config.mjs` (no-store), so you won't get stale
  CSS/JS chunks. If a page ever looks unstyled or throws `__webpack_require__.n is not a function`,
  it's stale browser cache, not a code bug — hard refresh (⌘⌥R) or restart dev.

## 5. Accounts involved (all Gio's — Claude guides, Gio does credential/dashboard steps)
- **GitHub**: `GioWPS/Investor-OS`.
- **Supabase**: project `investor-os-toolkit` (Gio's account, free tier).
- **Resend**: not created yet (for the branded email / SMTP — see PROJECT-MANAGEMENT.md).
- **GHL / Vercel**: not wired yet.
