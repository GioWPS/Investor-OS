import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MaxOfferForm } from "./max-offer-form";
import "./moc.css";

/**
 * Max Offer Calculator page.
 *
 * Uses Henry's branded "glass" design (ported from the live GHL page). It's a full-page
 * experience, so it intentionally replaces the generic ToolShell for this tool.
 *
 * Per the locked pattern: the page only collects inputs, calls the pure module
 * (lib/tools/max-offer.ts) via the server action, saves, fires GHL, and renders. The MAO
 * math lives only in the pure module.
 */
export default async function MaxOfferPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <MaxOfferForm userEmail={user.email ?? ""} />;
}
