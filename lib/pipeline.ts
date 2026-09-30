/**
 * Pipeline Lite — pure module (no React/Supabase/Next imports, per the house rule).
 * Stage vocabulary + the address matching that links leads to saved deal reports.
 *
 * FREE-TIER BOUNDARY: this stays deliberately small. Automations, team features,
 * email/SMS follow-up sending, and imports are paid Closing Table OS features.
 */

export type LeadStage = "cold" | "warm" | "hot" | "under_contract" | "closed" | "dead";

export const LEAD_STAGES: { key: LeadStage; label: string; accent: string }[] = [
  { key: "cold", label: "Cold", accent: "var(--os-blue)" },
  { key: "warm", label: "Warm", accent: "var(--os-teal)" },
  { key: "hot", label: "Hot", accent: "var(--os-orange)" },
  { key: "under_contract", label: "Under Contract", accent: "var(--os-purple)" },
  { key: "closed", label: "Closed", accent: "var(--os-lime)" },
  { key: "dead", label: "Dead", accent: "rgba(244, 241, 247, 0.35)" },
];

export const LEAD_STAGE_KEYS = LEAD_STAGES.map((s) => s.key);

export function isLeadStage(v: unknown): v is LeadStage {
  return typeof v === "string" && (LEAD_STAGE_KEYS as string[]).includes(v);
}

/** "Active" = still needs working: everything except closed/dead. */
export function isActiveStage(stage: LeadStage): boolean {
  return stage !== "closed" && stage !== "dead";
}

/** Normalize an address/nickname for comparison: lowercase, no punctuation, one space. */
export function addressKey(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Do a lead's property and a saved report's address refer to the same place?
 * Containment either way (a lead "614 Maple" matches a report "614 Maple St,
 * Springdale, AR"), with a length guard so tiny strings don't match everything.
 */
export function addressesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = addressKey(a);
  const kb = addressKey(b);
  if (ka.length < 5 || kb.length < 5) return false;
  return ka.includes(kb) || kb.includes(ka);
}
