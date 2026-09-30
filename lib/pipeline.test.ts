import { describe, expect, it } from "vitest";
import { addressesMatch, addressKey, isLeadStage } from "./pipeline";

describe("addressKey", () => {
  it("normalizes case, punctuation, and spacing", () => {
    expect(addressKey("  614 Maple St., Springdale,  AR ")).toBe("614 maple st springdale ar");
  });
});

describe("addressesMatch", () => {
  it("matches a short lead nickname against a full report address", () => {
    expect(addressesMatch("614 Maple", "614 Maple St, Springdale, AR 72762")).toBe(true);
  });

  it("does not match different properties", () => {
    expect(addressesMatch("614 Maple St", "22 Birch Rd, Boston, MA")).toBe(false);
  });

  it("refuses to match strings too short to be meaningful", () => {
    expect(addressesMatch("614", "614 Maple St, Springdale, AR")).toBe(false);
  });
});

describe("isLeadStage", () => {
  it("accepts known stages and rejects junk", () => {
    expect(isLeadStage("under_contract")).toBe(true);
    expect(isLeadStage("archived")).toBe(false);
    expect(isLeadStage(42)).toBe(false);
  });
});
