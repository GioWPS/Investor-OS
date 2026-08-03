# HANDOFF — start here

This folder is a complete handoff so a **new Claude account** can continue the Investor-OS build
with zero interruption. Everything the previous session knew is here or in the repo.

## For Gio — how to hand this off
1. Make sure the new machine/account has this repo (see `GITHUB-AND-SETUP.md` to connect GitHub).
2. In the new Claude session, paste the **first message** below.

### 📋 Copy-paste this as your first message to the new Claude:
> I'm Gio, continuing the **Investor-OS** project (Road to the Closing Table Free Toolkit — Phase 0
> of Closing Table OS). This is a handoff from a previous Claude account. Please:
> 1. Read `CLAUDE.md`, then load the `closing-table-toolkit-builder` skill.
> 2. Read everything in `HANDOFF/` — especially `SESSION-REPORT.md` and `PROJECT-MANAGEMENT.md`.
> 3. Re-create the memory notes from `HANDOFF/MEMORY-EXPORT/` into your own memory (see its README).
> 4. Confirm you can reach the GitHub repo, then give me a short summary of where we are and the
>    parked/pending items before we start.
> Going forward: build → show me on localhost → wait for me to say "commit and push," and after
> every push give me the parked/pending recap.

## What's in this folder
| File | What it is |
|---|---|
| `README.md` | This orientation + the first-message template. |
| `SESSION-REPORT.md` | Detailed report of everything built, decided, and verified this session. |
| `PROJECT-MANAGEMENT.md` | Parked/pending items, roadmap, next steps, and the working agreements with Gio. |
| `GITHUB-AND-SETUP.md` | Connect GitHub, set up `.env.local`, run the app, dev workflow, Supabase config already done. |
| `MEMORY-EXPORT/` | Verbatim export of the previous session's memory notes + how to re-import them. |

## Also in the repo (not in this folder, but essential)
- `CLAUDE.md` (repo root) — auto-loaded working guide + house rules.
- `FREE-TOOLKIT-PROJECT-SPEC.md` — the locked architecture spec. Don't re-derive it.
- `.claude/skills/closing-table-toolkit-builder/` — **the project skill** (SKILL.md + 4 reference
  files). This is the standing technical spec + mentor. Load it before working on the codebase.

## The 30-second summary
Foundation + the **Max Offer Calculator** (fully branded, tested, live results experience) are
built, and the **dashboard + login** are redesigned as the dark "Closing Table OS command center."
All pushed to GitHub. What's left: make the branded sign-in email live (needs Resend SMTP), get
Henry's sign-off on two flagged items, and build the other two tools (Funding Path Finder, First
Deal Blueprint). Details in `PROJECT-MANAGEMENT.md`.
