"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { analyzeDeal, type MaxOfferInputs } from "@/lib/tools/max-offer";
import { BackToDashboard } from "./back-to-dashboard";

/** Adjust-panel state in DISPLAY units (percents as whole numbers, $ as numbers). */
export interface AdjustState {
  arv: number;
  price: number;
  reno: number;
  profit: number;
  ruleOfThumb: boolean;
  holdMonths: number;
  commissionPct: number;
  saleClosingPct: number;
  purchaseClosingPct: number;
  loanPointsPct: number;
  holdingRatePct: number;
  originationFee: number;
}

const fmt = (n: number) => {
  const v = isFinite(n) ? n : 0;
  return (v < 0 ? "-" : "") + "$" + Math.abs(Math.round(v)).toLocaleString("en-US");
};
const numOf = (s: string) => {
  const n = parseFloat(String(s ?? "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
};

function toInputs(a: AdjustState): MaxOfferInputs {
  return {
    arv: a.arv,
    renovationBudget: a.reno,
    desiredProfit: a.ruleOfThumb ? a.reno : a.profit,
    holdMonths: a.holdMonths,
    commissionPct: a.commissionPct / 100,
    saleClosingPct: a.saleClosingPct / 100,
    purchaseClosingPct: a.purchaseClosingPct / 100,
    holdingInterestRate: a.holdingRatePct / 100,
    loanPoints: a.loanPointsPct,
    originationFee: a.originationFee,
  };
}

const RING: Record<string, { color: string; glow: string }> = {
  positive: { color: "#C1E82E", glow: "rgba(193,232,46,.42)" },
  caution: { color: "#FFB37A", glow: "rgba(242,106,28,.40)" },
  negative: { color: "#FF7A93", glow: "rgba(242,96,122,.40)" },
};

export function MaxOfferResults({
  initial,
  firstName,
  address,
  onReset,
  dateLabel,
  resetLabel = "Run Another Deal",
}: {
  initial: AdjustState;
  firstName: string;
  address: string;
  onReset: () => void;
  /** Shown in "Prepared for … · <date>". Defaults to today; pass the saved run date when re-opening a report. */
  dateLabel?: string;
  /** Label for the reset buttons — e.g. "Back to Deal History" when opened from the archive. */
  resetLabel?: string;
}) {
  const [a, setA] = useState<AdjustState>(initial);
  const [revealed, setRevealed] = useState(false);

  const r = useMemo(() => analyzeDeal(toInputs(a), a.price), [a]);

  const dateText =
    dateLabel ??
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  const ring = RING[r.category];

  function set<K extends keyof AdjustState>(key: K, value: AdjustState[K]) {
    setA((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "reno" && prev.ruleOfThumb) next.profit = value as number;
      return next;
    });
  }
  function toggleRule() {
    setA((prev) => ({
      ...prev,
      ruleOfThumb: !prev.ruleOfThumb,
      profit: !prev.ruleOfThumb ? prev.reno : prev.profit,
    }));
  }

  const breakdownRows: [string, string][] = [
    ["After Repair Value (ARV)", fmt(a.arv)],
    ["Renovation Budget", fmt(a.reno)],
    ["Desired Profit (used in MAO calc)", fmt(a.ruleOfThumb ? a.reno : a.profit)],
    ["Real Estate Commission", fmt(r.breakdown.commissions)],
    ["Sale Closing Costs", fmt(r.breakdown.saleClosingCosts)],
    ["Purchase Closing Costs (at MAO)", fmt(r.breakdown.purchaseClosingCosts)],
    ["Total Closing Costs (at MAO)", fmt(r.breakdown.totalClosingCosts)],
    ["Loan Points Cost (at MAO)", fmt(r.breakdown.loanPointsCost)],
    ["Origination Fee", fmt(a.originationFee)],
    ["Total Financing Fees (at MAO)", fmt(r.breakdown.totalFinancingFees)],
    ["Monthly Holding Cost (at MAO)", fmt(r.breakdown.monthlyHoldingCost)],
    ["Total Holding Cost (at MAO)", fmt(r.breakdown.totalHoldingCost)],
    ["Estimated Hold Time", a.holdMonths === 1 ? "1 month" : `${Math.round(a.holdMonths)} months`],
  ];

  const ringStyle: CSSProperties = {
    background: `conic-gradient(from 0deg, ${ring.color} 0%, ${ring.color} ${r.score}%, rgba(255,255,255,0.10) ${r.score}% 100%)`,
    boxShadow: `0 0 40px ${ring.glow}`,
  };

  const sliders: { key: keyof AdjustState; label: string; suffix: string; min: number; max: number; step: number }[] = [
    { key: "holdMonths", label: "Hold Time (Months)", suffix: "", min: 1, max: 24, step: 1 },
    { key: "commissionPct", label: "R.E. Commission %", suffix: "%", min: 0, max: 10, step: 0.5 },
    { key: "saleClosingPct", label: "Sale Closing %", suffix: "%", min: 0, max: 10, step: 0.5 },
    { key: "purchaseClosingPct", label: "Purchase Closing %", suffix: "%", min: 0, max: 10, step: 0.5 },
    { key: "loanPointsPct", label: "Loan Points", suffix: "", min: 0, max: 5, step: 0.25 },
    { key: "holdingRatePct", label: "Holding Rate %", suffix: "%", min: 0, max: 25, step: 0.5 },
  ];

  return (
    <div className="app-bg">
      <div className="sheet wide results" data-state={r.category}>
        <header className="app-header">
          <div className="brand-lock">
            <img
              src="https://assets.cdn.filesafe.space/4uMmDI2kosLMlzdAlUS8/media/6a1dd49ff563bf237f85f9b5.png"
              alt="Henry Washington"
            />
            <span className="brand-rule" />
            <div>
              <div className="brand-eyebrow">The Closing Table</div>
              <div className="brand-name">Max Offer Calculator</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BackToDashboard />
            <button className="btn-back no-print" type="button" onClick={onReset}>
              ← {resetLabel}
            </button>
          </div>
        </header>

        <div className="body-pad">
          <div className="layout-2col">
            {/* LEFT */}
            <div className="results-col">
              <div className="report-head">
                <div className="report-eyebrow">Your Report</div>
                <h2 className="report-title">Your Offer Breakdown</h2>
                <p className="report-sub">Here&apos;s how your numbers stack up.</p>
                <div className="report-meta">
                  Prepared for {firstName || "you"} · {address} · {dateText}
                </div>
              </div>

              <div className="sticky-zone">
                <div className="hero-mao">
                  <div className="orb" />
                  <div style={{ position: "relative" }}>
                    <div className="mao-label">Max Allowable Offer</div>
                    <div className="mao-value">{fmt(r.maxOffer)}</div>
                    <p className="mao-caption">
                      Based on your ARV, renovation budget, desired profit, and cost assumptions.
                    </p>
                  </div>
                </div>

                <div className="cmp-grid">
                  <div className="card">
                    <div className="card-label">Your Purchase Price / Asking Price</div>
                    <div className="card-value">{fmt(a.price)}</div>
                  </div>
                  <div className="card gap-card">
                    <div className="card-label">Offer Gap</div>
                    <div className="card-value cat">{fmt(Math.abs(r.gap))}</div>
                    <div className="gap-dir">{r.gap >= 0 ? "under Max Offer" : "over Max Offer"}</div>
                  </div>
                </div>

                <div>
                  <div className="badge">{r.categoryLabel}</div>
                </div>
              </div>

              <div className="msg-box">{r.categoryMessage}</div>
            </div>

            {/* RIGHT: adjust panel */}
            <div className="adjust-panel no-print">
              <div className="subhead" style={{ margin: "0 0 4px" }}>
                <span className="t">Adjust Your Numbers</span>
                <span className="line" />
              </div>
              <p className="adjust-sub">
                Change anything below and watch your Max Offer, score, and breakdown update instantly.
              </p>

              <div className="adjust-subsection">Deal Numbers</div>
              <div className="grid cols-2" style={{ marginBottom: 20 }}>
                <div>
                  <label className="lbl">After Repair Value / ARV</label>
                  <input
                    className="inp"
                    inputMode="numeric"
                    value={a.arv || ""}
                    onChange={(e) => set("arv", numOf(e.target.value))}
                  />
                </div>
                <div>
                  <label className="lbl">Purchase Price / Asking Price</label>
                  <input
                    className="inp"
                    inputMode="numeric"
                    value={a.price || ""}
                    onChange={(e) => set("price", numOf(e.target.value))}
                  />
                </div>
                <div>
                  <label className="lbl">Renovation Budget</label>
                  <input
                    className="inp"
                    inputMode="numeric"
                    value={a.reno || ""}
                    onChange={(e) => set("reno", numOf(e.target.value))}
                  />
                </div>
                <div>
                  <label className="lbl">Desired Profit</label>
                  <input
                    className={`inp ${a.ruleOfThumb ? "locked" : ""}`}
                    inputMode="numeric"
                    readOnly={a.ruleOfThumb}
                    value={(a.ruleOfThumb ? a.reno : a.profit) || ""}
                    onChange={(e) => set("profit", numOf(e.target.value))}
                  />
                </div>
              </div>
              <div
                className={`toggle ${a.ruleOfThumb ? "on" : ""}`}
                role="switch"
                aria-checked={a.ruleOfThumb}
                tabIndex={0}
                style={{ marginTop: 0 }}
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
                    Desired Profit auto-fills to match your Renovation Budget.
                  </div>
                </div>
              </div>

              <div className="adjust-subsection">Cost Assumptions</div>
              <div className="grid cols-2">
                {sliders.map((s) => (
                  <div className="slider-row" key={s.key}>
                    <div className="slider-label-row">
                      <label className="lbl sm">{s.label}</label>
                      <span className="slider-value">
                        {a[s.key] as number}
                        {s.suffix}
                      </span>
                    </div>
                    <input
                      type="range"
                      className="slider"
                      min={s.min}
                      max={s.max}
                      step={s.step}
                      value={a[s.key] as number}
                      onChange={(e) => set(s.key, parseFloat(e.target.value) as AdjustState[typeof s.key])}
                    />
                  </div>
                ))}
                <div>
                  <label className="lbl sm">Origination Fee</label>
                  <input
                    className="inp"
                    inputMode="numeric"
                    placeholder="$0"
                    value={a.originationFee || ""}
                    onChange={(e) => set("originationFee", numOf(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* reveal */}
          {!revealed && (
            <div className="reveal-wrap no-print">
              <button className="btn-ghost" type="button" style={{ width: "100%" }} onClick={() => setRevealed(true)}>
                View My Offer Breakdown <span style={{ fontSize: 16 }}>↓</span>
              </button>
            </div>
          )}

          {/* revealed breakdown */}
          {revealed && (
            <div>
              <div className="divider" />

              <div className="subhead big">
                <span className="t">Offer Strength Score</span>
                <span className="line" />
              </div>
              <div className="score-panel">
                <div className="score-ring" style={ringStyle}>
                  <div className="score-inner" />
                  <div className="score-num">
                    <b>{r.score}</b>
                    <em>OUT OF 100</em>
                  </div>
                </div>
                <div>
                  <div className="badge">{r.categoryLabel}</div>
                  <p className="score-desc">
                    Reflects how strong your entered offer appears based on the assumptions you
                    entered — offer gap, profit margin, renovation load, and hold time.{" "}
                    <em style={{ opacity: 0.7 }}>(Preview scoring — pending final sign-off.)</em>
                  </p>
                </div>
              </div>

              <div className="profit-card">
                <div>
                  <div className="card-label">Estimated Profit at Your Purchase Price</div>
                  <div className="profit-sub">If you buy at {fmt(a.price)} instead of your max offer</div>
                </div>
                <div
                  className="profit-value"
                  style={{ color: r.profitAtPrice >= 0 ? "#C1E82E" : "#FF7A93" }}
                >
                  {fmt(r.profitAtPrice)}
                </div>
              </div>

              <div className="subhead">
                <span className="t">Cost Breakdown</span>
                <span className="line" />
              </div>
              <div className="breakdown">
                {breakdownRows.map(([label, value]) => (
                  <div className="bd-row" key={label}>
                    <span className="bd-label">{label}</span>
                    <span className="bd-value">{value}</span>
                  </div>
                ))}
              </div>

              <div className="subhead">
                <span className="t">Watchouts</span>
                <span className="line" />
              </div>
              <div className="watchouts">
                {r.watchouts.map((text, idx) => (
                  <div className="wo" key={idx}>
                    <span className="wo-mark">!</span>
                    <span className="wo-text">{text}</span>
                  </div>
                ))}
              </div>

              <div className="next-step">
                <div className="ns-label">Suggested Next Step</div>
                <p className="ns-text">{r.nextStep}</p>
              </div>

              <div className="cta no-print">
                <div className="cta-grid">
                  <div>
                    <h3>Want a second opinion on this offer?</h3>
                    <p>
                      Bring your numbers to the room. Get them pressure-tested by Henry and investors
                      who are closing deals right now.
                    </p>
                  </div>
                  <div className="cta-btns">
                    <a
                      className="btn-primary sm"
                      href="https://seeyouattheclosingtable.com/webinar-signup-page"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Register for the Live Monthly Webinar
                    </a>
                    <a
                      className="btn-ghost sm"
                      href="https://www.seeyouattheclosingtable.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Book a Call
                    </a>
                  </div>
                </div>
              </div>

              <div className="action-row no-print">
                <button className="btn-ghost sm" type="button" onClick={() => window.print()}>
                  🖨 Print / Save as PDF
                </button>
                <button className="btn-violet" type="button" onClick={onReset}>
                  {resetLabel}
                </button>
              </div>

              <p className="disclaimer">
                This tool is for educational purposes only and is based on the numbers entered. It
                does not replace professional advice, full due diligence, or final investment
                analysis. Saved to your dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
