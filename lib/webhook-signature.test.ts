import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStandardWebhook } from "./webhook-signature";

const keyB64 = Buffer.from("test-signing-key-32-bytes-long!!").toString("base64");
const secret = `v1,whsec_${keyB64}`;
const id = "msg_123";
const now = 1_790_000_000;
const body = '{"user":{"email":"a@b.com"}}';

function sign(ts: number, payload = body) {
  const sig = createHmac("sha256", Buffer.from(keyB64, "base64"))
    .update(`${id}.${ts}.${payload}`)
    .digest("base64");
  return `v1,${sig}`;
}

describe("verifyStandardWebhook", () => {
  it("accepts a correctly signed, fresh request", () => {
    expect(
      verifyStandardWebhook({ secret, id, timestamp: String(now), signature: sign(now), rawBody: body, nowSeconds: now }),
    ).toBe(true);
  });

  it("accepts when one of several listed signatures matches", () => {
    const signature = `v1,bm9wZQ== ${sign(now)}`;
    expect(verifyStandardWebhook({ secret, id, timestamp: String(now), signature, rawBody: body, nowSeconds: now })).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(
      verifyStandardWebhook({ secret, id, timestamp: String(now), signature: sign(now), rawBody: body + " ", nowSeconds: now }),
    ).toBe(false);
  });

  it("rejects a stale timestamp (replay)", () => {
    const old = now - 3600;
    expect(
      verifyStandardWebhook({ secret, id, timestamp: String(old), signature: sign(old), rawBody: body, nowSeconds: now }),
    ).toBe(false);
  });

  it("rejects a wrong secret and missing headers", () => {
    const wrong = `v1,whsec_${Buffer.from("another-key-entirely-different!").toString("base64")}`;
    expect(
      verifyStandardWebhook({ secret: wrong, id, timestamp: String(now), signature: sign(now), rawBody: body, nowSeconds: now }),
    ).toBe(false);
    expect(verifyStandardWebhook({ secret, id: null, timestamp: String(now), signature: sign(now), rawBody: body, nowSeconds: now })).toBe(false);
  });
});
