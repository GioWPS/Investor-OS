/**
 * Max Offer Calculator — PURE logic module.
 *
 * No React, no Supabase, no Next.js. Just Henry's MAO framework as math. This file is the
 * asset that gets *lifted* into Closing Table OS's Deal Analyzer later instead of rewritten
 * (see ctos-migration-notes.md). Ported directly from Henry's Excel/Sheets MVP
 * ("MAO Calculator" sheet, cell B50 and Section 3).
 *
 * ── Why the formula looks the way it does ────────────────────────────────────────────
 * The purchase price (the MAO) is what we're solving for, but several costs DEPEND on it:
 *   - purchase-side closing costs  = MAO × purchaseClosingPct
 *   - holding cost                 = rate × (MAO + reno) / 12 × months   (interest on MAO)
 *   - loan points                  = MAO × points%
 * So you can't just subtract costs from ARV — the answer is self-referential. Henry's sheet
 * solves the flip P&L algebraically for the purchase price:
 *
 *   profit = ARV − commissions − saleClosing − reno − MAO − purchaseClosing
 *            − holdingCost − loanPoints − originationFee
 *
 * Collecting every MAO term on one side gives:
 *
 *            ARV − ARV·comm − ARV·saleClose − reno − profit − (rate·reno/12·months) − orig
 *   MAO =  ─────────────────────────────────────────────────────────────────────────────
 *                       1 + purchaseClose + (rate/12·months) + points/100
 *
 * which is exactly the sheet's B50. Keep this derivation intact — approximating it (e.g. the
 * naive "ARV × 70% − repairs" rule) would give a materially different, wrong number.
 */

export interface MaxOfferInputs {
  /** After Repair Value — expected resale value after renovation. */
  arv: number;
  /** Full rehab estimate (materials, labor, permits, contingency). */
  renovationBudget: number;
  /** Target profit from the deal (Henry's rule of thumb: ~= renovation budget). */
  desiredProfit: number;
  /** Months held from purchase through resale. */
  holdMonths: number;
  /** Real estate commission, as a fraction (0.06 = 6%). */
  commissionPct: number;
  /** Sale-side closing costs, as a fraction (0.02 = 2%). */
  saleClosingPct: number;
  /** Purchase-side closing costs, as a fraction (0.02 = 2%). */
  purchaseClosingPct: number;
  /** Annual holding/interest rate, as a fraction (0.12 = 12%). */
  holdingInterestRate: number;
  /** Loan points, expressed as the number of points (2 = 2%). Blank in the sheet → 0. */
  loanPoints?: number;
  /** Flat loan origination fee in dollars. Blank in the sheet → 0. */
  originationFee?: number;
}

export interface MaxOfferBreakdown {
  commissions: number;
  saleClosingCosts: number;
  purchaseClosingCosts: number;
  totalClosingCosts: number;
  monthlyHoldingCost: number;
  totalHoldingCost: number;
  loanPointsCost: number;
  totalFinancingFees: number;
}

export interface MaxOfferResult {
  /** The Maximum Allowable Offer — highest price you should pay for the property. */
  maxOffer: number;
  breakdown: MaxOfferBreakdown;
}

/** The sheet's default assumptions, surfaced so the UI can prefill them. */
export const MAX_OFFER_DEFAULTS = {
  commissionPct: 0.06,
  saleClosingPct: 0.02,
  purchaseClosingPct: 0.02,
  holdingInterestRate: 0.12,
  loanPoints: 2,
  originationFee: 500,
} as const;

export function calculateMaxOffer(inputs: MaxOfferInputs): MaxOfferResult {
  const {
    arv,
    renovationBudget: reno,
    desiredProfit: profit,
    holdMonths: months,
    commissionPct: comm,
    saleClosingPct: saleClose,
    purchaseClosingPct: purchClose,
    holdingInterestRate: rate,
  } = inputs;

  // Blank point/origination fields in the sheet are treated as 0 (IF(...="",0,...)).
  const points = inputs.loanPoints ?? 0;
  const originationFee = inputs.originationFee ?? 0;

  // Sheet B50.
  const numerator =
    arv -
    arv * comm -
    arv * saleClose -
    reno -
    profit -
    (rate * reno) / 12 * months -
    originationFee;
  const denominator = 1 + purchClose + (rate / 12) * months + points / 100;
  const maxOffer = numerator / denominator;

  // Section 3 cost breakdown, using the solved MAO where the sheet references B50.
  const commissions = arv * comm; // B42
  const saleClosingCosts = arv * saleClose; // B43
  const purchaseClosingCosts = maxOffer * purchClose; // B44
  const totalClosingCosts = saleClosingCosts + purchaseClosingCosts; // B45
  const monthlyHoldingCost = (rate * (maxOffer + reno)) / 12; // B46
  const totalHoldingCost = monthlyHoldingCost * months; // B47
  const loanPointsCost = maxOffer * (points / 100); // E42
  const totalFinancingFees = loanPointsCost + originationFee; // E43

  return {
    maxOffer,
    breakdown: {
      commissions,
      saleClosingCosts,
      purchaseClosingCosts,
      totalClosingCosts,
      monthlyHoldingCost,
      totalHoldingCost,
      loanPointsCost,
      totalFinancingFees,
    },
  };
}
