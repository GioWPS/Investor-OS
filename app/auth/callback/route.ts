import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signupPayload, syncToGhl } from "@/lib/ghl";

/**
 * Supabase redirects the magic link here with a one-time `code`. We exchange it for a
 * session (which sets the auth cookies), then send the user on to the dashboard.
 *
 * On a brand-new account this is where we fire the one-time "signup" webhook to GHL —
 * fire-and-forget-but-logged, so a GHL problem never blocks the user from getting in.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Open-redirect protection: only ever redirect to a path on our own site, never to an
  // absolute URL an attacker could smuggle in via ?next= (security checklist #5 spirit).
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const safeNext = nextParam.startsWith("/") ? nextParam : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Session is now established. Derive the user from the session (never from the request).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Only fire the signup webhook the FIRST time (ghl_synced_at is null until we do).
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, ghl_synced_at")
      .eq("id", user.id)
      .single();

    if (profile && !profile.ghl_synced_at) {
      await syncToGhl(signupPayload(profile.email ?? user.email ?? ""), {
        userId: user.id,
      });
      // Mark synced regardless of GHL success: failures are already captured in
      // sync_failures for replay, and we don't want to spam the signup event on retry.
      await supabase
        .from("profiles")
        .update({ ghl_synced_at: new Date().toISOString() })
        .eq("id", user.id);
    }
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
