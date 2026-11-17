import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { signupPayload, syncToGhl, toolCompletionPayload, type Stage } from "@/lib/ghl";
import { calculatorAnswerTags, stageFromExperience } from "@/lib/tools/max-offer-run";

/**
 * Moves a VERIFIED user's pending calculator runs (saved when someone used the GHL page with
 * their email) into their Reports. Only ever called after the user proved they own the inbox
 * by clicking the emailed link — `userId` comes from that verified session, never a request.
 * Each run keeps its id, so the link can point straight at /tools/max-offer/history?report=<id>.
 */
export async function claimPendingRuns(admin: SupabaseClient, userId: string, email: string) {
  const { data: pending, error } = await admin
    .from("pending_runs")
    .select("id, tool, inputs, outputs, result_segment, created_at")
    .eq("user_id", userId)
    .is("claimed_at", null)
    .order("created_at", { ascending: true });
  if (error || !pending?.length) return 0;

  const { error: insertError } = await admin.from("tool_results").upsert(
    pending.map((p) => ({
      id: p.id,
      user_id: userId,
      tool: p.tool,
      inputs: p.inputs,
      outputs: p.outputs,
      result_segment: p.result_segment,
      created_at: p.created_at,
    })),
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (insertError) {
    console.error("[claim] could not move pending runs:", insertError.message);
    return 0;
  }
  await admin
    .from("pending_runs")
    .update({ claimed_at: new Date().toISOString() })
    .in("id", pending.map((p) => p.id));

  // Now that the email is verified, tag the contact in GHL (same as an in-app run).
  const latest = pending[pending.length - 1];
  const inputs = latest.inputs as {
    segmentation?: { experience?: string; fundingType?: string; cashAvailable?: number | null };
  };
  const outputs = latest.outputs as { maxOffer?: number; gap?: number };
  const stage: Stage | undefined = stageFromExperience(inputs.segmentation?.experience ?? "");

  const { data: profile } = await admin
    .from("profiles")
    .select("first_name, last_name, ghl_synced_at")
    .eq("id", userId)
    .single();
  if (stage) await admin.from("profiles").update({ stage }).eq("id", userId);
  const name = { firstName: profile?.first_name, lastName: profile?.last_name };

  if (profile && !profile.ghl_synced_at) {
    await syncToGhl(signupPayload(email, name), { userId, logWith: admin });
    await admin.from("profiles").update({ ghl_synced_at: new Date().toISOString() }).eq("id", userId);
  }
  await syncToGhl(
    toolCompletionPayload({
      email,
      name,
      tool: "max_offer",
      stage,
      answers: calculatorAnswerTags(inputs.segmentation ?? {}),
      customFields: {
        max_offer: Math.round(outputs.maxOffer ?? 0),
        offer_gap: Math.round(outputs.gap ?? 0),
      },
    }),
    { userId, tool: "max_offer", logWith: admin },
  );
  return pending.length;
}

/**
 * For pages that list deals (Dashboard, Reports): attach any deals this signed-in user saved
 * from Henry's website, whether they arrived by the emailed link, a normal password login, or
 * were already signed in. Never throws — a missing key or DB hiccup just leaves them pending.
 */
export async function claimPendingRunsSafely(userId: string, email: string) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await claimPendingRuns(createAdminClient(), userId, email);
  } catch (err) {
    console.error("[claim] skipped:", err instanceof Error ? err.message : err);
  }
}
