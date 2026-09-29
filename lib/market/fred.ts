import "server-only";

/**
 * FRED (Federal Reserve Economic Data) client — the free, official API behind Market Watch.
 * Data notes:
 *   - Mortgage rate: MORTGAGE30US (Freddie Mac weekly survey)
 *   - Listing price / days on market / active listings: Realtor.com monthly series,
 *     available nationally (…US) and per metro (…<CBSA code> — see lib/market/metros.ts)
 *
 * `import "server-only"` guarantees FRED_API_KEY can never leak into the browser bundle
 * (same pattern as lib/ghl.ts). Responses are cached ~12h via Next's fetch cache, so we
 * hit FRED a handful of times a day total, regardless of user traffic.
 */

export interface SeriesPoint {
  /** observation date, YYYY-MM-DD */
  d: string;
  v: number;
}

const BASE = "https://api.stlouisfed.org/fred/series/observations";

export function fredConfigured(): boolean {
  const key = process.env.FRED_API_KEY;
  return !!key && key.length > 10 && !/paste|your|not-configured/i.test(key);
}

export async function fetchSeries(seriesId: string, months = 24): Promise<SeriesPoint[]> {
  const key = process.env.FRED_API_KEY;
  if (!fredConfigured() || !key) return [];

  const start = new Date();
  start.setMonth(start.getMonth() - months);

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: key,
    file_type: "json",
    observation_start: start.toISOString().slice(0, 10),
  });

  const res = await fetch(`${BASE}?${params.toString()}`, {
    next: { revalidate: 43200 }, // 12h — housing series update weekly/monthly at most
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`FRED ${seriesId} responded ${res.status}`);

  const json = (await res.json()) as { observations?: { date: string; value: string }[] };
  return (json.observations ?? [])
    .filter((o) => o.value !== ".") // FRED encodes missing observations as "."
    .map((o) => ({ d: o.date, v: parseFloat(o.value) }));
}

/**
 * Resolve a city (+ optional state) to its metro via FRED's series search — this is what
 * makes "My Markets" work for ANY city the user types, not just a hardcoded list.
 *
 * We search for the Realtor.com "Median Listing Price in <metro> (CBSA)" series and take
 * the first hit whose title contains the city (and state, when we have one). County-level
 * series share the id shape, so the "(CBSA)" title check is what keeps this metro-level.
 * Results are cached ~30 days — city→metro mappings don't change.
 */
export async function resolveMetro(
  city: string,
  state: string | null,
): Promise<{ cbsa: string; name: string } | null> {
  const key = process.env.FRED_API_KEY;
  if (!fredConfigured() || !key) return null;

  const params = new URLSearchParams({
    search_text: `median listing price ${city}${state ? " " + state : ""}`,
    api_key: key,
    file_type: "json",
    limit: "25",
  });
  const res = await fetch(`https://api.stlouisfed.org/fred/series/search?${params.toString()}`, {
    next: { revalidate: 2592000 },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { seriess?: { id: string; title: string }[] };
  const cityLc = city.toLowerCase();
  for (const s of json.seriess ?? []) {
    if (!/^MEDLISPRI\d{5}$/.test(s.id)) continue;
    if (!s.title.includes("(CBSA)")) continue;
    if (!s.title.toLowerCase().includes(cityLc)) continue;
    if (state && !s.title.toUpperCase().includes(state.toUpperCase())) continue;
    const name = s.title
      .replace(/^Housing Inventory: Median Listing Price in /i, "")
      .replace(/ \(CBSA\)\s*$/, "");
    return { cbsa: s.id.slice("MEDLISPRI".length), name };
  }
  return null;
}
