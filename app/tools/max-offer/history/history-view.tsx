"use client";

import { useState, type CSSProperties } from "react";
import { MaxOfferResults, type AdjustState } from "../max-offer-results";
import { BackToDashboard } from "../back-to-dashboard";

/** One saved Max Offer run, pre-converted server-side into display units. */
export interface SavedDeal {
  id: string;
  createdAt: string;
  firstName: string;
  address: string;
  maxOffer: number;
  gap: number;
  category: "positive" | "caution" | "negative";
  categoryLabel: string;
  score: number;
  state: AdjustState;
}

const VERDICT: Record<SavedDeal["category"], { label: string; color: string }> = {
  positive: { label: "Strong Offer Zone", color: "var(--green)" },
  caution: { label: "Worth a Closer Look", color: "var(--orange-hot)" },
  negative: { label: "Needs Negotiation", color: "var(--red)" },
};

const fmt = (n: number) =>
  (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");

const dateLong = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function HistoryView({ deals }: { deals: SavedDeal[] }) {
  const [selected, setSelected] = useState<SavedDeal | null>(null);

  if (selected) {
    return (
      <MaxOfferResults
        key={selected.id}
        initial={selected.state}
        firstName={selected.firstName}
        address={selected.address}
        dateLabel={dateLong(selected.createdAt)}
        resetLabel="Back to Deal History"
        onReset={() => setSelected(null)}
      />
    );
  }

  const rowStyle: CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    textAlign: "left",
    background: "var(--glass-inner)",
    border: "1px solid var(--glass-border)",
    borderRadius: 14,
    padding: "16px 20px",
    cursor: "pointer",
    color: "var(--fg)",
    font: "inherit",
  };

  return (
    <div className="app-bg">
      <div className="sheet wide">
        <header className="app-header">
          <div className="brand-lock">
            <img
              src="https://assets.cdn.filesafe.space/4uMmDI2kosLMlzdAlUS8/media/6a1dd49ff563bf237f85f9b5.png"
              alt="Henry Washington"
            />
            <span className="brand-rule" />
            <div>
              <div className="brand-eyebrow">The Closing Table</div>
              <div className="brand-name">Deal History</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BackToDashboard />
            <a className="btn-back no-print" href="/tools/max-offer">
              + Analyze a New Deal
            </a>
          </div>
        </header>

        <div className="body-pad">
          <div className="report-head" style={{ marginBottom: 22 }}>
            <div className="report-eyebrow">Your Resource Library</div>
            <h2 className="report-title">Deals You&apos;ve Analyzed</h2>
            <p className="report-sub">
              {deals.length === 0
                ? "Run your first deal and its full report will be saved here."
                : `${deals.length} saved ${deals.length === 1 ? "report" : "reports"} — click any deal to reopen its full breakdown.`}
            </p>
          </div>

          {deals.length === 0 ? (
            <a className="btn-violet" href="/tools/max-offer" style={{ display: "inline-block", textDecoration: "none" }}>
              Open the Max Offer Calculator →
            </a>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {deals.map((d) => {
                const v = VERDICT[d.category];
                return (
                  <button key={d.id} type="button" style={rowStyle} onClick={() => setSelected(d)}>
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {d.address}
                      </div>
                      <div className="report-meta" style={{ marginTop: 4 }}>
                        {dateLong(d.createdAt)}
                      </div>
                    </div>
                    <div style={{ flex: "0 0 auto" }}>
                      <div className="report-meta">Max Offer</div>
                      <div style={{ fontFamily: "var(--display)", fontSize: 22, letterSpacing: ".02em" }}>
                        {fmt(d.maxOffer)}
                      </div>
                    </div>
                    <div style={{ flex: "0 0 auto" }}>
                      <div className="report-meta">vs. Asking</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: d.gap >= 0 ? "var(--green)" : "var(--red)" }}>
                        {d.gap >= 0 ? "+" : ""}
                        {fmt(d.gap)}
                      </div>
                    </div>
                    <div
                      style={{
                        flex: "0 0 auto",
                        fontFamily: "var(--mono)",
                        fontSize: 10.5,
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                        color: v.color,
                        border: `1px solid ${v.color}`,
                        borderRadius: 999,
                        padding: "5px 12px",
                      }}
                    >
                      {d.categoryLabel || v.label}
                    </div>
                    <div style={{ flex: "0 0 auto", color: "var(--lilac)", fontWeight: 700, fontSize: 13 }}>
                      View report →
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
