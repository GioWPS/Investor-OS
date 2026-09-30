import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchSeries, fredConfigured, resolveMetro, type SeriesPoint } from "@/lib/market/fred";
import { matchMetros, metroSeries, METROS, NATIONAL_SERIES, parseCityState } from "@/lib/market/metros";
import { MarketWatchView, type MetroBundle } from "./market-watch-view";
import { LIVE_MODULES } from "@/lib/modules";
import "../../brand-os.css";

/**
 * Market Watch — the first live Closing Table OS module preview. National housing/rate
 * trends by default, plus per-metro data for the markets detected in the user's own
 * analyzed deals ("My Markets"). All data is real (FRED / Realtor.com), cached ~12h
 * server-side; the FRED key never reaches the browser.
 */
export default async function MarketWatchPage() {
  if (!LIVE_MODULES.marketWatch) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!fredConfigured()) {
    return (
      <div className="os-scope">
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 22px" }}>
          <div className="os-eyebrow">— Market Watch</div>
          <h1 className="os-title" style={{ fontSize: 32 }}>One key to turn on</h1>
          <div className="os-panel" style={{ padding: 26, marginTop: 18, lineHeight: 1.6, color: "var(--os-fg-2)", fontSize: 14 }}>
            <p style={{ marginTop: 0 }}>
              Market Watch pulls live housing data from FRED (the Federal Reserve&apos;s free data
              service) and needs an API key on the server:
            </p>
            <ol style={{ paddingLeft: 20, margin: "0 0 14px" }}>
              <li>Create a free key at <b style={{ color: "var(--os-fg)" }}>fred.stlouisfed.org</b> → My Account → API Keys</li>
              <li>Put it in <code>.env.local</code> as <code>FRED_API_KEY=…</code></li>
              <li>Restart the dev server</li>
            </ol>
            <Link className="os-btn os-btn-ghost" href="/dashboard" style={{ padding: "10px 16px" }}>
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // The user's deal addresses → which curated metros they're actually working in.
  const { data: rows } = await supabase
    .from("tool_results")
    .select("inputs")
    .eq("user_id", user.id)
    .eq("tool", "max_offer")
    .order("created_at", { ascending: false })
    .limit(50);
  const addresses = (rows ?? [])
    .map((r) => (r.inputs as { segmentation?: { address?: string } })?.segmentation?.address ?? "")
    .filter(Boolean);

  // Dynamic detection: parse "City, ST" out of each deal address and resolve it to a metro
  // via FRED search — works for any US city, not just the curated dropdown list.
  const places: { city: string; state: string | null }[] = [];
  for (const addr of addresses) {
    const p = parseCityState(addr);
    if (p && !places.some((q) => q.city.toLowerCase() === p.city.toLowerCase() && q.state === p.state)) {
      places.push(p);
    }
    if (places.length >= 6) break;
  }
  const resolved = await Promise.all(
    places.map((p) => resolveMetro(p.city, p.state).catch(() => null)),
  );
  // Curated alias matching stays as a fallback for addresses the parser can't read.
  const curated = matchMetros(addresses).map((m) => ({ cbsa: m.cbsa, name: m.name }));
  const dealMetroList: { cbsa: string; name: string }[] = [];
  for (const m of [...resolved, ...curated]) {
    if (m && !dealMetroList.some((d) => d.cbsa === m.cbsa)) dealMetroList.push(m);
    if (dealMetroList.length >= 4) break;
  }

  const safe = (p: Promise<SeriesPoint[]>) => p.catch(() => [] as SeriesPoint[]);

  const [mortgage, natPrice, natDom, natListings, ...metroData] = await Promise.all([
    safe(fetchSeries(NATIONAL_SERIES.mortgage)),
    safe(fetchSeries(NATIONAL_SERIES.price)),
    safe(fetchSeries(NATIONAL_SERIES.dom)),
    safe(fetchSeries(NATIONAL_SERIES.listings)),
    ...dealMetroList.flatMap((m) => {
      const s = metroSeries(m.cbsa);
      return [safe(fetchSeries(s.price)), safe(fetchSeries(s.dom)), safe(fetchSeries(s.listings))];
    }),
  ]);

  const dealMetros: MetroBundle[] = dealMetroList.map((m, i) => ({
    cbsa: m.cbsa,
    name: m.name,
    fromDeals: true,
    price: metroData[i * 3] ?? [],
    dom: metroData[i * 3 + 1] ?? [],
    listings: metroData[i * 3 + 2] ?? [],
  }));

  return (
    <MarketWatchView
      national={{ mortgage, price: natPrice, dom: natDom, listings: natListings }}
      dealMetros={dealMetros}
      allMetros={METROS.map((m) => ({ cbsa: m.cbsa, name: m.name }))}
    />
  );
}
