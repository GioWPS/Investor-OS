/**
 * Single source of truth for the toolkit's tools. The dashboard, the cross-promo blocks,
 * and each tool page all read from here — so the "sequence" (Max Offer → Funding Path →
 * Blueprint), the accent colors, and the names never drift apart, and adding a 4th/5th
 * tool later is one entry in this array.
 *
 * This file is pure data — no React, no Supabase — so it stays portable into Closing Table OS.
 */

// Matches the `tool` check constraint in supabase/schema.sql and ToolKey in lib/ghl.ts.
export type ToolKey = "max_offer" | "funding_path" | "first_deal_blueprint";

export interface ToolMeta {
  key: ToolKey;
  slug: string; // URL segment: /tools/<slug>
  name: string;
  tagline: string;
  order: number; // sequence position (1-based)
  status: "live" | "coming_soon";
  /** Accent color as space-separated RGB channels, layered on the shared brand base. */
  accent: { base: string; soft: string; ink: string };
}

export const TOOLS: ToolMeta[] = [
  {
    key: "max_offer",
    slug: "max-offer",
    name: "Max Offer Calculator",
    tagline: "Find your Maximum Allowable Offer with Henry's MAO framework.",
    order: 1,
    status: "live",
    accent: { base: "16 185 129", soft: "209 250 229", ink: "6 78 59" }, // emerald
  },
  {
    key: "funding_path",
    slug: "funding-path",
    name: "Funding Path Finder",
    tagline: "Match your deal and profile to the right funding strategy.",
    order: 2,
    status: "coming_soon",
    accent: { base: "37 99 235", soft: "219 234 254", ink: "30 58 138" }, // blue
  },
  {
    key: "first_deal_blueprint",
    slug: "first-deal-blueprint",
    name: "First Deal Blueprint",
    tagline: "A personalized plan to get from where you are to your first close.",
    order: 3,
    status: "coming_soon",
    accent: { base: "217 119 6", soft: "254 243 199", ink: "120 53 15" }, // amber
  },
];

export function getToolByKey(key: ToolKey): ToolMeta {
  const tool = TOOLS.find((t) => t.key === key);
  if (!tool) throw new Error(`Unknown tool key: ${key}`);
  return tool;
}

export function getToolBySlug(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

/** The next tool in the sequence, for the "you might also want to try…" cross-promo. */
export function nextTool(key: ToolKey): ToolMeta | undefined {
  const current = getToolByKey(key);
  return TOOLS.find((t) => t.order === current.order + 1);
}
