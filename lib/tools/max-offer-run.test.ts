import { describe, expect, it } from "vitest";
import { analyzeDeal } from "./max-offer";
import { buildMaxOfferRun, calculatorAnswerTags, parseCalculatorSignup, stageFromExperience } from "./max-offer-run";

const page = {
  first_name: "Jane",
  email: "  Jane@Example.com ",
  arv: "$300,000",
  asking: "180000",
  repairs: 40000,
  profit: "",
  hold: "8",
  commission: "6%",
  sale_closing: 2,
  purchase_closing: 2,
  points: "2",
  origination: "",
  rate: 12,
  funding_type: "Hard Money",
  cash_available: "$25,000",
  experience: "First-Time Investor",
  utm_source: "instagram",
  utm_campaign: "fall",
  website: "",
};

describe("parseCalculatorSignup", () => {
  it("parses the GHL page's fields, cleaning $ , and %", () => {
    const r = parseCalculatorSignup(page);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.email).toBe("jane@example.com");
    expect(r.data.values.arv).toBe(300000);
    expect(r.data.values.price).toBe(180000);
    expect(r.data.values.commissionPct).toBe(6);
    expect(r.data.values.cashAvailable).toBe(25000);
    expect(r.data.values.originationFee).toBeNull();
    expect(r.data.attribution).toEqual({ utm_source: "instagram", utm_campaign: "fall" });
    expect(r.data.isBot).toBe(false);
  });

  it("uses the rule of thumb (profit = repairs) when profit is blank", () => {
    const r = parseCalculatorSignup(page);
    if (!r.ok) throw new Error(r.error);
    expect(r.data.values.useRuleOfThumb).toBe(true);
    expect(r.data.values.desiredProfit).toBe(40000);

    const r2 = parseCalculatorSignup({ ...page, profit: "35000" });
    if (!r2.ok) throw new Error(r2.error);
    expect(r2.data.values.useRuleOfThumb).toBe(false);
    expect(r2.data.values.desiredProfit).toBe(35000);
  });

  it("flags the honeypot", () => {
    const r = parseCalculatorSignup({ ...page, website: "http://spam" });
    expect(r.ok && r.data.isBot).toBe(true);
  });

  it("rejects a bad email, a missing name, and non-numbers", () => {
    expect(parseCalculatorSignup({ ...page, email: "nope" }).ok).toBe(false);
    expect(parseCalculatorSignup({ ...page, first_name: " " }).ok).toBe(false);
    expect(parseCalculatorSignup({ ...page, arv: "abc" }).ok).toBe(false);
    expect(parseCalculatorSignup({ ...page, rate: undefined }).ok).toBe(false);
    expect(parseCalculatorSignup({ ...page, points: "-1" }).ok).toBe(false);
    expect(parseCalculatorSignup(null).ok).toBe(false);
  });
});

describe("buildMaxOfferRun", () => {
  it("computes with the real formula and saves the same shape as the app", () => {
    const r = parseCalculatorSignup(page);
    if (!r.ok) throw new Error(r.error);
    const run = buildMaxOfferRun(r.data.values, { attribution: r.data.attribution });

    const direct = analyzeDeal(
      {
        arv: 300000,
        renovationBudget: 40000,
        desiredProfit: 40000,
        holdMonths: 8,
        commissionPct: 0.06,
        saleClosingPct: 0.02,
        purchaseClosingPct: 0.02,
        holdingInterestRate: 0.12,
        loanPoints: 2,
        originationFee: 0,
      },
      180000,
    );
    expect(run.analysis.maxOffer).toBeCloseTo(direct.maxOffer, 6);
    expect(run.row.tool).toBe("max_offer");
    expect(run.row.inputs).toMatchObject({
      price: 180000,
      useRuleOfThumb: true,
      segmentation: { firstName: "Jane", experience: "First-Time Investor" },
      attribution: { utm_source: "instagram" },
    });
    expect(run.stage).toBe("pre-deal");
    expect(["deal-verdict-good", "deal-verdict-tight", "deal-verdict-pass"]).toContain(run.row.result_segment);
  });

  it("maps experience to stage", () => {
    expect(stageFromExperience("1–3 Deals Completed")).toBe("1-3-deals");
    expect(stageFromExperience("10+ Deals Completed")).toBe("active");
    expect(stageFromExperience("")).toBeUndefined();
  });
});

