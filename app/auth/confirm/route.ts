import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { claimPendingRuns } from "@/lib/claim-pending-runs";

/**
 * Where one-time sign-in links from /api/calculator-signup land:
 *   /auth/confirm?token_hash=…&type=email&next=/tools/max-offer/history?report=…
 *
 * verifyOtp checks the single-use token with Supabase and sets the session cookies on THIS
 * response, so the person arrives signed in. Then any pending runs they submitted from the
 * GHL page are attached to their Reports.
 */
const ALLOWED_TYPES: EmailOtpType[] = ["email", "magiclink", "recovery"];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Open-redirect protection: same-site paths only.
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    // Expired or already used. They can request a new link by submitting again.
    return NextResponse.redirect(`${origin}/login?error=link_expired`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await claimPendingRuns(createAdminClient(), user.id, user.email ?? "");
    } catch (err) {
      // Never block sign-in over this; the runs stay pending and are claimed next time.
      console.error("[auth/confirm] claim failed:", err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
