import { describe, expect, it } from "vitest";
import { contactFields, quoteList } from "./ghl-format";

describe("quoteList", () => {
  it("quotes and comma-joins tags without brackets", () => {
    expect(quoteList(["tool:max-offer-used", "stage:pre-deal"])).toBe(
      '"tool:max-offer-used","stage:pre-deal"',
    );
  });

  it("wrapped in brackets, it is a valid JSON array", () => {
    expect(JSON.parse(`[${quoteList(["a", "b"])}]`)).toEqual(["a", "b"]);
  });

  it("is empty for no tags", () => {
    expect(quoteList([])).toBe("");
  });
});

describe("contactFields", () => {
  it("adds both names as a leading-comma fragment", () => {
    expect(contactFields({ firstName: "Jane", lastName: "Doe" })).toBe(
      ',"firstName":"Jane","lastName":"Doe"',
    );
  });

  it("omits unknown names entirely so GHL never blanks an existing name", () => {
    expect(contactFields({})).toBe("");
    expect(contactFields({ firstName: "Jane" })).toBe(',"firstName":"Jane"');
  });

  it("produces valid JSON when spliced into the upsert body, even with quotes", () => {
    const body = `{"email": "x@y.com"${contactFields({ firstName: 'Jo "JJ"', lastName: "O'Neil" })}, "source": "t"}`;
    expect(JSON.parse(body)).toEqual({
      email: "x@y.com",
      firstName: 'Jo "JJ"',
      lastName: "O'Neil",
      source: "t",
    });
  });
});