describe("calculator page labels", () => {
  it("reads the GHL calculator page's own field names", () => {
    const r = parseCalculatorSignup({
      firstName: "Maya",
      email: "maya@example.com",
      address: "9 Oak St",
      arv: "250000",
      price: "150000",
      reno: "30000",
      profit: "",
      holdMonths: "6",
      commissionPct: "6",
      saleClosingPct: "2",
      purchaseClosingPct: "1.5",
      loanPointsPct: "2",
      originationFee: "1000",
      holdingRatePct: "10",
      fundingType: "Private Money",
      cashAvailable: "60000",
      experience: "4–10 Deals Completed",
    });
    if (!r.ok) throw new Error(r.error);
    expect(r.data.firstName).toBe("Maya");
    expect(r.data.values).toMatchObject({
      price: 150000,
      renovationBudget: 30000,
      purchaseClosingPct: 1.5,
      loanPoints: 2,
      originationFee: 1000,
      holdingInterestRate: 10,
      fundingType: "Private Money",
      cashAvailable: 60000,
    });
  });

  it("leaves cash out (no error) when it isn't a usable number", () => {
    const r = parseCalculatorSignup({ ...page, cash_available: "Under $10k" });
    if (!r.ok) throw new Error(r.error);
    expect(r.data.values.cashAvailable).toBeNull();
  });
});

describe("calculatorAnswerTags", () => {
  it("makes one cal- tag per answer and removes the rest of each group", () => {
    const t = calculatorAnswerTags({
      fundingType: "Other — Seller Financing",
      cashAvailable: 25000,
      experience: "10+ Deals Completed",
    });
    expect(t.tags).toEqual(["cal-fund:seller", "cal-cash:25-50k", "cal-exp:10-plus"]);
    expect(t.removeTags).toContain("cal-fund:cash");
    expect(t.removeTags).toContain("cal-cash:10-25k");
    expect(t.removeTags).toContain("cal-exp:new");
    expect(t.removeTags).not.toContain("cal-fund:seller");
    expect(t.removeTags).toHaveLength(4 + 4 + 3);
  });

  it("maps every page option", () => {
    const fund = (f: string) => calculatorAnswerTags({ fundingType: f }).tags[0];
    expect(fund("Cash")).toBe("cal-fund:cash");
    expect(fund("Conventional Loan")).toBe("cal-fund:conventional");
    expect(fund("Hard Money")).toBe("cal-fund:hard-money");
    expect(fund("Private Money")).toBe("cal-fund:private");
    const cash = (n: number) => calculatorAnswerTags({ cashAvailable: n }).tags[0];
    expect(cash(0)).toBe("cal-cash:under-10k");
    expect(cash(9999)).toBe("cal-cash:under-10k");
    expect(cash(10000)).toBe("cal-cash:10-25k");
    expect(cash(99999)).toBe("cal-cash:50-100k");
    expect(cash(100000)).toBe("cal-cash:100k-plus");
    expect(calculatorAnswerTags({ experience: "First-Time Investor" }).tags).toEqual(["cal-exp:new"]);
    expect(calculatorAnswerTags({ experience: "1–3 Deals Completed" }).tags).toEqual(["cal-exp:1-3"]);
    expect(calculatorAnswerTags({ experience: "4–10 Deals Completed" }).tags).toEqual(["cal-exp:4-10"]);
  });

  it("skips unanswered questions", () => {
    expect(calculatorAnswerTags({ cashAvailable: null })).toEqual({ tags: [], removeTags: [] });
  });
});
