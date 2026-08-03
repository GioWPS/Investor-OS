---
name: feedback-remind-parked-after-push
description: After every git push on Investor-OS, remind Gio of the parked/pending items
metadata:
  type: feedback
---

On the Investor-OS project, **at the end of every push**, give Gio a short reminder of the currently parked/pending items (the ones deferred pending Henry/Tazz/decisions), the way it was done after the Max Offer design push.

**Why:** Gio explicitly asked for this so open threads don't get forgotten between sessions.

**How to apply:** After a successful `git push`, append a brief "Parked / pending" recap. Pull the current list from [[investor-os-project-state]] / `HANDOFF/PROJECT-MANAGEMENT.md` (e.g. placeholder Offer Strength Score pending Henry, GHL verdict tag gated, email/Resend SMTP paused, upcoming tools). Keep it to a few bullets.
