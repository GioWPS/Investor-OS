"use client";

import { useState } from "react";
import Link from "next/link";
import type { SeriesPoint } from "@/lib/market/fred";
import { LineChart } from "./line-chart";
import { BrandMark } from "@/components/brand-mark";

export interface MetroBundle {
  cbsa: string;
  name: string;
  /** true when this metro was detected in the user's analyzed deals */
  fromDeals: boolean;
  price: SeriesPoint[];
  dom: SeriesPoint[];
  listings: SeriesPoint[];
}

export interface MarketWatchProps {
  national: {
    mortgage: SeriesPoint[];
    price: SeriesPoint[];
    dom: SeriesPoint[];
    listings: SeriesPoint[];
  };
  /** metros detected from the user's deals, pre-fetched server-side */
  dealMetros: MetroBundle[];
  /** the full curated list for the dropdown's "all markets" group */
  allMetros: { cbsa: string; name: string }[];
}

const fmtUsd = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
const fmtUsdShort = (v: number) => (v >= 1000 ? "$" + Math.round(v / 1000) + "K" : "$" + Math.round(v));
const fmtPct = (v: number) => v.toFixed(2) + "%";
const fmtDays = (v: number) => Math.round(v) + " days";
const fmtCount = (v: number) => Math.round(v).toLocaleString("en-US");

