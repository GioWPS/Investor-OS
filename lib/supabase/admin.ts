import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * ADMIN Supabase client — uses the SECRET key, which BYPASSES Row Level Security and can
 * create users and sign-in links. Server-only (the import above fails the build if a client
 * component ever imports this file), and the key never gets a NEXT_PUBLIC_ prefix
 * (security checklist #1).
 *
 * Only for the narrow jobs RLS can't do on its own: creating an account from the GHL page,
 * writing that new user's first report, and moving a verified user's pending runs.
 * Everything else must keep using the per-user server client.
 */
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || !/^(sb_secret_|eyJ)/.test(key)) {
    throw new Error("SUPABASE_SECRET_KEY is not configured");
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** The app's public address for links we email or redirect to. Never derived from the
 *  request's Host header — a spoofed Host could otherwise point a real sign-in link at a
 *  stranger's site. */
export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://app.henrywashington.com").replace(/\/$/, "");
}
