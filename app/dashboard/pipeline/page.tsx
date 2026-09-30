import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addressesMatch, type LeadStage } from "@/lib/pipeline";
import { LIVE_MODULES } from "@/lib/modules";
import { PipelineView, type LeadRow } from "./pipeline-view";
import "../../brand-os.css";

/**
 * Lead Pipeline (Pipeline Lite) — the free-tier CRM board. Leads live in the `leads`
 * table (RLS-scoped); each lead card also shows how many saved Max Offer reports match
 * its property so analysis and pipeline stay connected.
 */
export default async function PipelinePage() {
  if (!LIVE_MODULES.pipeline) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: leads }, { data: reports }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, nickname, contact_name, contact_info, source, stage, notes, next_follow_up, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tool_results")
      .select("inputs")
      .eq("user_id", user.id)
      .eq("tool", "max_offer")
      .limit(200),
  ]);

  const reportAddresses = (reports ?? [])
    .map((r) => (r.inputs as { segmentation?: { address?: string } })?.segmentation?.address ?? "")
    .filter(Boolean);

  const rows: LeadRow[] = (leads ?? []).map((l) => ({
    id: l.id as string,
    nickname: l.nickname as string,
    contactName: (l.contact_name as string | null) ?? "",
    contactInfo: (l.contact_info as string | null) ?? "",
    source: (l.source as string | null) ?? "",
    stage: l.stage as LeadStage,
    notes: (l.notes as string | null) ?? "",
    nextFollowUp: (l.next_follow_up as string | null) ?? null,
    reportCount: reportAddresses.filter((a) => addressesMatch(l.nickname as string, a)).length,
  }));

  return <PipelineView leads={rows} />;
}
