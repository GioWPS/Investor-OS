"use server";

import { createClient } from "@/lib/supabase/server";
import { syncToGhl, toolCompletionPayload } from "@/lib/ghl";
import {
  calculateMaxOffer,
  type MaxOfferInputs,
  type MaxOfferResult,
} from "@/lib/tools/max-offer";

/**
 * Raw values coming off the form. Percentages arrive as whole numbers (6 = 6%) because
 * that's what a user types; we convert to fractions before calling the pure module.
 */
export interface MaxOfferFormValues {
  arv: number;
  renovationBudget: number;
  desiredProfit: number;
  holdMonths: number;
  commissionPct: number; // 6  => 0.06
  saleClosingPct: number; // 2  => 0.02
  purchaseClosingPct: number; // 2  => 0.02
  holdingInterestRate: number; // 12 => 0.12
  loanPoints: number | null; // 2 points; null => 0
  originationFee: number | null; // $; null => 0
}

export type RunMaxOfferResult =
  | { ok: true; result: MaxOfferResult }
  | { ok: false; error: string };

/** Guard: finite, non-negative number. We never trust client numbers to be clean. */
function num(value: unknown, label: string, { allowNull = false } = {}): number {
  if (value === null && allowNull) return 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return value;
}

export async function runMaxOffer(
  values: MaxOfferFormValues,
): Promise<RunMaxOfferResult> {
  try {
    // 1) The acting user comes from the session, NEVER from the client (checklist #6).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

    // 2) Validate + normalize inputs server-side (percent → fraction).
    const inputs: MaxOfferInputs = {
      arv: num(values.arv, "ARV"),
      renovationBudget: num(values.renovationBudget, "Renovation budget"),
      desiredProfit: num(values.desiredProfit, "Desired profit"),
      holdMonths: num(values.holdMonths, "Hold time"),
      commissionPct: num(values.commissionPct, "Commission") / 100,
      saleClosingPct: num(values.saleClosingPct, "Sale closing cost") / 100,
      purchaseClosingPct:
        num(values.purchaseClosingPct, "Purchase closing cost") / 100,
      holdingInterestRate:
        num(values.holdingInterestRate, "Holding interest rate") / 100,
      loanPoints: num(values.loanPoints, "Loan points", { allowNull: true }),
      originationFee: num(values.originationFee, "Origination fee", {
        allowNull: true,
      }),
    };

    // 3) Call the PURE logic module. All domain math lives there, not here.
    const result = calculateMaxOffer(inputs);

    // 4) Save to tool_results. RLS enforces user_id = auth.uid(); we pass the session id.
    const { error: insertError } = await supabase.from("tool_results").insert({
      user_id: user.id,
      tool: "max_offer",
      inputs: inputs as unknown as Record<string, unknown>,
      outputs: result as unknown as Record<string, unknown>,
      result_segment: null, // deal verdict/segment TBD — see note in the PR/summary
    });
    if (insertError) {
      return { ok: false, error: "Could not save your result. Please try again." };
    }

    // 5) Fire the GHL usage tag — fire-and-forget-but-logged, so a GHL hiccup never blocks
    //    the user from seeing their result. We send the SESSION email, not a client value.
    await syncToGhl(
      toolCompletionPayload({
        email: user.email ?? "",
        tool: "max_offer",
        customFields: { max_offer: Math.round(result.maxOffer) },
      }),
      { userId: user.id, tool: "max_offer" },
    );

    return { ok: true, result };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong. Please try again.";
    return { ok: false, error: message };
  }
}
