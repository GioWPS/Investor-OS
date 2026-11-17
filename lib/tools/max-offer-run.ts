/**
 * Turning a Max Offer submission into a saved run — pure (no React/Supabase/Next), shared by
 * the in-app calculator (server action) and the GHL-page signup endpoint, so both save the
 * exact same shape and always compute with the server's own copy of the formula.
 */
import { analyzeDeal, type DealAnalysis, type DealCategory, type MaxOfferInputs } from "./max-offer";

export type Stage = "pre-deal" | "1-3-deals" | "active";

/**
 * Raw values in the calculator's DISPLAY units: percentages as whole numbers (6 = 6%),
 * loan points as points, everything else in dollars / months.
 */
export interface MaxOfferFormValues {
  arv: number;
  price: number;
  renovationBudget: number;
  desiredProfit: number;
  useRuleOfThumb: boolean;
  holdMonths: number;
  commissionPct: number;
  saleClosingPct: number;
  purchaseClosingPct: number;
  holdingInterestRate: number;
  loanPoints: number | null;
  originationFee: number | null;
  firstName: string;
  address: string;
  fundingType: string;
  /** null = not answered (the GHL page may leave it out) */
  cashAvailable: number | null;
  experience: string;
}

function num(value: unknown, label: string, { allowNull = false } = {}): number {
  if (value === null && allowNull) return 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
  return value;
}

