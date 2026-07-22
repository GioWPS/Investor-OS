"use client";

import { useState, type FormEvent } from "react";
import { MAX_OFFER_DEFAULTS, type MaxOfferResult } from "@/lib/tools/max-offer";
import { runMaxOffer, type MaxOfferFormValues } from "./actions";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usd2 = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Deal-specific fields the user must enter, plus assumption fields prefilled from the sheet. */
const DEAL_FIELDS = [
  { key: "arv", label: "After Repair Value (ARV)", prefix: "$", placeholder: "310000" },
  { key: "renovationBudget", label: "Renovation Budget", prefix: "$", placeholder: "85000" },
  { key: "desiredProfit", label: "Desired Profit", prefix: "$", placeholder: "35000", hint: "Rule of thumb: target profit ≈ renovation budget." },
  { key: "holdMonths", label: "Estimated Hold Time (months)", prefix: "", placeholder: "8" },
] as const;

const ASSUMPTION_FIELDS = [
  { key: "commissionPct", label: "Real Estate Commission", suffix: "%", default: MAX_OFFER_DEFAULTS.commissionPct * 100 },
  { key: "saleClosingPct", label: "Closing Costs (Sale Side)", suffix: "%", default: MAX_OFFER_DEFAULTS.saleClosingPct * 100 },
  { key: "purchaseClosingPct", label: "Closing Costs (Purchase Side)", suffix: "%", default: MAX_OFFER_DEFAULTS.purchaseClosingPct * 100 },
  { key: "holdingInterestRate", label: "Holding Cost Interest Rate", suffix: "%", default: MAX_OFFER_DEFAULTS.holdingInterestRate * 100 },
  { key: "loanPoints", label: "Loan Points (optional)", suffix: "pts", default: MAX_OFFER_DEFAULTS.loanPoints, optional: true },
  { key: "originationFee", label: "Origination Fee (optional)", prefix: "$", default: MAX_OFFER_DEFAULTS.originationFee, optional: true },
] as const;

type FieldKey = keyof MaxOfferFormValues;

export function MaxOfferForm() {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    arv: "",
    renovationBudget: "",
    desiredProfit: "",
    holdMonths: "",
    commissionPct: String(MAX_OFFER_DEFAULTS.commissionPct * 100),
    saleClosingPct: String(MAX_OFFER_DEFAULTS.saleClosingPct * 100),
    purchaseClosingPct: String(MAX_OFFER_DEFAULTS.purchaseClosingPct * 100),
    holdingInterestRate: String(MAX_OFFER_DEFAULTS.holdingInterestRate * 100),
    loanPoints: String(MAX_OFFER_DEFAULTS.loanPoints),
    originationFee: String(MAX_OFFER_DEFAULTS.originationFee),
  });
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<MaxOfferResult | null>(null);

  const set = (key: FieldKey, v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  function parseOptional(v: string): number | null {
    if (v.trim() === "") return null;
    return Number(v);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("working");
    setError("");

    const payload: MaxOfferFormValues = {
      arv: Number(values.arv),
      renovationBudget: Number(values.renovationBudget),
      desiredProfit: Number(values.desiredProfit),
      holdMonths: Number(values.holdMonths),
      commissionPct: Number(values.commissionPct),
      saleClosingPct: Number(values.saleClosingPct),
      purchaseClosingPct: Number(values.purchaseClosingPct),
      holdingInterestRate: Number(values.holdingInterestRate),
      loanPoints: parseOptional(values.loanPoints),
      originationFee: parseOptional(values.originationFee),
    };

    const res = await runMaxOffer(payload);
    if (res.ok) {
      setResult(res.result);
      setStatus("idle");
    } else {
      setStatus("error");
      setError(res.error);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-surface p-6">
        <fieldset>
          <legend className="text-sm font-semibold uppercase tracking-wide text-muted">
            Property assumptions
          </legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {DEAL_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="text-sm font-medium text-ink">{f.label}</span>
                <div className="mt-1 flex items-center rounded-lg border border-line bg-white focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
                  {f.prefix && <span className="pl-3 text-muted">{f.prefix}</span>}
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    required
                    placeholder={f.placeholder}
                    value={values[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-ink outline-none"
                  />
                </div>
                {"hint" in f && f.hint && (
                  <span className="mt-1 block text-xs text-muted">{f.hint}</span>
                )}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold uppercase tracking-wide text-muted">
            Adjustable cost assumptions
          </legend>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {ASSUMPTION_FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="text-sm font-medium text-ink">{f.label}</span>
                <div className="mt-1 flex items-center rounded-lg border border-line bg-white focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft">
                  {"prefix" in f && f.prefix && <span className="pl-3 text-muted">{f.prefix}</span>}
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    required={!("optional" in f && f.optional)}
                    value={values[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-ink outline-none"
                  />
                  {"suffix" in f && f.suffix && <span className="pr-3 text-muted">{f.suffix}</span>}
                </div>
              </label>
            ))}
          </div>
        </fieldset>

        {status === "error" && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={status === "working"}
          className="mt-6 rounded-lg bg-accent px-5 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {status === "working" ? "Calculating…" : "Calculate Max Offer"}
        </button>
      </form>

      {result && (
        <div className="rounded-xl border-2 border-accent bg-accent-soft/40 p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-accent-ink">
            Your Maximum Allowable Offer
          </p>
          <p className="mt-1 text-4xl font-bold text-ink">{usd(result.maxOffer)}</p>
          <p className="mt-1 text-sm text-muted">
            The highest price you should pay for this property to hit your target profit.
          </p>

          <dl className="mt-6 divide-y divide-line border-t border-line text-sm">
            {[
              ["Real estate commissions", result.breakdown.commissions],
              ["Sale closing costs", result.breakdown.saleClosingCosts],
              ["Purchase closing costs", result.breakdown.purchaseClosingCosts],
              ["Total closing costs", result.breakdown.totalClosingCosts],
              ["Monthly holding cost", result.breakdown.monthlyHoldingCost],
              ["Total holding cost", result.breakdown.totalHoldingCost],
              ["Loan points cost", result.breakdown.loanPointsCost],
              ["Total financing fees", result.breakdown.totalFinancingFees],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between py-2">
                <dt className="text-muted">{label}</dt>
                <dd className="font-medium text-ink">{usd2(value as number)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted">Saved to your dashboard.</p>
        </div>
      )}
    </div>
  );
}
