import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * ONE-WAY sync: app → GHL. This is the app's only connection to GHL. The app never reads
 * from GHL, never checks paid-course membership, and never depends on GHL being up for
 * anything a user is waiting on. See .claude/skills/.../references/ghl-integration.md.
 *
 * `import "server-only"` above makes the build FAIL if this file is ever imported into a
 * client component — which guarantees GHL_WEBHOOK_SECRET can never leak into the browser
 * bundle (security checklist #1).
 */

export type ToolKey = "max_offer" | "funding_path" | "first_deal_blueprint";
export type Stage = "pre-deal" | "1-3-deals" | "active";

/**
 * The payload we send to GHL. Deliberately minimal — a couple of tags + optional custom
 * fields cover GHL's nurture/personalization needs. We do NOT push full deal financials;
 * the canonical data lives in Supabase (security checklist #4).
 */
export interface GhlSyncPayload {
  email: string;
  event: "signup" | "tool_completed";
  tags: string[];
  stage?: Stage;
  customFields?: Record<string, string | number>;
}

// ── Tagging taxonomy (keep IDENTICAL across all three tools so it never drifts) ──────
export function signupPayload(email: string): GhlSyncPayload {
  return { email, event: "signup", tags: ["toolkit:signed-up"] };
}

export function toolCompletionPayload(args: {
  email: string;
  tool: ToolKey;
  /** the result bucket, e.g. "deal-verdict-good" → tag "max-offer:deal-verdict-good" */
  segment?: string;
  stage?: Stage;
  customFields?: Record<string, string | number>;
}): GhlSyncPayload {
  // tool key "max_offer" → tag prefix "max-offer"
  const prefix = args.tool.replace(/_/g, "-");
  const tags = [`tool:${prefix}-used`];
  if (args.segment) tags.push(`${prefix}:${args.segment}`);
  return {
    email: args.email,
    event: "tool_completed",
    tags,
    stage: args.stage,
    customFields: args.customFields,
  };
}

// ── The actual HTTP call. Throws on failure; syncToGhl() below catches + logs. ───────
async function postToGhl(payload: GhlSyncPayload): Promise<void> {
  const url = process.env.GHL_WEBHOOK_URL;
  const secret = process.env.GHL_WEBHOOK_SECRET;

  if (!url || !secret) {
    // Not wired yet (e.g. local dev before GHL creds exist). Don't fail the user flow —
    // just make it visible in server logs that the sync was skipped.
    console.warn(`[ghl] webhook not configured — skipping "${payload.event}" sync`);
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Shared secret so GHL can verify this request genuinely came from the app.
      "X-Toolkit-Signature": secret,
    },
    body: JSON.stringify(payload),
    // Never let a slow GHL hang a server action indefinitely.
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GHL responded ${res.status} ${res.statusText}: ${body.slice(0, 300)}`);
  }
}

/**
 * Fire-and-forget-BUT-LOGGED (security checklist #4). This never throws: a GHL outage must
 * not block the user from seeing or saving their result. On failure we record the attempt
 * in `sync_failures` so it can be inspected/replayed, instead of silently disappearing.
 *
 * `userId` MUST be the authenticated user's id (from the server session), never a value
 * the client supplied — the sync_failures RLS insert policy enforces auth.uid() = user_id.
 */
export async function syncToGhl(
  payload: GhlSyncPayload,
  ctx: { userId: string; tool?: ToolKey },
): Promise<{ ok: boolean }> {
  try {
    await postToGhl(payload);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ghl] sync failed:", message);
    try {
      const supabase = await createClient();
      await supabase.from("sync_failures").insert({
        user_id: ctx.userId,
        tool: ctx.tool ?? null,
        payload: payload as unknown as Record<string, unknown>,
        error: message,
      });
    } catch (logErr) {
      // If even logging fails, at least surface it in server logs.
      console.error("[ghl] failed to record sync_failure:", logErr);
    }
    return { ok: false };
  }
}