export function stageFromExperience(experience: string): Stage | undefined {
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
export function verdictSegment(category: DealCategory): string {
  return category === "positive"
    ? "deal-verdict-good"
    : category === "caution"
      ? "deal-verdict-tight"
      : "deal-verdict-pass";
}

export interface MaxOfferRun {
  analysis: DealAnalysis;
  stage: Stage | undefined;
  /** Exactly what goes into tool_results (minus user_id / id). */
  row: {
    tool: "max_offer";
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    result_segment: string;
  };
}

/** Validates the values and computes the deal. Throws a friendly Error on bad input. */
export function buildMaxOfferRun(
  values: MaxOfferFormValues,
  extra: { attribution?: Record<string, string> } = {},
): MaxOfferRun {
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
  const analysis = analyzeDeal(inputs, price);

  const segmentation = {
    firstName: values.firstName,
    address: values.address,
    fundingType: values.fundingType,
    cashAvailable: values.cashAvailable,
    experience: values.experience,
  };

  return {
    analysis,
    stage: stageFromExperience(values.experience),
    row: {
      tool: "max_offer",
      inputs: {
        ...inputs,
        price,
        useRuleOfThumb: values.useRuleOfThumb,
        segmentation,
        ...(extra.attribution && Object.keys(extra.attribution).length
          ? { attribution: extra.attribution }
          : {}),
      },
      outputs: analysis as unknown as Record<string, unknown>,
      result_segment: verdictSegment(analysis.category),
    },
  };
}

// ── The GHL calculator page's submission (POST /api/calculator-signup) ─────────────────

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;

/** Hidden field real people never fill in. Bots that auto-fill every input do. */
export const HONEYPOT_FIELD = "website";

export interface CalculatorSignup {
  firstName: string;
  email: string;
  values: MaxOfferFormValues;
  attribution: Record<string, string>;
  /** true when the hidden honeypot field was filled → treat as a bot. */
  isBot: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Accepts 150000, "150000", "$150,000", "6%". Empty / missing → null. */
function toNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/[$,%\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** First present value among several field names — the GHL calculator page's own labels
 *  (camelCase, e.g. "firstName", "saleClosingPct") or this API's snake_case names. */
function field(b: Record<string, unknown>, ...names: string[]): unknown {
  for (const n of names) if (b[n] !== undefined && b[n] !== null && b[n] !== "") return b[n];
  return undefined;
}

function text(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Parses the page's JSON body. Accepts the calculator page's own labels (firstName, price,
 * reno, holdMonths, commissionPct, saleClosingPct, purchaseClosingPct, loanPointsPct,
 * originationFee, holdingRatePct, fundingType, cashAvailable) or the snake_case names in
 * HANDOFF/CALCULATOR-SIGNUP-ENDPOINT.md. Missing profit → rule of thumb (profit = repairs).
 */
export function parseCalculatorSignup(
  body: unknown,
): { ok: true; data: CalculatorSignup } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const b = body as Record<string, unknown>;

  const isBot = text(b[HONEYPOT_FIELD]) !== "";
  const firstName = text(field(b, "first_name", "firstName"), 80);
  const email = text(b.email, 254).toLowerCase();
  if (!firstName) return { ok: false, error: "Please enter your first name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };

  // key → [label, accepted field names (API name first, then the calculator page's label)]
  const required: Record<string, [string, string[]]> = {
    arv: ["ARV", ["arv"]],
    asking: ["Asking price", ["asking", "price"]],
    repairs: ["Repair budget", ["repairs", "reno"]],
    hold: ["Hold time", ["hold", "holdMonths"]],
    commission: ["Commission", ["commission", "commissionPct"]],
    sale_closing: ["Sale closing costs", ["sale_closing", "saleClosingPct"]],
    purchase_closing: ["Purchase closing costs", ["purchase_closing", "purchaseClosingPct"]],
    rate: ["Interest rate", ["rate", "holdingRatePct"]],
  };
  const n: Record<string, number> = {};
  for (const [key, [label, names]] of Object.entries(required)) {
    const v = toNumber(field(b, ...names));
    if (v === null || Number.isNaN(v) || v < 0) return { ok: false, error: `${label} must be a number.` };
    n[key] = v;
  }
  const optional = (names: string[], label: string): number | null | { error: string } => {
    const v = toNumber(field(b, ...names));
    if (v === null) return null;
    if (Number.isNaN(v) || v < 0) return { error: `${label} must be a number.` };
    return v;
  };
  const profit = optional(["profit"], "Profit");
  const points = optional(["points", "loanPointsPct"], "Loan points");
  const origination = optional(["origination", "originationFee"], "Origination fee");
  for (const v of [profit, points, origination]) {
    if (v && typeof v === "object") return { ok: false, error: v.error };
  }
  // Cash available is an answer, not math: if it isn't a usable number, just leave it out.
  const cashRaw = toNumber(field(b, "cash_available", "cashAvailable"));
  const cash = cashRaw === null || Number.isNaN(cashRaw) || cashRaw < 0 ? null : cashRaw;

  const useRuleOfThumb = profit === null;
  const attribution: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const v = text(b[key], 200);
    if (v) attribution[key] = v;
  }

  return {
    ok: true,
    data: {
      firstName,
      email,
      isBot,
      attribution,
      values: {
        arv: n.arv,
        price: n.asking,
        renovationBudget: n.repairs,
        desiredProfit: useRuleOfThumb ? n.repairs : (profit as number),
        useRuleOfThumb,
        holdMonths: n.hold,
        commissionPct: n.commission,
        saleClosingPct: n.sale_closing,
        purchaseClosingPct: n.purchase_closing,
        holdingInterestRate: n.rate,
        loanPoints: points as number | null,
        originationFee: origination as number | null,
        firstName,
        address: text(field(b, "address"), 200),
        fundingType: text(field(b, "funding_type", "fundingType"), 80),
        cashAvailable: cash,
        experience: text(field(b, "experience"), 80),
      },
    },
  };
}

// ── Calculator answer tags (Tazz approved Nov 17, 2026) ────────────────────────────────
// Every tag starts with "cal-" so it's clear it came from the calculator. One tag per
// answer: the other options in that group are sent as removeTags so an old answer is swapped.

const CAL_FUND = ["cash", "conventional", "hard-money", "private", "seller"] as const;
const CAL_CASH = ["under-10k", "10-25k", "25-50k", "50-100k", "100k-plus"] as const;
const CAL_EXP = ["new", "1-3", "4-10", "10-plus"] as const;

function fundSlug(fundingType: string): (typeof CAL_FUND)[number] | null {
  const f = fundingType.toLowerCase();
  if (!f) return null;
  if (f.includes("seller")) return "seller";
  if (f.includes("hard")) return "hard-money";
  if (f.includes("private")) return "private";
  if (f.includes("conventional")) return "conventional";
  if (f.includes("cash")) return "cash";
  return null;
}

function cashSlug(cash: number | null | undefined): (typeof CAL_CASH)[number] | null {
  if (cash === null || cash === undefined || !Number.isFinite(cash) || cash < 0) return null;
  if (cash < 10_000) return "under-10k";
  if (cash < 25_000) return "10-25k";
  if (cash < 50_000) return "25-50k";
  if (cash < 100_000) return "50-100k";
  return "100k-plus";
}

function expSlug(experience: string): (typeof CAL_EXP)[number] | null {
  switch (experience) {
    case "First-Time Investor":
      return "new";
    case "1–3 Deals Completed":
      return "1-3";
    case "4–10 Deals Completed":
      return "4-10";
    case "10+ Deals Completed":
      return "10-plus";
    default:
      return null;
  }
}

/** The cal- tags for a run's 3 answers, plus the same-group tags to take off. */
export function calculatorAnswerTags(answers: {
  fundingType?: string;
  cashAvailable?: number | null;
  experience?: string;
}): { tags: string[]; removeTags: string[] } {
  const tags: string[] = [];
  const removeTags: string[] = [];
  const add = (group: string, all: readonly string[], value: string | null) => {
    if (!value) return;
    tags.push(`cal-${group}:${value}`);
    for (const other of all) if (other !== value) removeTags.push(`cal-${group}:${other}`);
  };
  add("fund", CAL_FUND, fundSlug(answers.fundingType ?? ""));
  add("cash", CAL_CASH, cashSlug(answers.cashAvailable));
  add("exp", CAL_EXP, expSlug(answers.experience ?? ""));
  return { tags, removeTags };
}
