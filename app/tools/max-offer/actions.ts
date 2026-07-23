"use server";

import { createClient } from "@/lib/supabase/server";
import { syncToGhl, toolCompletionPayload, type Stage } from "@/lib/ghl";
import {
  analyzeDeal,
  type DealCategory,
  type MaxOfferInputs,
} from "@/lib/tools/max-offer";

/**
 * Raw values coming off the form. Percentages arrive as whole numbers (6 = 6%); we convert
 * to fractions before calling the pure module. Identity (email) is NOT taken from here — it
 * comes from the authenticated session server-side (security checklist #6).
 */
export interface MaxOfferFormValues {
  arv: number;
  price: number;
  renovationBudget: number;
  desiredProfit: number;
  useRuleOfThumb: boolean;
  holdMonths: number;
  commissionPct: number; // 6  => 0.06
  saleClosingPct: number; // 2  => 0.02
  purchaseClosingPct: number; // 2  => 0.02
  holdingInterestRate: number; // 12 => 0.12
  loanPoints: number | null; // points, null => 0
  originationFee: number | null; // $, null => 0
  firstName: string;
  address: string;
  fundingType: string;
  cashAvailable: number;
  experience: string;
}

export type RunMaxOfferResult = { ok: true } | { ok: false; error: string };

function num(value: unknown, label: string, { allowNull = false } = {}): number {
  if (value === null && allowNull) return 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return value;
}

function stageFromExperience(experience: string): Stage | undefined {
  switch (experience) {
    case "First-Time Investor":
      return "pre-deal";
    case "1–3 Deals Completed":
      return "1-3-deals";
    case "4–10 Deals Completed":
    case "10+ Deals Completed":
      return "active";
    default:
      return undefined;
  }
}

/** Verdict category → GHL/DB result-segment slug (matches the toolkit tagging taxonomy). */
function verdictSegment(category: DealCategory): string {
  return category === "positive"
    ? "deal-verdict-good"
    : category === "caution"
      ? "deal-verdict-tight"
      : "deal-verdict-pass";
}

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

    const inputs: MaxOfferInputs = {
      arv: num(values.arv, "ARV"),
      renovationBudget: num(values.renovationBudget, "Renovation budget"),
      desiredProfit: num(values.desiredProfit, "Desired profit"),
      holdMonths: num(values.holdMonths, "Hold time"),
      commissionPct: num(values.commissionPct, "Commission") / 100,
      saleClosingPct: num(values.saleClosingPct, "Sale closing cost") / 100,
      purchaseClosingPct: num(values.purchaseClosingPct, "Purchase closing cost") / 100,
      holdingInterestRate: num(values.holdingInterestRate, "Holding interest rate") / 100,
      loanPoints: num(values.loanPoints, "Loan points", { allowNull: true }),
      originationFee: num(values.originationFee, "Origination fee", { allowNull: true }),
    };
    const price = num(values.price, "Purchase price");

    // Pure logic module — MAO + verdict + score. No math lives here.
    const analysis = analyzeDeal(inputs, price);

    const segmentation = {
      firstName: values.firstName,
      address: values.address,
      fundingType: values.fundingType,
      cashAvailable: values.cashAvailable,
      experience: values.experience,
    };
    const { error: insertError } = await supabase.from("tool_results").insert({
      user_id: user.id,
      tool: "max_offer",
      inputs: { ...inputs, price, useRuleOfThumb: values.useRuleOfThumb, segmentation },
      outputs: analysis as unknown as Record<string, unknown>,
      // We now have verdict logic, so store the segment. (GHL segment TAG still gated below.)
      result_segment: verdictSegment(analysis.category),
    });
    if (insertError) {
      return { ok: false, error: "Could not save your result. Please try again." };
    }

    const stage = stageFromExperience(values.experience);
    if (stage) {
      await supabase.from("profiles").update({ stage }).eq("id", user.id);
    }

    // GHL: usage tag (+ stage). Verdict SEGMENT tag intentionally held until Henry confirms
    // the results-page scoring/verdict is final (the score model is still labeled placeholder).
    await syncToGhl(
      toolCompletionPayload({
        email: user.email ?? "",
        tool: "max_offer",
        stage,
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
