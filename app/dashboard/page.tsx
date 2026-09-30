import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type ToolKey } from "@/lib/tools/registry";
import { DashboardView } from "./dashboard-view";
import "../brand-os.css";

const STAGE_SHORT: Record<string, string> = {
  "pre-deal": "PRE",
  "1-3-deals": "1–3",
  active: "ACTIVE",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Nudge window: follow-ups due within a week count as needing attention (Gio's call).
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + 7);
  const [{ data: profile }, { data: results }, { count: dueFollowUps }] = await Promise.all([
    supabase.from("profiles").select("stage").eq("id", user.id).single(),
    supabase
      .from("tool_results")
      .select("tool, created_at, inputs")
      .order("created_at", { ascending: false }),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("next_follow_up", windowEnd.toLocaleDateString("en-CA"))
      .not("stage", "in", "(closed,dead)"),
  ]);

  const completed: Partial<Record<ToolKey, string>> = {};
  let firstName = "";
  for (const row of results ?? []) {
    const key = row.tool as ToolKey;
    if (!completed[key]) completed[key] = row.created_at as string;
    if (!firstName) {
      const seg = (row.inputs as { segmentation?: { firstName?: string } })?.segmentation;
      if (seg?.firstName) firstName = seg.firstName;
    }
  }
  if (!firstName) firstName = (user.email ?? "there").split("@")[0];

  return (
    <DashboardView
      email={user.email ?? ""}
      firstName={firstName}
      completed={completed}
      totalRuns={results?.length ?? 0}
      maxOfferRuns={(results ?? []).filter((r) => r.tool === "max_offer").length}
      lastActivity={results?.[0]?.created_at as string | undefined}
      stageShort={profile?.stage ? (STAGE_SHORT[profile.stage] ?? "NEW") : "NEW"}
      dueFollowUps={dueFollowUps ?? 0}
    />
  );
}
