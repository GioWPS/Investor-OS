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
export function contactFields(p: {
  firstName?: string;
  lastName?: string;
  /** GHL custom field key → value, e.g. { closing_table_os_action_link: "https://…" } */
  customFields?: Record<string, string>;
}): string {
  const parts: string[] = [];
  if (p.firstName) parts.push(`"firstName":${JSON.stringify(p.firstName)}`);
  if (p.lastName) parts.push(`"lastName":${JSON.stringify(p.lastName)}`);
  const custom = Object.entries(p.customFields ?? {}).filter(([, v]) => v);
  if (custom.length) {
    const items = custom.map(
      ([key, value]) => `{"key":${JSON.stringify(key)},"${GHL_CUSTOM_FIELD_VALUE_PROP}":${JSON.stringify(value)}}`,
    );
    parts.push(`"customFields":[${items.join(",")}]`);
  }
  return parts.map((x) => "," + x).join("");
}

/**
 * The property name GHL's contact upsert expects for a custom field's value. GHL's docs
 * disagree with each other (field_value / fieldValue / value) — confirmed by a live test
 * before relying on it; if GHL ignores the value, this one word is what changes.
 */
export const GHL_CUSTOM_FIELD_VALUE_PROP = "field_value";

/** ["a", "b"] → "a","b" — see the tagsQuoted note in postToGhl. Empty list → "". */
export function quoteList(tags: string[]): string {
  return tags.map((t) => JSON.stringify(t)).join(",");
}
