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
export default async function MaxOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string | string[] }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pipeline's "Analyze" button prefills the property (?address=…).
  const { address } = await searchParams;
  const initialAddress = typeof address === "string" ? address.slice(0, 140) : "";

  return <MaxOfferForm userEmail={user.email ?? ""} initialAddress={initialAddress} />;
}
