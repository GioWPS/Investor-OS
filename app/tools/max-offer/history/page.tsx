import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AdjustState } from "../max-offer-results";
import { HistoryView, type SavedDeal } from "./history-view";
import "../moc.css";

/**
 * Deal history — every Max Offer report this user has run, newest first, each one
 * re-openable as the full results experience (the pure module recomputes it live from
 * the saved inputs, so old reports get the live "Adjust Your Numbers" panel too).
 *
 * Privacy: RLS on tool_results already guarantees the database only returns the signed-in
 * user's rows (policies scoped to auth.uid()). The explicit .eq("user_id", ...) below is
 * defense-in-depth + documentation of intent, not the actual security boundary.
 */

/** Round float-noise off a stored fraction → display percent (0.06 → 6). */
const pct = (fraction: unknown): number =>
  Math.round((typeof fraction === "number" ? fraction : 0) * 10000) / 100;

const num = (v: unknown): number => (typeof v === "number" && isFinite(v) ? v : 0);

interface SavedInputs {
  arv?: number;
  renovationBudget?: number;
  desiredProfit?: number;
  holdMonths?: number;
  commissionPct?: number;
  saleClosingPct?: number;
  purchaseClosingPct?: number;
  holdingInterestRate?: number;
  loanPoints?: number | null;
  originationFee?: number | null;
  price?: number;
  useRuleOfThumb?: boolean;
  segmentation?: { firstName?: string; address?: string };
}

interface SavedOutputs {
  maxOffer?: number;
  gap?: number;
  category?: string;
  categoryLabel?: string;
  score?: number;
}

export default async function MaxOfferHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("tool_results")
    .select("id, created_at, inputs, outputs")
    .eq("user_id", user.id)
    .eq("tool", "max_offer")
    .order("created_at", { ascending: false });

  const deals: SavedDeal[] = (rows ?? []).map((row) => {
    const inputs = (row.inputs ?? {}) as SavedInputs;
    const outputs = (row.outputs ?? {}) as SavedOutputs;

    // Saved inputs are in the pure module's units (fractions); AdjustState is display units.
    const state: AdjustState = {
      arv: num(inputs.arv),
      price: num(inputs.price),
      reno: num(inputs.renovationBudget),
      profit: num(inputs.desiredProfit),
      ruleOfThumb: !!inputs.useRuleOfThumb,
      holdMonths: num(inputs.holdMonths),
      commissionPct: pct(inputs.commissionPct),
      saleClosingPct: pct(inputs.saleClosingPct),
      purchaseClosingPct: pct(inputs.purchaseClosingPct),
      // loanPoints is stored as points already (not a fraction) — no conversion.
      loanPointsPct: num(inputs.loanPoints),
      holdingRatePct: pct(inputs.holdingInterestRate),
      originationFee: num(inputs.originationFee),
    };

    return {
      id: row.id as string,
      createdAt: row.created_at as string,
      firstName: inputs.segmentation?.firstName ?? "",
      address: inputs.segmentation?.address ?? "No address given",
      maxOffer: num(outputs.maxOffer),
      gap: num(outputs.gap),
      category: (outputs.category as SavedDeal["category"]) ?? "caution",
      categoryLabel: outputs.categoryLabel ?? "",
      score: num(outputs.score),
      state,
    };
  });

  return <HistoryView deals={deals} />;
}
