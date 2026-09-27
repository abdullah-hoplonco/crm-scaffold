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

/**
 * Form answer that says what the person is interested in ("Service of interest", "Product", …).
 * A plainer answer such as "Study destination" is only used when no form field names the service.
 */
export function interestFromFormFields(formFields: Record<string, string>): string | null {
  const answered = Object.entries(formFields).filter(([, value]) => Boolean(value.trim()));
  const entry =
    answered.find(([label]) => /interest|treatment|service|product/i.test(label)) ??
    answered.find(([label]) => /destination|programme|program|course/i.test(label));
  return entry ? entry[1].trim() : null;
}

/** First word of a person's name, for greetings ("Ali" from "Ali Raza"). */
export function firstNameOf(name: string): string {
  const cleaned = name.replace(/^(dr|mr|mrs|ms)\.?\s+/i, "").trim();
  return cleaned.split(/\s+/)[0] ?? cleaned;
}
