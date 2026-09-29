/**
 * Curated metro list for Market Watch. Pure module — no imports, usable anywhere.
 *
 * Each metro maps to Realtor.com series on FRED by CBSA code (all 22 verified live):
 *   MEDLISPRI<cbsa>  = median listing price
 *   MEDDAYONMAR<cbsa> = median days on market
 *   ACTLISCOU<cbsa>  = active listing count
 *
 * `aliases` are the principal-city tokens we look for inside a user's free-text deal
 * addresses ("123 Main St, Fayetteville, AR" → Fayetteville–Springdale–Rogers metro).
 * `state` disambiguates same-named cities (Fayetteville AR vs NC, Columbus OH vs GA):
 * if the address carries a 2-letter state that disagrees, the match is rejected.
 */

export interface Metro {
  cbsa: string;
  name: string;
  state: string;
  aliases: string[];
}

export const METROS: Metro[] = [
  { cbsa: "19100", name: "Dallas–Fort Worth, TX", state: "TX", aliases: ["dallas", "fort worth"] },
  { cbsa: "22220", name: "Fayetteville–Springdale–Rogers, AR", state: "AR", aliases: ["fayetteville", "springdale", "rogers", "bentonville"] },
  { cbsa: "26420", name: "Houston, TX", state: "TX", aliases: ["houston"] },
  { cbsa: "12060", name: "Atlanta, GA", state: "GA", aliases: ["atlanta"] },
  { cbsa: "38060", name: "Phoenix, AZ", state: "AZ", aliases: ["phoenix", "mesa", "scottsdale"] },
  { cbsa: "32820", name: "Memphis, TN", state: "TN", aliases: ["memphis"] },
  { cbsa: "30780", name: "Little Rock, AR", state: "AR", aliases: ["little rock"] },
  { cbsa: "46140", name: "Tulsa, OK", state: "OK", aliases: ["tulsa"] },
  { cbsa: "36420", name: "Oklahoma City, OK", state: "OK", aliases: ["oklahoma city"] },
  { cbsa: "28140", name: "Kansas City, MO", state: "MO", aliases: ["kansas city"] },
  { cbsa: "16740", name: "Charlotte, NC", state: "NC", aliases: ["charlotte"] },
  { cbsa: "45300", name: "Tampa, FL", state: "FL", aliases: ["tampa", "st. petersburg", "st petersburg"] },
  { cbsa: "34980", name: "Nashville, TN", state: "TN", aliases: ["nashville"] },
  { cbsa: "26900", name: "Indianapolis, IN", state: "IN", aliases: ["indianapolis"] },
  { cbsa: "41180", name: "St. Louis, MO", state: "MO", aliases: ["st. louis", "st louis"] },
  { cbsa: "41700", name: "San Antonio, TX", state: "TX", aliases: ["san antonio"] },
  { cbsa: "12420", name: "Austin, TX", state: "TX", aliases: ["austin"] },
  { cbsa: "27260", name: "Jacksonville, FL", state: "FL", aliases: ["jacksonville"] },
  { cbsa: "13820", name: "Birmingham, AL", state: "AL", aliases: ["birmingham"] },
  { cbsa: "17140", name: "Cincinnati, OH", state: "OH", aliases: ["cincinnati"] },
  { cbsa: "18140", name: "Columbus, OH", state: "OH", aliases: ["columbus"] },
  { cbsa: "35380", name: "New Orleans, LA", state: "LA", aliases: ["new orleans"] },
];

export function metroSeries(cbsa: string) {
  return {
    price: `MEDLISPRI${cbsa}`,
    dom: `MEDDAYONMAR${cbsa}`,
    listings: `ACTLISCOU${cbsa}`,
  };
}

export const NATIONAL_SERIES = {
  mortgage: "MORTGAGE30US",
  price: "MEDLISPRIUS",
  dom: "MEDDAYONMARUS",
  listings: "ACTLISCOUUS",
};

/** Valid US state/territory abbreviations — guards against reading "St" in "Main St" as a state. */
const STATES = new Set(
  "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR".split(" "),
);

const STREET_SUFFIX =
  /\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|boulevard|ct|court|way|pl|place|hwy|pkwy|cir|circle|ter|terrace|trl|trail)\.?$/i;

/**
 * Pull "City, ST" out of a free-text deal address so Market Watch can look the metro up
 * dynamically. Pure + unit-tested (metros.test.ts). Returns null rather than guessing when
 * the text doesn't clearly contain a city.
 */
export function parseCityState(raw: string | null | undefined): { city: string; state: string | null } | null {
  const addr = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!addr) return null;
  const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);

  // Pattern A: "..., City, ST" / "..., City, ST 02118" — the state is its own segment.
  for (let i = parts.length - 1; i > 0; i--) {
    const m = parts[i].match(/^([A-Za-z]{2})(?: \d{5}(?:-\d{4})?)?$/);
    if (m && STATES.has(m[1].toUpperCase())) {
      const city = parts[i - 1].replace(/ \d{5}(?:-\d{4})?$/, "");
      if (city && !STREET_SUFFIX.test(city) && !/^\d/.test(city)) {
        return { city, state: m[1].toUpperCase() };
      }
    }
  }

  // Pattern B: "City ST" / "..., City ST 02118" — city and state share the last segment.
  const last = parts[parts.length - 1];
  const m = last.match(/^(.{2,40}?) ([A-Za-z]{2})(?: \d{5}(?:-\d{4})?)?$/);
  if (m && STATES.has(m[2].toUpperCase()) && !STREET_SUFFIX.test(m[1]) && !/^\d/.test(m[1])) {
    return { city: m[1], state: m[2].toUpperCase() };
  }

  // Pattern C: a bare trailing city segment ("123 Main St, Boston") — no digits, no suffix.
  const seg = parts[parts.length - 1];
  if (parts.length > 1 && !/\d/.test(seg) && !STREET_SUFFIX.test(seg) && seg.length >= 3) {
    return { city: seg, state: null };
  }
  return null;
}

/**
 * The state abbreviation in a free-text address, if present. Only accepts real state
 * codes (so "St" in "Oak St" never counts) and takes the LAST one, since the state
 * comes at the end of a US address.
 */
function stateToken(address: string): string | null {
  let last: string | null = null;
  for (const m of address.toUpperCase().matchAll(/(?:^|[,\s])([A-Z]{2})(?=[\s,]|\d|$)/g)) {
    if (STATES.has(m[1])) last = m[1];
  }
  return last;
}

/** Which curated metros appear in the user's deal addresses (order = first seen). */
export function matchMetros(addresses: string[]): Metro[] {
  const found: Metro[] = [];
  for (const raw of addresses) {
    const addr = (raw ?? "").toLowerCase();
    if (!addr) continue;
    const st = stateToken(raw ?? "");
    for (const metro of METROS) {
      if (found.includes(metro)) continue;
      if (st && st !== metro.state) continue;
      if (metro.aliases.some((a) => addr.includes(a))) found.push(metro);
    }
  }
  return found;
}
