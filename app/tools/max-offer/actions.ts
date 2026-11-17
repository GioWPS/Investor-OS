"use server";

import { createClient } from "@/lib/supabase/server";
import { syncToGhl, toolCompletionPayload } from "@/lib/ghl";
import { buildMaxOfferRun, calculatorAnswerTags, type MaxOfferFormValues } from "@/lib/tools/max-offer-run";

// Identity (email) is NOT taken from the form — it comes from the authenticated session
// server-side (security checklist #6). Validation + the math live in the shared pure module.

export type RunMaxOfferResult = { ok: true } | { ok: false; error: string };

/**
 * Saves the deal + fires GHL. The RESULT the user sees (and the live "adjust" panel) is
 * computed client-side from the same pure module, so the UI stays instant; this action is
 * the authoritative save of the initial run.
 */
export async function runMaxOffer(values: MaxOfferFormValues): Promise<RunMaxOfferResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

    // Pure logic module — validation, MAO, verdict, score. No math lives here.
    const { analysis, stage, row } = buildMaxOfferRun(values);
    const { error: insertError } = await supabase
      .from("tool_results")
      .insert({ user_id: user.id, ...row });
    if (insertError) {
      return { ok: false, error: "Could not save your result. Please try again." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", user.id)
      .single();
    if (stage) {
      await supabase.from("profiles").update({ stage }).eq("id", user.id);
    }

    // GHL: usage tag (+ stage). Verdict SEGMENT tag intentionally held until Henry confirms
    // the results-page scoring/verdict is final (the score model is still labeled placeholder).
    await syncToGhl(
      toolCompletionPayload({
        email: user.email ?? "",
        name: { firstName: profile?.first_name, lastName: profile?.last_name },
        tool: "max_offer",
        stage,
        answers: calculatorAnswerTags(values),
        customFields: {
          max_offer: Math.round(analysis.maxOffer),
          offer_gap: Math.round(analysis.gap),
        },
      }),
      { userId: user.id, tool: "max_offer" },
    );

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong. Please try again.";
    return { ok: false, error: message };
  }
}
