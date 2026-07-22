import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TOOLS, type ToolKey } from "@/lib/tools/registry";
import { ToolCard } from "@/components/tool-card";
import { signOut } from "./actions";

/**
 * The toolkit dashboard: shows every tool, the user's completion state across the whole
 * ecosystem, and leaves room for future tools. Middleware already blocks logged-out
 * visitors, but we re-check here (defense in depth) and derive the user from the session.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // RLS guarantees this only ever returns THIS user's rows.
  const { data: results } = await supabase
    .from("tool_results")
    .select("tool, created_at")
    .order("created_at", { ascending: false });

  // Build a per-tool "completed + last run" map from the saved results.
  const completion = new Map<ToolKey, string>();
  for (const row of results ?? []) {
    const key = row.tool as ToolKey;
    if (!completion.has(key)) completion.set(key, row.created_at as string);
  }

  const completedCount = TOOLS.filter((t) => completion.has(t.key)).length;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">
              Road to the Closing Table
            </p>
            <p className="text-xs text-muted">Free Investor Toolkit</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-muted sm:inline">
              {user.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink hover:bg-canvas"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-ink">Your toolkit</h1>
          <p className="mt-1 text-muted">
            Work through the tools in order — Max Offer, then Funding Path, then
            your First Deal Blueprint.{" "}
            <span className="font-medium text-ink">
              {completedCount} of {TOOLS.length} completed.
            </span>
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <ToolCard
              key={tool.key}
              tool={tool}
              completed={completion.has(tool.key)}
              lastResultAt={completion.get(tool.key) ?? null}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
