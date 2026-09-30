/**
 * Pure formatting for the app → Zapier → GHL message (no server-only imports, so it's
 * unit-testable). Both helpers produce text the Zap splices into GHL API bodies verbatim.
 */

/**
 * The contact-update fields as a JSON fragment with a leading comma, e.g.
 * ,"firstName":"Jane","lastName":"Doe" — or "" when we don't know the name. The Zap splices
 * it into the contact upsert body right after the email. Unknown names must be OMITTED, not
 * sent blank: GHL's upsert would overwrite an existing contact's name with an empty string.
 */
export function contactFields(p: { firstName?: string; lastName?: string }): string {
  const parts: string[] = [];
  if (p.firstName) parts.push(`"firstName":${JSON.stringify(p.firstName)}`);
  if (p.lastName) parts.push(`"lastName":${JSON.stringify(p.lastName)}`);
  return parts.map((x) => "," + x).join("");
}

/** ["a", "b"] → "a","b" — see the tagsQuoted note in postToGhl. Empty list → "". */
export function quoteList(tags: string[]): string {
  return tags.map((t) => JSON.stringify(t)).join(",");
}
