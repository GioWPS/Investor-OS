import { describe, expect, it } from "vitest";
import { corsHeaders, isAllowedOrigin } from "./cors";

describe("isAllowedOrigin", () => {
  it("allows Henry's site with and without www", () => {
    expect(isAllowedOrigin("https://henrywashington.com")).toBe(true);
    expect(isAllowedOrigin("https://www.henrywashington.com")).toBe(true);
  });

  it("rejects everything else, including look-alikes and http", () => {
    expect(isAllowedOrigin(null)).toBe(false);
    expect(isAllowedOrigin("https://evil.com")).toBe(false);
    expect(isAllowedOrigin("https://henrywashington.com.evil.com")).toBe(false);
    expect(isAllowedOrigin("http://henrywashington.com")).toBe(false);
    expect(isAllowedOrigin("https://app.henrywashington.com")).toBe(false);
  });

  it("allows localhost only in development", () => {
    expect(isAllowedOrigin("http://localhost:3000")).toBe(false);
    expect(isAllowedOrigin("http://localhost:3000", { dev: true })).toBe(true);
  });
});

describe("corsHeaders", () => {
  it("echoes the exact origin, never a wildcard", () => {
    expect(corsHeaders("https://henrywashington.com")["Access-Control-Allow-Origin"]).toBe(
      "https://henrywashington.com",
    );
  });
});
