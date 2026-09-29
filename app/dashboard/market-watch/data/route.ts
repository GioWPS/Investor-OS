import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchSeries, fredConfigured } from "@/lib/market/fred";
import { METROS, metroSeries } from "@/lib/market/metros";

/**
 * On-demand metro data for Market Watch's "All tracked markets" dropdown group.
 * Auth required (middleware also gates /dashboard/*); the cbsa must be one of the
 * curated metros, so this can never be used to proxy arbitrary FRED queries.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!fredConfigured()) return NextResponse.json({ error: "not configured" }, { status: 503 });

  const cbsa = new URL(request.url).searchParams.get("cbsa") ?? "";
  const metro = METROS.find((m) => m.cbsa === cbsa);
  if (!metro) return NextResponse.json({ error: "unknown market" }, { status: 400 });

  try {
    const s = metroSeries(metro.cbsa);
    const [price, dom, listings] = await Promise.all([
      fetchSeries(s.price),
      fetchSeries(s.dom),
      fetchSeries(s.listings),
    ]);
    return NextResponse.json({
      cbsa: metro.cbsa,
      name: metro.name,
      fromDeals: false,
      price,
      dom,
      listings,
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
