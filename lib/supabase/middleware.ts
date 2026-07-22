import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * Runs on every matched request (see middleware.ts at the repo root). Two jobs:
 *
 *   1. Refresh the Supabase auth session and write the refreshed cookie back onto the
 *      response, so server components downstream see a valid, current session. (Auth
 *      tokens are short-lived; without this the user would silently get logged out.)
 *   2. Gate protected routes: anyone not logged in who hits /dashboard or /tools/* is
 *      redirected to /login. This is defense-in-depth — RLS already stops them from
 *      reading data, but we shouldn't render a logged-in shell to a logged-out visitor.
 *
 * IMPORTANT: always call `supabase.auth.getUser()` here (which re-validates the token
 * with Supabase), never just `getSession()` (which trusts the cookie as-is). The redirect
 * decision must be based on a verified user.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/tools");

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    // Carry any refreshed auth cookies onto the redirect so the session isn't dropped.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
