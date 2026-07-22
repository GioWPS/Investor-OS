import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for BROWSER / client components.
 *
 * Uses the `anon` (public) key. This key is safe to expose to the browser because
 * every query it makes is still subject to Row Level Security in the database — the
 * anon key can only ever see/do what RLS policies allow for the logged-in user.
 *
 * The `NEXT_PUBLIC_` prefix is what tells Next.js it's OK to inline these into the
 * client bundle. NEVER give the service_role key a NEXT_PUBLIC_ prefix.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
