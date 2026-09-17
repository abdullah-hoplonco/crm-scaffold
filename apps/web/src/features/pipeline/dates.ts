import { format } from "date-fns";
import { inWorkspaceTz } from "@/lib/format";

const DAY_MS = 86_400_000;

/** Today's calendar date in the workspace timezone, YYYY-MM-DD. */
export function todayInWorkspace(now = new Date()): string {
  return format(inWorkspaceTz(now), "yyyy-MM-dd");
}

/** "24 Sep", or "24 Sep 2027" when it isn't this year. Accepts timestamps and YYYY-MM-DD dates. */
export function formatShortDate(value: string, now = new Date()): string {
  const date = inWorkspaceTz(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value),
  );
  const sameYear = date.getFullYear() === inWorkspaceTz(now).getFullYear();
  return format(date, sameYear ? "d MMM" : "d MMM yyyy");
}

/** Whole days since a timestamp. */
export function daysSince(iso: string, now = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS));
}

/** YYYY-MM-DD of a date picked in a calendar (local calendar day, no timezone shift). */
export function toDateOnly(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Calendar Date for a YYYY-MM-DD value, for date pickers. */
export function fromDateOnly(value: string): Date {
  const [y = 1970, m = 1, d = 1] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}
