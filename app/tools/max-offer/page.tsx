import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getToolByKey } from "@/lib/tools/registry";
import { ToolShell } from "@/components/tool-shell";
import { CrossPromo } from "@/components/cross-promo";

/**
 * Max Offer Calculator page.
 *
 * The per-tool pattern (spec §3): this page's ONLY jobs are to collect inputs, call the
 * pure logic module in lib/tools/max-offer.ts, save the result to tool_results, fire the
 * GHL webhook, and render. The MAO math itself lives only in the pure module.
 *
 * STEP 2 (in progress): the input form, the call into lib/tools/max-offer.ts, the save,
 * and the GHL tool-completion sync get wired in here once Henry's exact MAO formula is
 * ported from the Excel MVP. For now this establishes the route + shared shell.
 */
export default async function MaxOfferPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tool = getToolByKey("max_offer");

  return (
    <ToolShell tool={tool}>
      <div className="rounded-xl border border-line bg-surface p-6">
        <p className="text-ink">
          The calculator inputs are being wired up next.
        </p>
        <p className="mt-2 text-sm text-muted">
          The MAO formula will live in its own pure module so it can be lifted
          into Closing Table OS later without a rewrite.
        </p>
      </div>
      <CrossPromo current="max_offer" />
    </ToolShell>
  );
}
