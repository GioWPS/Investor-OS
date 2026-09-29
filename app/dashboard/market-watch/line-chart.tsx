"use client";

import { useRef, useState } from "react";
import type { SeriesPoint } from "@/lib/market/fred";

/**
 * Themed single-series line chart (SVG) with a hover crosshair + tooltip.
 * Deliberately dependency-free: ~100 lines beats shipping a charting library for
 * four lines. Colors/typography come from the brand-os tokens.
 */
export function LineChart({
  points,
  color,
  format,
  height = 190,
}: {
  points: SeriesPoint[];
  color: string;
  /** value → display string (also used in the tooltip) */
  format: (v: number) => string;
  height?: number;
}) {
  const W = 600;
  const H = height;
  const PAD = { top: 14, right: 14, bottom: 26, left: 52 };
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <div style={{ height, display: "grid", placeItems: "center", color: "var(--os-fg-3)", fontSize: 13 }}>
        No data available
      </div>
    );
  }

  const vals = points.map((p) => p.v);
  const vMin = Math.min(...vals);
  const vMax = Math.max(...vals);
  const span = vMax - vMin || Math.abs(vMax) || 1;
  const yLo = vMin - span * 0.08;
  const yHi = vMax + span * 0.08;

  const x = (i: number) => PAD.left + (i / (points.length - 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - yLo) / (yHi - yLo)) * (H - PAD.top - PAD.bottom);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${path} L${x(points.length - 1).toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${PAD.left},${(H - PAD.bottom).toFixed(1)} Z`;

  // 3 horizontal gridlines at round-ish values inside the domain.
  const grid = [0.25, 0.5, 0.75].map((t) => yLo + t * (yHi - yLo));

  const monthShort = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" });

  const last = points[points.length - 1];
  const gradId = `g${color.replace(/[^a-z0-9]/gi, "")}`;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const t = (px - PAD.left) / (W - PAD.left - PAD.right);
    const i = Math.round(t * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  }

  const h = hover === null ? null : points[hover];

  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block", cursor: "crosshair" }}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`Trend from ${monthShort(points[0].d)} to ${monthShort(last.d)}, latest ${format(last.v)}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {grid.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--os-fg-3)" fontFamily="var(--os-mono)">
              {format(v)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* emphasized latest point */}
        <circle cx={x(points.length - 1)} cy={y(last.v)} r="4" fill={color} stroke="var(--os-panel)" strokeWidth="2" />

        {/* x labels: first / middle / last */}
        {[0, Math.floor((points.length - 1) / 2), points.length - 1].map((i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            fontSize="10"
            fill="var(--os-fg-3)"
            fontFamily="var(--os-mono)"
          >
            {monthShort(points[i].d)}
          </text>
        ))}

        {h && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={H - PAD.bottom} stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.v)} r="4.5" fill={color} stroke="var(--os-panel)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {h && hover !== null && (
        <div
          style={{
            position: "absolute",
            left: `${(x(hover) / W) * 100}%`,
            top: 0,
            transform: `translateX(${hover > points.length / 2 ? "-105%" : "8px"})`,
            background: "var(--os-panel-2)",
            border: "1px solid var(--os-line-strong)",
            borderRadius: 8,
            padding: "6px 10px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ fontFamily: "var(--os-mono)", fontSize: 10, color: "var(--os-fg-3)" }}>
            {new Date(h.d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--os-fg)" }}>{format(h.v)}</div>
        </div>
      )}
    </div>
  );
}
