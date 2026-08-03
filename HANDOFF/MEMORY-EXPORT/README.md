# MEMORY EXPORT — re-import these on the new Claude account

These are the previous session's **memory notes** (Claude Code's persistent memory). Memory is
per-account/per-machine, so it does NOT transfer automatically — but the content is here so the new
Claude can recreate it.

## How the new Claude should re-import them
For each `.md` file in this folder (except this README), **save it as a memory** using the Write tool,
into your memory directory for this project — typically:
`~/.claude/projects/<this-project-slug>/memory/`

Then add/refresh the one-line pointers in that directory's `MEMORY.md` index (the `MEMORY.md` here is
the index to copy). Keep the frontmatter (`name`, `description`, `metadata.type`); you can drop any
machine-specific fields.

The four notes:
| File | Type | What it carries |
|---|---|---|
| `user-gio.md` | user | Who Gio is + how he wants to be worked with. |
| `investor-os-project-state.md` | project | Full build state + pending items. |
| `investor-os-email-branding.md` | project | Steps to make the branded email live (Resend SMTP). |
| `feedback-remind-parked-after-push.md` | feedback | **After every push, remind Gio of parked items.** |
| `MEMORY.md` | index | The one-line index of the above. |

> Note: `PROJECT-MANAGEMENT.md` (one level up) is the live, authoritative parked/pending list. The
> memory notes are the durable summary; when they disagree, trust `PROJECT-MANAGEMENT.md` + the repo.
