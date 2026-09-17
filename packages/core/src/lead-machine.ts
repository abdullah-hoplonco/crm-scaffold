import type { DisqualifyReason, LeadStatus } from "@hco/shared";
import { fail, ok, type Result } from "./result";

const OPEN: ReadonlySet<LeadStatus> = new Set(["new", "contacted", "qualified"]);

export function isLeadOpen(status: LeadStatus): boolean {
  return OPEN.has(status);
}

/**
 * Lead lifecycle: new → contacted → qualified → converted; any open status → disqualified (reason required).
 * Converting is allowed from any open status (skipped statuses are fine). converted and disqualified are terminal.
 */
export function transitionLead(
  from: LeadStatus,
  to: LeadStatus,
  opts: { reason?: DisqualifyReason | null } = {},
): Result<LeadStatus> {
  if (!OPEN.has(from)) return fail("LEAD_CLOSED", `This lead is already ${from}.`);
  if (to === from) return ok(to);
  switch (to) {
    case "contacted":
      return from === "new"
        ? ok(to)
        : fail("INVALID_TRANSITION", `A ${from} lead can't go back to contacted.`);
    case "qualified":
      return ok(to);
    case "converted":
      return ok(to);
    case "disqualified":
      return opts.reason
        ? ok(to)
        : fail("DISQUALIFY_REASON_REQUIRED", "Choose why this lead is disqualified.");
    case "new":
      return fail("INVALID_TRANSITION", "A lead can't go back to new.");
  }
}

/** First outbound touch (message, call) moves a new lead to contacted automatically. */
export function statusAfterFirstTouch(status: LeadStatus): LeadStatus {
  return status === "new" ? "contacted" : status;
}
