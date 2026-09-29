import { describe, expect, it } from "vitest";
import { matchMetros, parseCityState } from "./metros";

describe("parseCityState", () => {
  it("reads a full address with zip", () => {
    expect(parseCityState("123 Main St, Boston, MA 02118")).toEqual({ city: "Boston", state: "MA" });
  });

  it("reads city + state without a street", () => {
    expect(parseCityState("Boston, MA")).toEqual({ city: "Boston", state: "MA" });
  });

  it("reads city and state sharing a segment", () => {
    expect(parseCityState("456 Elm Ave, Dallas TX")).toEqual({ city: "Dallas", state: "TX" });
  });

  it("handles multi-word cities", () => {
    expect(parseCityState("9 Beale Rd, Little Rock, AR 72201")).toEqual({ city: "Little Rock", state: "AR" });
  });

  it("does not mistake a street suffix for a city or state", () => {
    // "St" is not a state; "Main St" is not a city.
    expect(parseCityState("123 Main St")).toBeNull();
  });

  it("accepts a bare trailing city segment without a state", () => {
    expect(parseCityState("77 Hanover Way, Fayetteville")).toEqual({ city: "Fayetteville", state: null });
  });

  it("returns null for empty input", () => {
    expect(parseCityState("")).toBeNull();
    expect(parseCityState(undefined)).toBeNull();
  });
});

describe("matchMetros (curated fallback)", () => {
  it("matches an alias city and keeps first-seen order", () => {
    const metros = matchMetros(["12 Oak St, Dallas, TX", "3 Pine Rd, Fayetteville, AR"]);
    expect(metros.map((m) => m.cbsa)).toEqual(["19100", "22220"]);
  });

  it("rejects an alias when the state disagrees", () => {
    // Fayetteville NC is not the Arkansas metro.
    expect(matchMetros(["10 Elm St, Fayetteville, NC"])).toEqual([]);
  });
});