export function MarketWatchView({ national, dealMetros, allMetros }: MarketWatchProps) {
  const [mode, setMode] = useState<"national" | "local">(dealMetros.length > 0 ? "local" : "national");
  const [cbsa, setCbsa] = useState<string>(dealMetros[0]?.cbsa ?? "");
  // metros fetched on demand after the initial render (from the "all markets" group)
  const [extra, setExtra] = useState<Record<string, MetroBundle | "loading" | "error">>({});

  const activeMetro: MetroBundle | "loading" | "error" | undefined =
    dealMetros.find((m) => m.cbsa === cbsa) ?? extra[cbsa];

  async function pickMetro(next: string) {
    setCbsa(next);
    setMode("local");
    if (dealMetros.some((m) => m.cbsa === next) || extra[next]) return;
    setExtra((e) => ({ ...e, [next]: "loading" }));
    try {
      const res = await fetch(`/dashboard/market-watch/data?cbsa=${next}`);
      if (!res.ok) throw new Error(String(res.status));
      const bundle = (await res.json()) as MetroBundle;
      setExtra((e) => ({ ...e, [next]: bundle }));
    } catch {
      setExtra((e) => ({ ...e, [next]: "error" }));
    }
  }

  const local = mode === "local" && typeof activeMetro === "object" ? activeMetro : null;
  const scopeLabel = local ? local.name : "United States · national";

  const panels: {
    label: string;
    meta: string;
    color: string;
    points: SeriesPoint[];
    format: (v: number) => string;
    tooltipFormat?: (v: number) => string;
    note: string;
  }[] = [
    {
      label: "30-Yr Mortgage Rate",
      meta: "national · weekly",
      color: "var(--os-lime)",
      points: national.mortgage,
      format: fmtPct,
      note: "Feeds your holding-rate input in the calculator.",
    },
    {
      label: "Median Listing Price",
      meta: local ? "this metro · monthly" : "national · monthly",
      color: "var(--os-teal)",
      points: local ? local.price : national.price,
      format: fmtUsdShort,
      tooltipFormat: fmtUsd,
      note: "Context for your ARV estimates.",
    },
    {
      label: "Median Days on Market",
      meta: local ? "this metro · monthly" : "national · monthly",
      color: "var(--os-orange)",
      points: local ? local.dom : national.dom,
      format: fmtDays,
      note: "Sanity-check your hold-time assumption.",
    },
    {
      label: "Active Listings",
      meta: local ? "this metro · monthly" : "national · monthly",
      color: "var(--os-purple)",
      points: local ? local.listings : national.listings,
      format: fmtCount,
      note: "More inventory = more negotiating room.",
    },
  ];

  return (
    <div className="os-scope">
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "34px 22px 60px" }}>
        <div className="os-topbar" style={{ marginBottom: 26 }}>
          <div className="os-brand">
            <BrandMark />
            <div>
              <div className="os-brand-eyebrow">Closing Table OS</div>
              <div className="os-brand-name">Market Watch</div>
            </div>
          </div>
          <Link className="os-btn os-btn-ghost" href="/dashboard" style={{ padding: "10px 16px" }}>
            ← Dashboard
          </Link>
        </div>

        <div className="os-eyebrow">— Live Market Data</div>
        <h1 className="os-title" style={{ fontSize: 34 }}>
          {local ? local.name : "The National Picture"}
        </h1>
        <p className="os-sub" style={{ marginBottom: 20 }}>
          Last 24 months · {scopeLabel} · sourced from the Federal Reserve (FRED) &amp; Realtor.com
        </p>

        {/* scope controls */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 22 }}>
          <div style={{ display: "flex", border: "1px solid var(--os-line-strong)", borderRadius: 999, overflow: "hidden" }}>
            <button
              type="button"
              className="os-btn"
              onClick={() => setMode("national")}
              style={{
                border: "none",
                borderRadius: 0,
                padding: "9px 18px",
                background: mode === "national" ? "var(--os-lime)" : "transparent",
                color: mode === "national" ? "#06040a" : "var(--os-fg-2)",
                fontWeight: 700,
              }}
            >
              National
            </button>
            <button
              type="button"
              className="os-btn"
              onClick={() => (cbsa ? pickMetro(cbsa) : setMode("local"))}
              style={{
                border: "none",
                borderRadius: 0,
                padding: "9px 18px",
                background: mode === "local" ? "var(--os-lime)" : "transparent",
                color: mode === "local" ? "#06040a" : "var(--os-fg-2)",
                fontWeight: 700,
              }}
            >
              My Markets
            </button>
          </div>

          {mode === "local" && (
            <select
              className="os-input"
              value={cbsa}
              onChange={(e) => pickMetro(e.target.value)}
              style={{ width: "auto", minWidth: 260, padding: "9px 12px", borderRadius: 999 }}
              aria-label="Choose a market"
            >
              {cbsa === "" && <option value="">Choose a market…</option>}
              {dealMetros.length > 0 && (
                <optgroup label="From your analyzed deals">
                  {dealMetros.map((m) => (
                    <option key={m.cbsa} value={m.cbsa}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="All tracked markets">
                {allMetros
                  .filter((m) => !dealMetros.some((d) => d.cbsa === m.cbsa))
                  .map((m) => (
                    <option key={m.cbsa} value={m.cbsa}>
                      {m.name}
                    </option>
                  ))}
              </optgroup>
            </select>
          )}

          {mode === "local" && dealMetros.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--os-fg-3)" }}>
              Include a city in your deal&apos;s address (e.g. &quot;Boston, MA&quot;) and its market appears here automatically.
            </span>
          )}
        </div>

        {mode === "local" && activeMetro === "loading" && (
          <div className="os-panel" style={{ padding: 28, color: "var(--os-fg-2)" }}>Loading market data…</div>
        )}
        {mode === "local" && activeMetro === "error" && (
          <div className="os-panel" style={{ padding: 28, color: "var(--os-fg-2)" }}>
            Couldn&apos;t load that market right now — try again in a minute.
          </div>
        )}

        {(mode === "national" || local) && (
          <div className="os-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
            {panels.map((p) => {
              const latest = p.points[p.points.length - 1];
              return (
                <div className="os-panel" key={p.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div className="os-kicker">{p.label}</div>
                      <div className="os-stat-value" style={{ fontSize: 30 }}>
                        {latest ? (p.tooltipFormat ?? p.format)(latest.v) : "—"}
                      </div>
                    </div>
                    <span className="os-stat-meta" style={{ color: "var(--os-fg-3)" }}>{p.meta}</span>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <LineChart points={p.points} color={p.color} format={p.tooltipFormat ?? p.format} />
                  </div>
                  <p style={{ fontSize: 12.5, color: "var(--os-fg-3)", margin: "10px 0 0" }}>{p.note}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
