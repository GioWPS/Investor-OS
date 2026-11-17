import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Database-backed rate limit (Vercel runs many short-lived copies of the app, so an
 * in-memory counter wouldn't be shared). Counts attempts per key in a sliding window and
 * records this attempt when it's allowed. Fails OPEN if the database is unreachable — a
 * hiccup shouldn't block real signups — and logs it.
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  key: string,
  limit: number,
  windowMinutes = 60,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await admin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .gte("created_at", since);
  if (error) {
    console.error("[rate-limit] check failed, allowing:", error.message);
    return true;
  }
  if ((count ?? 0) >= limit) return false;

  await admin.from("rate_limit_events").insert({ key });
  // Occasionally prune old rows so the table stays small.
  if (Math.random() < 0.05) {
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    await admin.from("rate_limit_events").delete().lt("created_at", dayAgo);
  }
  return true;
}
