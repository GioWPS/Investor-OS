"use client";

import { useState } from "react";
import { runMaxOffer } from "./actions";
import { MaxOfferResults, type AdjustState } from "./max-offer-results";
import { BackToDashboard } from "./back-to-dashboard";

const BRAND_LOGO =
  "https://assets.cdn.filesafe.space/4uMmDI2kosLMlzdAlUS8/media/6a1dd49ff563bf237f85f9b5.png";

/* ---------- parsing helpers (ported from the GHL page) ---------- */
const num = (v: string) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};
const rawDigits = (v: string) => String(v ?? "").replace(/[^0-9.]/g, "");
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

type Values = Record<string, string>;

const INITIAL = (email: string): Values => ({
  firstName: "",
  email,
  address: "",
  arv: "",
  price: "",
  reno: "",
  profit: "",
  holdMonths: "8",
  commissionPct: "6",
  saleClosingPct: "2",
  purchaseClosingPct: "2",
  loanPointsPct: "",
  originationFee: "",
  holdingRatePct: "12",
  fundingType: "",
  cashAvailable: "",
  experience: "",
});

export function MaxOfferForm({ userEmail }: { userEmail: string }) {
  const [v, setV] = useState<Values>(() => INITIAL(userEmail));
  const [ruleOfThumb, setRuleOfThumb] = useState(true);
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [results, setResults] = useState<{
    state: AdjustState;
    firstName: string;
    address: string;
  } | null>(null);

  const profitDisplay = ruleOfThumb ? v.reno : v.profit;

  function set(name: string, value: string) {
    setV((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "reno" && ruleOfThumb) next.profit = value;
      return next;
    });
  }

  function toggleRule() {
    setRuleOfThumb((on) => {
      const nowOn = !on;
      if (nowOn) setV((prev) => ({ ...prev, profit: prev.reno }));
      return nowOn;
    });
  }

  function fieldClass(name: string, extra = "") {
    return `${extra} ${errors.has(name) ? "field-err" : ""}`.trim();
  }

  function validate(): boolean {
    const e = new Set<string>();
    if (!v.firstName.trim()) e.add("firstName");
    if (!isValidEmail(v.email.trim())) e.add("email");
    if (!v.address.trim()) e.add("address");
    if (rawDigits(v.arv) === "" || num(v.arv) <= 0) e.add("arv");
    (["price", "reno", "cashAvailable"] as const).forEach((n) => {
      if (rawDigits(v[n]) === "") e.add(n);
    });
    if (rawDigits(profitDisplay) === "") e.add("profit");
    (["holdMonths", "commissionPct", "saleClosingPct", "purchaseClosingPct", "holdingRatePct"] as const).forEach(
      (n) => {
        if (v[n].trim() === "") e.add(n);
      },
    );
    if (!v.fundingType) e.add("fundingType");
    if (!v.experience) e.add("experience");
    setErrors(e);
    return e.size === 0;
  }

  async function handleCalculate() {
    setFormError("");
    if (!validate()) {
      setTimeout(() => {
        document.querySelector(".field-err")?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
      return;
    }
    setSubmitting(true);
    const desiredProfit = ruleOfThumb ? num(v.reno) : num(v.profit);
    const loanPoints = v.loanPointsPct.trim() === "" ? null : num(v.loanPointsPct);
    const originationFee = v.originationFee.trim() === "" ? null : num(v.originationFee);

    const res = await runMaxOffer({
      arv: num(v.arv),
      price: num(v.price),
      renovationBudget: num(v.reno),
      desiredProfit,
      useRuleOfThumb: ruleOfThumb,
      holdMonths: num(v.holdMonths),
      commissionPct: num(v.commissionPct),
      saleClosingPct: num(v.saleClosingPct),
      purchaseClosingPct: num(v.purchaseClosingPct),
      holdingInterestRate: num(v.holdingRatePct),
      loanPoints,
      originationFee,
      firstName: v.firstName,
      address: v.address,
      fundingType: v.fundingType,
      cashAvailable: num(v.cashAvailable),
      experience: v.experience,
    });
    setSubmitting(false);

    if (res.ok) {
      const state: AdjustState = {
        arv: num(v.arv),
        price: num(v.price),
        reno: num(v.reno),
        profit: desiredProfit,
        ruleOfThumb,
        holdMonths: num(v.holdMonths),
        commissionPct: num(v.commissionPct),
        saleClosingPct: num(v.saleClosingPct),
        purchaseClosingPct: num(v.purchaseClosingPct),
        loanPointsPct: loanPoints ?? 0,
        holdingRatePct: num(v.holdingRatePct),
        originationFee: originationFee ?? 0,
      };
      setResults({ state, firstName: v.firstName, address: v.address });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setFormError(res.error);
    }
  }

  function runAnother() {
    setResults(null);
    setErrors(new Set());
  }

  if (results) {
    return (
      <MaxOfferResults
        initial={results.state}
        firstName={results.firstName}
        address={results.address}
        onReset={runAnother}
      />
    );
  }

  return (
    <div className="app-bg">
      <div className="sheet">
        <header className="app-header">
          <div className="brand-lock">
            <img src={BRAND_LOGO} alt="Henry Washington" />
            <span className="brand-rule" />
            <div>
              <div className="brand-eyebrow">The Closing Table</div>
              <div className="brand-name">Max Offer Calculator</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <BackToDashboard />
            <span className="header-tag">Free Deal Tool</span>
          </div>
        </header>

        <div className="body-pad">
          <h1 className="page-title">Max Offer Calculator</h1>
          <p className="page-sub">Run the numbers before you make the offer.</p>

          <div style={{ marginTop: 36 }}>
            {/* 1 — Your Info */}
            <section className="section">
              <div className="section-head">
                <span className="section-num">1</span>
                <span className="section-title">Your Info</span>
              </div>
              <div className="panel">
                <div className="grid cols-2">
                  <div className={fieldClass("firstName")} data-field="firstName">
                    <label className="lbl">
                      First Name <span className="req">*</span>
                    </label>
                    <input
                      className="inp"
                      type="text"
                      placeholder="First name"
                      value={v.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                    />
                    <p className="err-msg">Please enter your first name.</p>
                  </div>
                  <div className={fieldClass("email")} data-field="email">
                    <label className="lbl">
                      Email <span className="req">*</span>
                    </label>
                    <input className="inp locked" type="email" value={v.email} readOnly />
                    <p className="field-hint">Signed in — we use your account email.</p>
                    <p className="err-msg">Please enter a valid email.</p>
                  </div>
                  <div className={fieldClass("address", "span-2")} data-field="address">
                    <label className="lbl">
                      Property Address or City <span className="req">*</span>
                    </label>
                    <input
                      className="inp"
                      type="text"
                      placeholder="123 Main St, or Dallas, TX"
                      value={v.address}
                      onChange={(e) => set("address", e.target.value)}
                    />
                    <p className="err-msg">Please enter an address or city.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 2 — Deal Numbers */}
            <section className="section">
              <div className="section-head">
                <span className="section-num">2</span>
                <span className="section-title">Deal Numbers</span>
              </div>
              <div className="panel">
                <div className="grid cols-2">
                  <div className={fieldClass("arv")} data-field="arv">
                    <label className="lbl">
                      After Repair Value / ARV <span className="req">*</span>
                    </label>
                    <input
                      className="inp"
                      inputMode="numeric"
                      placeholder="$295,000"
                      value={v.arv}
                      onChange={(e) => set("arv", e.target.value)}
                    />
                    <p className="err-msg">Enter an ARV greater than $0.</p>
                  </div>
                  <div className={fieldClass("price")} data-field="price">
                    <label className="lbl">
                      Purchase Price / Asking Price <span className="req">*</span>
                    </label>
                    <input
                      className="inp"
                      inputMode="numeric"
                      placeholder="$150,000"
                      value={v.price}
                      onChange={(e) => set("price", e.target.value)}
                    />
                    <p className="err-msg">Enter a purchase price.</p>
                  </div>
                  <div className={fieldClass("reno")} data-field="reno">
                    <label className="lbl">
                      Renovation Budget <span className="req">*</span>
                    </label>
                    <input
                      className="inp"
                      inputMode="numeric"
                      placeholder="$48,000"
                      value={v.reno}
                      onChange={(e) => set("reno", e.target.value)}
                    />
                    <p className="err-msg">Enter a renovation budget.</p>
                  </div>
                  <div className={fieldClass("profit")} data-field="profit">
                    <label className="lbl">
                      Desired Profit <span className="req">*</span>
                    </label>
                    <input
                      className={`inp ${ruleOfThumb ? "locked" : ""}`}
                      inputMode="numeric"
                      placeholder="$48,000"
                      value={profitDisplay}
                      readOnly={ruleOfThumb}
                      onChange={(e) => set("profit", e.target.value)}
                    />
                    <p className="err-msg">Enter a desired profit.</p>
                  </div>
                </div>
                <div
                  className={`toggle ${ruleOfThumb ? "on" : ""}`}
                  role="switch"
                  aria-checked={ruleOfThumb}
                  tabIndex={0}
                  onClick={toggleRule}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      toggleRule();
                    }
                  }}
                >
                  <span className="toggle-track">
                    <span className="toggle-knob" />
                  </span>
                  <div>
                    <div className="toggle-title">Use Henry&apos;s Rule of Thumb</div>
                    <div className="toggle-help">
                      &ldquo;My rule of thumb is to target profit equal to the renovation
                      budget.&rdquo; When checked, Desired Profit auto-fills to match your
                      Renovation Budget.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 3 — Deal Assumptions */}
            <section className="section">
              <div className="section-head tight">
                <span className="section-num">3</span>
                <span className="section-title">Deal Assumptions</span>
              </div>
              <p className="section-help">
                Pre-filled with Henry&apos;s defaults — adjust if your deal is different.
              </p>
              <div className="panel">
                <div className="grid cols-4" style={{ marginBottom: 18 }}>
                  {(
                    [
                      ["holdMonths", "Hold Time (Months)"],
                      ["commissionPct", "R.E. Commission %"],
                      ["saleClosingPct", "Sale Closing %"],
                      ["purchaseClosingPct", "Purchase Closing %"],
                    ] as const
                  ).map(([name, label]) => (
                    <div key={name} className={fieldClass(name)} data-field={name}>
                      <label className="lbl sm">{label}</label>
                      <input
                        className="inp"
                        inputMode="numeric"
                        value={v[name]}
                        onChange={(e) => set(name, e.target.value)}
                      />
                      <p className="err-msg">Required.</p>
                    </div>
                  ))}
                </div>
                <div className="grid cols-4">
                  <div className={fieldClass("loanPointsPct")} data-field="loanPointsPct">
                    <label className="lbl sm">Loan Points</label>
                    <input
                      className="inp"
                      inputMode="numeric"
                      placeholder="e.g. 2"
                      value={v.loanPointsPct}
                      onChange={(e) => set("loanPointsPct", e.target.value)}
                    />
                    <p className="field-hint">Optional — leave blank if unknown.</p>
                  </div>
                  <div className={fieldClass("originationFee")} data-field="originationFee">
                    <label className="lbl sm">Origination Fee</label>
                    <input
                      className="inp"
                      inputMode="numeric"
                      placeholder="e.g. $500"
                      value={v.originationFee}
                      onChange={(e) => set("originationFee", e.target.value)}
                    />
                    <p className="field-hint">Optional — leave blank if unknown.</p>
                  </div>
                  <div className={fieldClass("holdingRatePct", "span-2")} data-field="holdingRatePct">
                    <label className="lbl sm">Holding Cost Interest Rate %</label>
                    <input
                      className="inp"
                      inputMode="numeric"
                      value={v.holdingRatePct}
                      onChange={(e) => set("holdingRatePct", e.target.value)}
                    />
                    <p className="err-msg">Required.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 4 — Investor Profile */}
            <section className="section" style={{ marginBottom: 38 }}>
              <div className="section-head tight">
                <span className="section-num">4</span>
                <span className="section-title">Investor Profile</span>
              </div>
              <p className="section-help">
                Used to tailor your follow-up — not part of the offer math.
              </p>
              <div className="panel">
                <div className="grid cols-3">
                  <div className={fieldClass("fundingType")} data-field="fundingType">
                    <label className="lbl">
                      Funding Type <span className="req">*</span>
                    </label>
                    <select
                      className="inp"
                      value={v.fundingType}
                      onChange={(e) => set("fundingType", e.target.value)}
                    >
                      <option value="" disabled>
                        Select one...
                      </option>
                      <option>Cash</option>
                      <option>Conventional Loan</option>
                      <option>Hard Money</option>
                      <option>Private Money</option>
                      <option>Other — Seller Financing</option>
                    </select>
                    <p className="err-msg">Please select a funding type.</p>
                  </div>
                  <div className={fieldClass("cashAvailable")} data-field="cashAvailable">
                    <label className="lbl">
                      Cash Available <span className="req">*</span>
                    </label>
                    <input
                      className="inp"
                      inputMode="numeric"
                      placeholder="$75,000"
                      value={v.cashAvailable}
                      onChange={(e) => set("cashAvailable", e.target.value)}
                    />
                    <p className="err-msg">Enter your available cash.</p>
                  </div>
                  <div className={fieldClass("experience")} data-field="experience">
                    <label className="lbl">
                      Experience Level <span className="req">*</span>
                    </label>
                    <select
                      className="inp"
                      value={v.experience}
                      onChange={(e) => set("experience", e.target.value)}
                    >
                      <option value="" disabled>
                        Select one...
                      </option>
                      <option>First-Time Investor</option>
                      <option>1–3 Deals Completed</option>
                      <option>4–10 Deals Completed</option>
                      <option>10+ Deals Completed</option>
                    </select>
                    <p className="err-msg">Please select your experience level.</p>
                  </div>
                </div>
              </div>
            </section>

            {formError && (
              <p style={{ color: "#FF7A93", textAlign: "center", marginBottom: 16 }}>{formError}</p>
            )}

            <div className="submit-wrap">
              <button className="btn-primary" type="button" onClick={handleCalculate} disabled={submitting}>
                {submitting ? "Calculating…" : "Calculate My Max Offer"} <span style={{ fontSize: 20 }}>→</span>
              </button>
              <span className="fineprint">For educational purposes only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
