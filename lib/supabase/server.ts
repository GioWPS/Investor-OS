import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Supabase client for SERVER code (server components, server actions, route handlers).
 *
 * Also uses the `anon` key + RLS — it is NOT an admin client. What makes it "the current
 * user" is the session stored in cookies, which this client reads and writes. That is the
 * whole point of security-checklist #6: the acting user is derived from the signed session
 * cookie, never from a userId/email the client hands us in a request body or header.
 *
 * In Next.js 15 `cookies()` is async, so this factory is async too — always `await` it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component, where you can't write cookies.
            // That's fine: the middleware (lib/supabase/middleware.ts) refreshes the
            // session cookie on every request, so nothing is lost here.
          }
        },
      },
    },
  );
}
