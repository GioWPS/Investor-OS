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

// ─────────────────────────────────────────────────────────────────────────────
// Deal analysis: the results-page logic (verdict, profit-at-price, score, watch-outs).
// Ported from Henry's live results page. The MAO core is reused from calculateMaxOffer
// above (same formula) — this layer adds the price-based comparison and coaching.
// ─────────────────────────────────────────────────────────────────────────────

export type DealCategory = "positive" | "caution" | "negative";

/**
 * Version tag for the Offer Strength Score. The score weights below are a PLACEHOLDER
 * model, carried over from the results-page mock-up — per that page's own note, they are
 * "to be confirmed by Henry/team." The MAO and the verdict category are real; the 0–100
 * score is not final. Bump this string when Henry signs off on the real model.
 */
export const SCORE_MODEL_VERSION = "offer-strength-score-placeholder-v1";

export interface DealAnalysis extends MaxOfferResult {
  /** Asking / purchase price the offer is compared against. */
  price: number;
  /** maxOffer - price. Positive => asking is at/below your max. */
  gap: number;
  /** gap as a percentage of maxOffer. */
  gapPct: number;
  /** Estimated profit if you actually buy at `price` (not at the MAO). */
  profitAtPrice: number;
  category: DealCategory;
  categoryLabel: string;
  categoryMessage: string;
  /** 0–100. PLACEHOLDER model — see SCORE_MODEL_VERSION. Not yet Henry-confirmed. */
  score: number;
  watchouts: string[];
  nextStep: string;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** ±5% band around the MAO within which a deal is considered "tight" rather than clearly good/bad. */
const TIGHT_BAND_PCT = 5;

export function analyzeDeal(inputs: MaxOfferInputs, price: number): DealAnalysis {
  const { maxOffer, breakdown } = calculateMaxOffer(inputs);

  const {
    arv: A,
    renovationBudget: R,
    desiredProfit: P,
    holdMonths: m,
    commissionPct: c,
    saleClosingPct: s,
    purchaseClosingPct: pc,
    holdingInterestRate: i,
  } = inputs;
  const points = (inputs.loanPoints ?? 0) / 100;
  const originationFee = inputs.originationFee ?? 0;

  // Profit if you actually buy at the asking price (costs recomputed against `price`).
  const commission = c * A;
  const saleClosing = s * A;
  const purchaseClosingAtPrice = pc * price;
  const loanPointsAtPrice = points * price;
  const totalHoldAtPrice = ((i * (price + R)) / 12) * m;
  const profitAtPrice =
    A - price - R - commission - saleClosing - purchaseClosingAtPrice - loanPointsAtPrice - originationFee - totalHoldAtPrice;

  const gap = maxOffer - price;
  const gapPct = maxOffer !== 0 ? (gap / maxOffer) * 100 : 0;

  // Verdict category (real logic): room against the MAO, within a ±5% "tight" band.
  const category: DealCategory =
    gapPct >= TIGHT_BAND_PCT ? "positive" : gapPct > -TIGHT_BAND_PCT ? "caution" : "negative";
  const categoryLabel =
    category === "positive"
      ? "Strong Offer Zone"
      : category === "caution"
        ? "Worth a Closer Look"
        : "Needs Negotiation";
  const categoryMessage =
    category === "positive"
      ? "Based on the assumptions entered, your offer appears to have room against the max offer target."
      : category === "caution"
        ? "This offer may be workable, but the margin is tight. Review your assumptions carefully."
        : "This offer may need negotiation or a different strategy before it makes sense based on the numbers entered.";

  // Offer Strength Score (0–100). PLACEHOLDER weighting — see SCORE_MODEL_VERSION.
  const gapScore = clamp(60 + gapPct * 4, 0, 100);
  const marginScore = A > 0 ? clamp((profitAtPrice / A / 0.15) * 100, 0, 100) : 0;
  const renoScore = A > 0 ? clamp((1 - R / A / 0.5) * 100, 0, 100) : 100;
  const holdScore = clamp((1 - Math.max(0, m - 6) / 12) * 100, 0, 100);
  const score = Math.round(gapScore * 0.45 + marginScore * 0.3 + renoScore * 0.15 + holdScore * 0.1);

  // Watch-outs (ported conditions).
  const watchouts: string[] = [];
  if (A > 0 && R / A > 0.15)
    watchouts.push("Your renovation budget is a large share of ARV — get a firm contractor bid before you commit.");
  if (c + s >= 0.09)
    watchouts.push(
      `Selling costs (commission + closing) run about ${Math.round((c + s) * 100)}% of ARV — confirm your agent split up front.`,
    );
  if (m > 6)
    watchouts.push("Your hold time is longer than the 6-month default — every extra month adds holding cost.");
  if (gap < 0)
    watchouts.push("Your purchase price is above the max allowable offer — plan to negotiate before moving forward.");
  if (profitAtPrice < P)
    watchouts.push("Profit at your purchase price falls short of your desired profit target.");
  if (breakdown.totalFinancingFees > 0 && A > 0 && breakdown.totalFinancingFees / A > 0.02)
    watchouts.push(
      "Loan points and origination fees are a notable share of ARV — confirm these terms with your lender before you rely on this number.",
    );
  if (watchouts.length === 0)
    watchouts.push("No major red flags surfaced — still verify ARV with fresh comps before you commit.");

  const nextStep =
    category === "positive"
      ? "The numbers here leave real room against your max offer. Verify your ARV with fresh comps and lock in a written contractor bid on the renovation. If both hold up, this is a deal worth moving on quickly and with confidence."
      : category === "caution"
        ? "This one is close. Tighten your renovation estimate with a real contractor bid and re-check your ARV against recent sold comps. Small changes to either number will decide whether this deal works — underwrite it carefully before you make an offer."
        : "At these numbers the offer is a stretch. Either negotiate the purchase price down toward your max allowable offer, trim the renovation scope, or walk. Run the deal again with a lower price to see what it would take to bring it into range.";

  return {
    maxOffer,
    breakdown,
    price,
    gap,
    gapPct,
    profitAtPrice,
    category,
    categoryLabel,
    categoryMessage,
    score,
    watchouts,
    nextStep,
  };
}
