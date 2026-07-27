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

  const [{ data: profile }, { data: results }] = await Promise.all([
    supabase.from("profiles").select("stage").eq("id", user.id).single(),
    supabase
      .from("tool_results")
      .select("tool, created_at, inputs")
      .order("created_at", { ascending: false }),
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
    />
  );
}
