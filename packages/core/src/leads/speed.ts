import type { LeadStatus } from "@hco/shared";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type LeadUrgency =
  /** A new lead whose first-reply task is still due: "Reply within 8 min". */
  | { kind: "reply_within"; ms: number }
  /** A new lead past its first-reply due time: "Overdue by 2 h". */
  | { kind: "reply_overdue"; ms: number }
  /** An open (already contacted) lead with a follow-up task past due. */
  | { kind: "task_overdue"; ms: number };

/**
 * Speed-to-lead: how urgently a lead needs a reply, from its soonest open task. New leads always show
 * the countdown; leads already contacted only surface when a follow-up is overdue.
 */
export function leadUrgency(
  lead: { status: LeadStatus; nextTaskDueAt: string | null },
  now: Date,
): LeadUrgency | null {
  if (!lead.nextTaskDueAt) return null;
  if (lead.status === "converted" || lead.status === "disqualified") return null;
  const diff = new Date(lead.nextTaskDueAt).getTime() - now.getTime();
  if (lead.status === "new") {
    return diff > 0 ? { kind: "reply_within", ms: diff } : { kind: "reply_overdue", ms: -diff };
  }
  return diff < 0 ? { kind: "task_overdue", ms: -diff } : null;
}

export interface DurationParts {
  unit: "minute" | "hour" | "day";
  value: number;
}

/** A duration rounded to one readable unit: 8 minutes, 2 hours, 3 days. Under a minute counts as 1 minute. */
export function roundDuration(ms: number): DurationParts {
  const abs = Math.abs(ms);
  if (abs < HOUR) return { unit: "minute", value: Math.max(1, Math.ceil(abs / MINUTE)) };
  if (abs < DAY) return { unit: "hour", value: Math.floor(abs / HOUR) };
  return { unit: "day", value: Math.floor(abs / DAY) };
}
