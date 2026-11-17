/**
 * Which websites may call the calculator-signup endpoint from a browser. Pure + tested.
 *
 * CORS only governs browsers — a script can still call the endpoint directly — so the route
 * ALSO rejects requests whose Origin isn't on this list, and relies on rate limits + the
 * honeypot for everything else.
 */
export const CALCULATOR_ALLOWED_ORIGINS = [
  "https://henrywashington.com",
  "https://www.henrywashington.com",
];

export function isAllowedOrigin(origin: string | null, opts: { dev?: boolean } = {}): boolean {
  if (!origin) return false;
  if (CALCULATOR_ALLOWED_ORIGINS.includes(origin)) return true;
  // Local testing only: a page served from this machine.
  return !!opts.dev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

/** CORS response headers for an allowed origin (echoed back exactly, never "*"). */
export function corsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}
