import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getToolByKey } from "@/lib/tools/registry";
import { ToolShell } from "@/components/tool-shell";
import { CrossPromo } from "@/components/cross-promo";
import { MaxOfferForm } from "./max-offer-form";

/**
 * Max Offer Calculator page.
 *
 * The per-tool pattern (spec §3): this page's ONLY jobs are to collect inputs, call the
 * pure logic module (lib/tools/max-offer.ts), save the result, fire the GHL webhook, and
 * render. All of that lives in ./actions.ts + ./max-offer-form.tsx; the MAO math lives
 * only in the pure module.
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
      <MaxOfferForm />
      <CrossPromo current="max_offer" />
    </ToolShell>
  );
}
