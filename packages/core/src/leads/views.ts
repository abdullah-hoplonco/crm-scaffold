import type { LeadStatus } from "@hco/shared";

/** Saved views on the leads screen. "open" groups every status that still needs work. */
export const LEAD_VIEWS = ["new", "open", "converted", "disqualified", "all"] as const;
export type LeadView = (typeof LEAD_VIEWS)[number];

export function leadInView(status: LeadStatus, view: LeadView | LeadStatus): boolean {
  switch (view) {
    case "all":
      return true;
    case "open":
      return status === "new" || status === "contacted" || status === "qualified";
    default:
      return status === view;
  }
}

/** Form answer that says what the person is interested in ("Treatment of interest", "Product", …). */
export function interestFromFormFields(formFields: Record<string, string>): string | null {
  const entry = Object.entries(formFields).find(([label, value]) =>
    Boolean(value.trim()) && /interest|treatment|service|product/i.test(label),
  );
  return entry ? entry[1].trim() : null;
}

/** First word of a person's name, for greetings ("Layla" from "Layla Haddad"). */
export function firstNameOf(name: string): string {
  const cleaned = name.replace(/^(dr|mr|mrs|ms)\.?\s+/i, "").trim();
  return cleaned.split(/\s+/)[0] ?? cleaned;
}
