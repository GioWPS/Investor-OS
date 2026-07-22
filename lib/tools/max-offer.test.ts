import { describe, expect, it } from "vitest";
import { calculateMaxOffer, type MaxOfferInputs } from "./max-offer";

/**
 * These numbers are pinned to Henry's Excel/Sheets MVP ("MAO Calculator" sheet) with its
 * sample inputs. If a refactor changes any of these, the port has drifted from Henry's
 * framework — that's a bug, not a test to "update".
 */
const SHEET_SAMPLE: MaxOfferInputs = {
  arv: 310000,
  renovationBudget: 85000,
  desiredProfit: 35000,
  holdMonths: 8,
  commissionPct: 0.06,
  saleClosingPct: 0.02,
  purchaseClosingPct: 0.02,
  holdingInterestRate: 0.12,
  loanPoints: 2,
  originationFee: 500,
};

describe("calculateMaxOffer — matches Henry's sheet", () => {
  const { maxOffer, breakdown } = calculateMaxOffer(SHEET_SAMPLE);

  it("computes the MAO (sheet B50 = 140982.14)", () => {
    expect(maxOffer).toBeCloseTo(140982.14, 2);
  });

  it("computes the cost breakdown (Section 3)", () => {
    expect(breakdown.commissions).toBeCloseTo(18600, 2); // B42
    expect(breakdown.saleClosingCosts).toBeCloseTo(6200, 2); // B43
    expect(breakdown.purchaseClosingCosts).toBeCloseTo(2819.64, 2); // B44
    expect(breakdown.monthlyHoldingCost).toBeCloseTo(2259.82, 2); // B46
    expect(breakdown.totalHoldingCost).toBeCloseTo(18078.57, 2); // B47
    expect(breakdown.loanPointsCost).toBeCloseTo(2819.64, 2); // E42
    expect(breakdown.totalFinancingFees).toBeCloseTo(3319.64, 2); // E43
  });
});

describe("blank optional fields behave like the sheet's IF(...=\"\",0,...)", () => {
  it("treats missing loanPoints and originationFee as 0", () => {
    const withZeros = calculateMaxOffer({
      ...SHEET_SAMPLE,
      loanPoints: 0,
      originationFee: 0,
    });
    const withUndefined = calculateMaxOffer({
      ...SHEET_SAMPLE,
      loanPoints: undefined,
      originationFee: undefined,
    });
    expect(withUndefined.maxOffer).toBeCloseTo(withZeros.maxOffer, 6);
  });
});
