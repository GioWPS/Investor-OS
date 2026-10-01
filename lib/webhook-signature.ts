import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Standard Webhooks signature (the scheme Supabase Auth hooks use).
 *
 *   secret:    "v1,whsec_<base64 key>" as shown in the Supabase dashboard
 *   headers:   webhook-id, webhook-timestamp (unix seconds), webhook-signature
 *              ("v1,<base64 sig>", possibly several separated by spaces)
 *   signature: base64(HMAC-SHA256(key, `${id}.${timestamp}.${rawBody}`))
 *
 * Rejects stale timestamps (default ±5 min) so a captured request can't be replayed later.
 */
export function verifyStandardWebhook(args: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  rawBody: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  const { secret, id, timestamp, signature, rawBody } = args;
  if (!secret || !id || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  const now = args.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > (args.toleranceSeconds ?? 300)) return false;

  const keyB64 = secret.replace(/^v1,/, "").replace(/^whsec_/, "");
  const key = Buffer.from(keyB64, "base64");
  if (key.length === 0) return false;

  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${rawBody}`).digest();

  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
